/**
 * 格式化金额（人民币）
 */
export function formatAmount(amount: number): string {
  return `¥${amount.toFixed(2)}`
}

/**
 * 格式化日期为中文显示
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = weekDays[date.getDay()]
  return `${month}月${day}日 周${weekDay}`
}

/**
 * 获取当前年份
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * 获取当前月份（1-12）
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
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

/**
 * 月份名称
 */
export const MONTH_NAMES = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
]