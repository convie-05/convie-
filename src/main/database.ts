import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

let db: SqlJsDatabase

/**
 * 获取数据库文件路径
 */
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'convie_ledger.db')
}

/**
 * 初始化数据库：创建表、写入种子数据
 */
export async function initDatabase(): Promise<void> {
  const dbPath = getDbPath()
  const dbDir = join(dbPath, '..')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  // 初始化 sql.js
  const SQL = await initSqlJs()

  // 如果已存在数据库文件，加载它
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON')

  // 创建分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      sort_order INTEGER DEFAULT 0,
      icon TEXT DEFAULT NULL,
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `)

  // 创建支出记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL CHECK(amount > 0),
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `)

  // 创建索引
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  `)

  // 检查是否已有分类数据，如果没有则写入种子数据
  const count = db.exec('SELECT COUNT(*) as cnt FROM categories WHERE parent_id IS NULL')
  const hasData = count.length > 0 && count[0].values.length > 0 && count[0].values[0][0] > 0

  if (!hasData) {
    seedCategories()
  }

  // 保存数据库到文件
  saveDatabase()
}

/**
 * 写入预设分类种子数据（批量插入优化）
 */
function seedCategories(): void {
  // 一级分类
  const l1Data = [
    { name: '餐饮饮食', sort: 1, icon: 'coffee' },
    { name: '交通出行', sort: 2, icon: 'car' },
    { name: '居住生活', sort: 3, icon: 'home' },
    { name: '购物消费', sort: 4, icon: 'shopping' },
    { name: '娱乐休闲', sort: 5, icon: 'smile' },
    { name: '医疗健康', sort: 6, icon: 'heart' },
    { name: '人情社交', sort: 7, icon: 'team' },
    { name: '教育提升', sort: 8, icon: 'book' },
    { name: '其他', sort: 9, icon: 'ellipsis' }
  ]

  // 批量插入一级分类，并获取起始 ID
  const l1Sql = l1Data.map(l1 =>
    `INSERT INTO categories (name, parent_id, sort_order, icon, is_system) VALUES ('${l1.name.replace(/'/g, "''")}', NULL, ${l1.sort}, '${l1.icon}', 1)`
  ).join(';\n')
  db.exec(l1Sql)

  // 获取第一个一级分类的 ID（SQLite 自增 ID 连续，后续 ID 据此推算）
  const firstL1Result = db.exec('SELECT MIN(id) as first_id FROM categories WHERE parent_id IS NULL')
  const firstL1Id = firstL1Result[0].values[0][0] as number
  const l1Ids = l1Data.map((_, i) => firstL1Id + i)

  // 二级分类
  const l2Data: Array<{ parentIndex: number; name: string; sort: number }> = [
    { parentIndex: 0, name: '三餐主食', sort: 1 },
    { parentIndex: 0, name: '零食饮品', sort: 2 },
    { parentIndex: 0, name: '外卖配送', sort: 3 },
    { parentIndex: 0, name: '生鲜采购', sort: 4 },
    { parentIndex: 0, name: '社交聚餐', sort: 5 },
    { parentIndex: 1, name: '公共交通', sort: 1 },
    { parentIndex: 1, name: '打车租车', sort: 2 },
    { parentIndex: 1, name: '燃油充电', sort: 3 },
    { parentIndex: 1, name: '车辆维护', sort: 4 },
    { parentIndex: 1, name: '长途旅行', sort: 5 },
    { parentIndex: 2, name: '房租房贷', sort: 1 },
    { parentIndex: 2, name: '水电燃气', sort: 2 },
    { parentIndex: 2, name: '物业网费', sort: 3 },
    { parentIndex: 2, name: '家居用品', sort: 4 },
    { parentIndex: 2, name: '维修装修', sort: 5 },
    { parentIndex: 3, name: '服装鞋帽', sort: 1 },
    { parentIndex: 3, name: '美妆护肤', sort: 2 },
    { parentIndex: 3, name: '数码电器', sort: 3 },
    { parentIndex: 3, name: '日用百货', sort: 4 },
    { parentIndex: 3, name: '书籍学习', sort: 5 },
    { parentIndex: 4, name: '影视会员', sort: 1 },
    { parentIndex: 4, name: '游戏充值', sort: 2 },
    { parentIndex: 4, name: '运动健身', sort: 3 },
    { parentIndex: 4, name: '旅游度假', sort: 4 },
    { parentIndex: 4, name: '兴趣爱好', sort: 5 },
    { parentIndex: 5, name: '门诊就医', sort: 1 },
    { parentIndex: 5, name: '药房购药', sort: 2 },
    { parentIndex: 5, name: '体检防疫', sort: 3 },
    { parentIndex: 5, name: '保险', sort: 4 },
    { parentIndex: 6, name: '红包礼金', sort: 1 },
    { parentIndex: 6, name: '孝敬父母', sort: 2 },
    { parentIndex: 6, name: '约会恋爱', sort: 3 },
    { parentIndex: 6, name: '宠物开销', sort: 4 },
    { parentIndex: 7, name: '学费培训', sort: 1 },
    { parentIndex: 7, name: '考试费用', sort: 2 },
    { parentIndex: 7, name: '知识付费', sort: 3 },
    { parentIndex: 8, name: '银行手续费', sort: 1 },
    { parentIndex: 8, name: '捐赠公益', sort: 2 },
    { parentIndex: 8, name: '其他支出', sort: 3 }
  ]

  // 批量插入二级分类
  const l2Sql = l2Data.map(l2 =>
    `INSERT INTO categories (name, parent_id, sort_order, icon, is_system) VALUES ('${l2.name.replace(/'/g, "''")}', ${l1Ids[l2.parentIndex]}, ${l2.sort}, NULL, 1)`
  ).join(';\n')
  db.exec(l2Sql)
}

/**
 * 保存数据库到文件
 */
export function saveDatabase(): void {
  const dbPath = getDbPath()
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

/**
 * 获取数据库实例
 */
export function getDatabase(): SqlJsDatabase {
  return db
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
  }
}