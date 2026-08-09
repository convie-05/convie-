import { ipcMain, dialog, shell } from 'electron'
import { getDatabase, saveDatabase } from './database'
import type { ExpenseFilter, UpdateExpenseData } from '../renderer/src/types'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { parseBillFile } from './bill-parser'

// ============================================================
// sql.js 辅助函数（模拟 better-sqlite3 风格的查询）
// ============================================================

/** 查询参数类型：sql.js 的 bind 接受的类型 */
type SqlParam = string | number | null

/** 查询所有行，返回对象数组 */
function queryAll(sql: string, params: SqlParam[] = []): Record<string, unknown>[] {
  const db = getDatabase()
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>)
  }
  stmt.free()
  return rows
}

/** 查询单行 */
function queryOne(sql: string, params: SqlParam[] = []): Record<string, unknown> | undefined {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : undefined
}

/** 执行 SQL（INSERT/UPDATE/DELETE），返回影响行数和 lastInsertRowid */
function execute(sql: string, params: SqlParam[] = []): { changes: number; lastInsertRowid?: number } {
  const db = getDatabase()
  db.run(sql, params as unknown[])
  const result = queryOne('SELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid')
  saveDatabase()
  return { changes: (result?.changes as number) ?? 0, lastInsertRowid: result?.lastInsertRowid as number | undefined }
}

// ============================================================
// 分类树节点类型
// ============================================================

interface CategoryNode {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
  icon: string | null
  is_system: number
  children: CategoryNode[]
}

// ============================================================
// IPC 处理器注册
// ============================================================

export function registerIpcHandlers(): void {
  // ---- 分类相关 ----

  /** 获取所有一级分类 */
  ipcMain.handle('categories:getL1', () => {
    return queryAll('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order')
  })

  /** 获取指定一级分类下的所有二级分类 */
  ipcMain.handle('categories:getL2', (_event, parentId: number) => {
    return queryAll('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order', [parentId])
  })

  /** 获取完整分类树 */
  ipcMain.handle('categories:getTree', () => {
    const all = queryAll('SELECT * FROM categories ORDER BY parent_id IS NOT NULL, sort_order')
    const tree: CategoryNode[] = []
    const map = new Map<number, CategoryNode>()

    for (const raw of all) {
      const node: CategoryNode = {
        id: raw.id as number,
        name: raw.name as string,
        parent_id: raw.parent_id as number | null,
        sort_order: raw.sort_order as number,
        icon: raw.icon as string | null,
        is_system: raw.is_system as number,
        children: []
      }
      map.set(node.id, node)
      if (node.parent_id === null) {
        tree.push(node)
      } else {
        const parent = map.get(node.parent_id)
        if (parent) parent.children.push(node)
      }
    }
    return tree
  })

  /** 新增分类 */
  ipcMain.handle('categories:create', (_event, data: { name: string; parentId: number | null; sortOrder?: number }) => {
    const result = execute(
      'INSERT INTO categories (name, parent_id, sort_order, is_system) VALUES (?, ?, ?, 0)',
      [data.name, data.parentId ?? null, data.sortOrder ?? 0]
    )
    return { id: result.lastInsertRowid }
  })

  /** 更新分类 */
  ipcMain.handle('categories:update', (_event, id: number, data: { name?: string; sortOrder?: number }) => {
    const updates: string[] = []
    const params: SqlParam[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(data.sortOrder) }
    if (updates.length === 0) return { changes: 0 }
    params.push(id)
    return execute(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params)
  })

  /** 删除分类 */
  ipcMain.handle('categories:delete', (_event, id: number) => {
    const cat = queryOne('SELECT is_system FROM categories WHERE id = ?', [id])
    if (!cat) return { success: false, error: '分类不存在' }
    if (cat.is_system === 1) return { success: false, error: '系统预设分类不可删除' }

    const usage = queryOne('SELECT COUNT(*) as cnt FROM expenses WHERE category_id = ?', [id])
    if (usage && (usage.cnt as number) > 0) {
      return { success: false, error: `有 ${usage.cnt} 条支出记录使用了此分类，无法删除` }
    }

    execute('DELETE FROM categories WHERE id = ?', [id])
    return { success: true }
  })

  // ---- 支出记录相关 ----

  /** 获取支出列表（支持筛选和分页） */
  ipcMain.handle('expenses:list', (_event, filter: ExpenseFilter = {}) => {
    const conditions: string[] = []
    const params: SqlParam[] = []

    if (filter.startDate) { conditions.push("e.date >= ?"); params.push(filter.startDate) }
    if (filter.endDate) { conditions.push("e.date <= ?"); params.push(filter.endDate) }
    if (filter.categoryId) { conditions.push("e.category_id = ?"); params.push(filter.categoryId) }
    if (filter.keyword) { conditions.push("e.note LIKE ?"); params.push(`%${filter.keyword}%`) }
    if (filter.minAmount !== undefined) { conditions.push("e.amount >= ?"); params.push(filter.minAmount) }
    if (filter.maxAmount !== undefined) { conditions.push("e.amount <= ?"); params.push(filter.maxAmount) }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    const page = filter.page ?? 1
    const pageSize = filter.pageSize ?? 50
    const offset = (page - 1) * pageSize

    const countResult = queryOne(`SELECT COUNT(*) as total FROM expenses e ${whereClause}`, params)
    const data = queryAll(
      `SELECT e.*, c2.name AS category_name, c1.name AS parent_category_name
       FROM expenses e
       JOIN categories c2 ON e.category_id = c2.id
       JOIN categories c1 ON c2.parent_id = c1.id
       ${whereClause}
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    return { data, total: (countResult?.total as number) ?? 0, page, pageSize }
  })

  /** 获取单条支出详情 */
  ipcMain.handle('expenses:get', (_event, id: number) => {
    return queryOne(
      `SELECT e.*, c2.name AS category_name, c1.name AS parent_category_name
       FROM expenses e
       JOIN categories c2 ON e.category_id = c2.id
       JOIN categories c1 ON c2.parent_id = c1.id
       WHERE e.id = ?`, [id]
    )
  })

  /** 新增支出 */
  ipcMain.handle('expenses:create', (_event, data: { amount: number; categoryId: number; date: string; note?: string }) => {
    const result = execute(
      'INSERT INTO expenses (amount, category_id, date, note) VALUES (?, ?, ?, ?)',
      [data.amount, data.categoryId, data.date, data.note ?? '']
    )
    return { id: result.lastInsertRowid }
  })

  /** 更新支出 */
  ipcMain.handle('expenses:update', (_event, id: number, data: UpdateExpenseData) => {
    const updates: string[] = []
    const params: SqlParam[] = []
    if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount) }
    if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId) }
    if (data.date !== undefined) { updates.push('date = ?'); params.push(data.date) }
    if (data.note !== undefined) { updates.push('note = ?'); params.push(data.note) }
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(id)
    return execute(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params)
  })

  /** 删除支出 */
  ipcMain.handle('expenses:delete', (_event, id: number) => {
    return execute('DELETE FROM expenses WHERE id = ?', [id])
  })

  /** 清空所有支出记录 */
  ipcMain.handle('expenses:clearAll', () => {
    const result = execute('DELETE FROM expenses')
    return { success: true, deletedCount: result.changes }
  })

  // ---- 统计相关 ----

  /** 获取月度摘要 */
  ipcMain.handle('stats:monthlySummary', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    return queryAll(
      `SELECT c1.id AS l1_id, c1.name AS l1_name,
              COUNT(e.id) AS transaction_count,
              COALESCE(SUM(e.amount), 0) AS total_amount
       FROM categories c1
       LEFT JOIN categories c2 ON c2.parent_id = c1.id
       LEFT JOIN expenses e ON e.category_id = c2.id AND strftime('%Y-%m', e.date) = ?
       WHERE c1.parent_id IS NULL
       GROUP BY c1.id
       ORDER BY c1.sort_order`, [monthStr]
    )
  })

  /** 获取每日趋势 */
  ipcMain.handle('stats:dailyTotals', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    return queryAll(
      `SELECT date, COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE strftime('%Y-%m', date) = ?
       GROUP BY date
       ORDER BY date`, [monthStr]
    )
  })

  /** 获取月度总支出 */
  ipcMain.handle('stats:monthTotal', (_event, year: number, month: number) => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    return queryOne(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM expenses
       WHERE strftime('%Y-%m', date) = ?`, [monthStr]
    ) ?? { total: 0, count: 0 }
  })

  /** 获取年度趋势 */
  ipcMain.handle('stats:yearlyTrend', (_event, year: number) => {
    return queryAll(
      `SELECT strftime('%Y-%m', date) AS month,
              COALESCE(SUM(amount), 0) AS total,
              COUNT(*) AS count
       FROM expenses
       WHERE strftime('%Y', date) = ?
       GROUP BY strftime('%Y-%m', date)
       ORDER BY month`, [String(year)]
    )
  })

  /** 导出所有数据 */
  ipcMain.handle('expenses:exportAll', () => {
    return queryAll(
      `SELECT e.date, c1.name AS parent_category, c2.name AS category,
              e.amount, e.note
       FROM expenses e
       JOIN categories c2 ON e.category_id = c2.id
       JOIN categories c1 ON c2.parent_id = c1.id
       ORDER BY e.date DESC`
    )
  })

  /** 导出为 Excel 文件 */
  ipcMain.handle('expenses:exportExcel', async () => {
    const data = queryAll(
      `SELECT e.date, c1.name AS parent_category, c2.name AS category,
              e.amount, e.note
       FROM expenses e
       JOIN categories c2 ON e.category_id = c2.id
       JOIN categories c1 ON c2.parent_id = c1.id
       ORDER BY e.date DESC`
    )

    if (data.length === 0) {
      return { success: false, error: '暂无数据可导出' }
    }

    // 弹出保存对话框
    const result = await dialog.showSaveDialog({
      title: '导出 Excel',
      defaultPath: `Convie记账_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true }
    }

    // 构建工作表数据
    const sheetData: unknown[][] = [
      ['日期', '一级分类', '二级分类', '金额', '备注']
    ]
    for (const row of data) {
      sheetData.push([
        row.date as string,
        row.parent_category as string,
        row.category as string,
        row.amount as number,
        (row.note as string) || ''
      ])
    }

    // 生成 Excel
    const ws = XLSX.utils.aoa_to_sheet(sheetData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 14 },  // 日期
      { wch: 12 },  // 一级分类
      { wch: 12 },  // 二级分类
      { wch: 10 },  // 金额
      { wch: 30 }   // 备注
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '支出记录')

    fs.writeFileSync(result.filePath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
    return { success: true, path: result.filePath }
  })

  /** 在默认浏览器打开外部链接 */
  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    return shell.openExternal(url)
  })

  /** 导入账单：打开文件对话框，解析并返回预览数据 */
  ipcMain.handle('bills:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择账单文件',
      filters: [
        { name: '账单文件 (CSV, Excel)', extensions: ['csv', 'xlsx'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    return parseBillFile(result.filePaths[0])
  })

  /** 批量导入账单记录 */
  ipcMain.handle('bills:batchCreate', (_event, records: Array<{
    amount: number
    categoryId: number
    date: string
    note: string
  }>) => {
    let successCount = 0
    for (const record of records) {
      execute(
        'INSERT INTO expenses (amount, category_id, date, note) VALUES (?, ?, ?, ?)',
        [record.amount, record.categoryId, record.date, record.note]
      )
      successCount++
    }
    return { successCount }
  })
}