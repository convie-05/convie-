import { app } from 'electron'
import { join } from 'path'

/**
 * 获取数据库路径
 */
export function getDbPath(): string {
  return join(app.getPath('userData'), 'convie_ledger.db')
}

/**
 * 格式化金额显示
 */
export function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

/**
 * 获取当前日期字符串 YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}