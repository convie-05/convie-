/** 月度分类摘要 */
export interface MonthlySummary {
  l1_id: number
  l1_name: string
  transaction_count: number
  total_amount: number
}

/** 每日支出总额 */
export interface DailyTotal {
  date: string
  total: number
}

/** 月度统计 */
export interface MonthTotal {
  total: number
  count: number
}

/** 年度每月趋势 */
export interface YearlyTrendItem {
  month: string
  total: number
  count: number
}