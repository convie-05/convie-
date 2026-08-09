import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import * as iconv from 'iconv-lite'

/** 解析后的账单记录 */
export interface ParsedBill {
  date: string           // YYYY-MM-DD
  counterparty: string   // 交易对方
  description: string    // 商品说明
  amount: number         // 金额（正数）
  tradeCategory: string  // 原始交易分类（支付宝"交易分类"或微信"交易类型"）
  rawLine: string        // 原始行（用于调试）
}

/** 解析结果 */
export interface ParseResult {
  platform: 'alipay' | 'wechat'
  records: ParsedBill[]
  totalExpense: number
  error?: string
}

/**
 * 读取CSV文件内容，自动处理GBK/UTF-8编码
 */
function readCSVContent(filePath: string): string {
  const buf = readFileSync(filePath)
  // 先尝试UTF-8
  const utf8Content = buf.toString('utf-8')
  // 检查是否有乱码特征（包含常见中文但出现替换字符）
  if (!utf8Content.includes('') && !utf8Content.includes('锟斤拷')) {
    return utf8Content.replace(/^\uFEFF/, '')
  }
  // 回退到GBK
  return iconv.decode(buf, 'gbk')
}

/**
 * 定位CSV表头行：跳过元数据，找到包含关键字段的行
 */
function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i]
    if (line.includes('交易时间') && (line.includes('交易分类') || line.includes('交易类型') || line.includes('收/支'))) {
      return i
    }
  }
  return 0 // 兜底：假设第一行是表头
}

/**
 * 检测账单平台
 */
function detectPlatform(headers: string[]): 'alipay' | 'wechat' | null {
  const headerStr = headers.join(',')
  if (headerStr.includes('交易号') || headerStr.includes('商家订单号') || headerStr.includes('交易分类')) return 'alipay'
  if (headerStr.includes('交易类型') || headerStr.includes('交易单号')) return 'wechat'
  return null
}

/**
 * 解析支付宝账单 CSV
 */
function parseAlipay(lines: string[], headerIdx: number): ParsedBill[] {
  const records: ParsedBill[] = []
  const headers = parseCSVLine(lines[headerIdx])

  // 找到关键列索引
  const timeIdx = headers.findIndex(h => h.includes('交易时间'))
  const catIdx = headers.findIndex(h => h.includes('交易分类'))
  const counterpartyIdx = headers.findIndex(h => h.includes('交易对方'))
  const descIdx = headers.findIndex(h => h.includes('商品说明') || h.includes('商品'))
  const typeIdx = headers.findIndex(h => h.includes('收/支'))
  const amountIdx = headers.findIndex(h => h.includes('金额'))

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < Math.max(timeIdx, counterpartyIdx, amountIdx) + 1) continue

    const type = cols[typeIdx]?.trim()
    if (type !== '支出') continue

    const amount = parseFloat(String(cols[amountIdx]).replace(/[¥,\s]/g, ''))
    if (isNaN(amount) || amount <= 0) continue

    records.push({
      date: formatDate(cols[timeIdx]),
      counterparty: String(cols[counterpartyIdx] || '').trim(),
      description: String(cols[descIdx] || '').trim(),
      amount,
      tradeCategory: String(cols[catIdx] || '').trim(),
      rawLine: lines[i]
    })
  }
  return records
}

/**
 * 解析微信账单 CSV
 */
function parseWechat(lines: string[], headerIdx: number): ParsedBill[] {
  const records: ParsedBill[] = []
  const headers = parseCSVLine(lines[headerIdx])

  const timeIdx = headers.findIndex(h => h.includes('交易时间'))
  const tradeTypeIdx = headers.findIndex(h => h.includes('交易类型'))
  const counterpartyIdx = headers.findIndex(h => h.includes('交易对方'))
  const descIdx = headers.findIndex(h => h.includes('商品'))
  const typeIdx = headers.findIndex(h => h.includes('收/支'))
  const amountIdx = headers.findIndex(h => h.includes('金额'))

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < Math.max(timeIdx, counterpartyIdx, amountIdx) + 1) continue

    const type = cols[typeIdx]?.trim()
    if (type !== '支出') continue

    // 微信金额可能带 ¥ 符号
    const amount = parseFloat(String(cols[amountIdx]).replace(/[¥,\s]/g, ''))
    if (isNaN(amount) || amount <= 0) continue

    records.push({
      date: formatDate(cols[timeIdx]),
      counterparty: String(cols[counterpartyIdx] || '').trim(),
      description: String(cols[descIdx] || '').trim(),
      amount,
      tradeCategory: String(cols[tradeTypeIdx] || '').trim(),
      rawLine: lines[i]
    })
  }
  return records
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(raw: string): string {
  // 支付宝格式: 2024/1/15 19:30 或 2024-01-15 19:30:00
  // 微信格式: 2024-01-15 19:30:00
  const cleaned = raw.trim().replace(/\//g, '-')
  const datePart = cleaned.split(' ')[0]
  // 确保月日是两位
  const parts = datePart.split('-')
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
  }
  return datePart
}

/**
 * Excel 日期序列号转 YYYY-MM-DD
 * 微信 xlsx 中交易时间是 Excel 数字格式（如 46151.50596）
 */
function excelSerialToDate(serial: number): string {
  // Excel 日期序列号从 1900-01-01 开始（含闰年 bug）
  const excelEpoch = new Date(1899, 11, 30)
  const ms = serial * 86400 * 1000
  const date = new Date(excelEpoch.getTime() + ms)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 解析微信账单 xlsx 文件
 * 微信 xlsx 格式：前N行是元数据，自动定位表头行
 * 列：交易时间, 交易类型, 交易对方, 商品, 收/支, 金额(元), 支付方式, 当前状态, 交易单号, 商户单号, 备注
 */
function parseWechatXlsx(filePath: string): ParsedBill[] {
  const records: ParsedBill[] = []
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // 自动定位表头行
  let headerRow = -1
  for (let i = 0; i < Math.min(rawData.length, 25); i++) {
    const row = rawData[i]
    if (row && row.length > 0 && String(row[0]).includes('交易时间')) {
      headerRow = i
      break
    }
  }

  if (headerRow === -1) return records

  const headers = rawData[headerRow] as string[]
  const timeIdx = headers.findIndex(h => h.includes('交易时间'))
  const tradeTypeIdx = headers.findIndex(h => h.includes('交易类型'))
  const counterpartyIdx = headers.findIndex(h => h.includes('交易对方'))
  const descIdx = headers.findIndex(h => h.includes('商品'))
  const incomeExpenseIdx = headers.findIndex(h => h.includes('收/支'))
  const amountIdx = headers.findIndex(h => h.includes('金额'))

  for (let i = headerRow + 1; i < rawData.length; i++) {
    const row = rawData[i]
    if (!row || row.length === 0) continue

    const type = String(row[incomeExpenseIdx] || '').trim()
    if (type !== '支出') continue

    // 交易时间可能是Excel数字或字符串
    let date: string
    const rawTime = row[timeIdx]
    if (typeof rawTime === 'number') {
      date = excelSerialToDate(rawTime)
    } else {
      date = formatDate(String(rawTime || ''))
    }

    const amount = Number(row[amountIdx])
    if (isNaN(amount) || amount <= 0) continue

    records.push({
      date,
      counterparty: String(row[counterpartyIdx] || '').trim(),
      description: String(row[descIdx] || '').trim(),
      amount,
      tradeCategory: String(row[tradeTypeIdx] || '').trim(),
      rawLine: JSON.stringify(row)
    })
  }

  return records
}

/** 判断是否为 xlsx 文件 */
function isXlsx(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.xlsx')
}

/**
 * 解析账单文件入口
 */
export function parseBillFile(filePath: string): ParseResult {
  try {
    // 分支 1: xlsx 文件 → 微信 xlsx 解析器
    if (isXlsx(filePath)) {
      const records = parseWechatXlsx(filePath)
      if (records.length === 0) {
        return { platform: 'wechat', records: [], totalExpense: 0, error: '未找到支出记录，请确认是微信导出的账单文件' }
      }
      return { platform: 'wechat', records, totalExpense: records.reduce((s, r) => s + r.amount, 0) }
    }

    // 分支 2: CSV 文件 → 自动检测编码 + 自动定位表头
    const content = readCSVContent(filePath)
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return { platform: 'alipay', records: [], totalExpense: 0, error: '文件为空或格式不正确' }
    }

    const headerIdx = findHeaderLine(lines)
    const headers = parseCSVLine(lines[headerIdx])
    const platform = detectPlatform(headers)

    if (!platform) {
      return {
        platform: 'alipay',
        records: [],
        totalExpense: 0,
        error: '无法识别账单格式，请确认是支付宝或微信导出的账单文件'
      }
    }

    const records = platform === 'alipay' ? parseAlipay(lines, headerIdx) : parseWechat(lines, headerIdx)
    const totalExpense = records.reduce((sum, r) => sum + r.amount, 0)

    return { platform, records, totalExpense }
  } catch (error) {
    return {
      platform: 'alipay',
      records: [],
      totalExpense: 0,
      error: `读取文件失败：${(error as Error).message}`
    }
  }
}