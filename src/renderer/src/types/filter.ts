/** 支出列表筛选条件 */
export interface ExpenseFilter {
  startDate?: string
  endDate?: string
  categoryId?: number
  keyword?: string
  minAmount?: number
  maxAmount?: number
  page?: number
  pageSize?: number
}