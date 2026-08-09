/** 支出记录类型 */
export interface Expense {
  id: number
  amount: number
  category_id: number
  date: string
  note: string
  created_at: string
  updated_at: string
}

/** 支出记录 + 分类名称（列表查询返回） */
export interface ExpenseWithCategory extends Expense {
  category_name: string
  parent_category_name: string
}

/** 新增支出参数 */
export interface CreateExpenseData {
  amount: number
  categoryId: number
  date: string
  note?: string
}

/** 更新支出参数 */
export interface UpdateExpenseData {
  amount?: number
  categoryId?: number
  date?: string
  note?: string
}