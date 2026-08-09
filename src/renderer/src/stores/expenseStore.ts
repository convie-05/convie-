import { create } from 'zustand'
import type { ExpenseWithCategory, ExpenseFilter } from '../types'

interface ExpenseState {
  expenses: ExpenseWithCategory[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  filter: ExpenseFilter

  // 操作
  fetchExpenses: (filter?: ExpenseFilter) => Promise<void>
  setFilter: (filter: ExpenseFilter) => void
  setPage: (page: number) => void
  deleteExpense: (id: number) => Promise<boolean>
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  total: 0,
  page: 1,
  pageSize: 50,
  loading: false,
  filter: {},

  fetchExpenses: async (filter?: ExpenseFilter) => {
    set({ loading: true })
    try {
      const mergedFilter = { ...get().filter, ...filter }
      const result = await window.electronAPI.expenses.list({
        ...mergedFilter,
        page: get().page,
        pageSize: get().pageSize
      })
      set({
        expenses: result.data,
        total: result.total,
        loading: false
      })
    } catch (error) {
      console.error('获取支出记录失败:', error)
      set({ loading: false })
    }
  },

  setFilter: (filter: ExpenseFilter) => {
    set({ filter, page: 1 })
    get().fetchExpenses(filter)
  },

  setPage: (page: number) => {
    set({ page })
    get().fetchExpenses()
  },

  deleteExpense: async (id: number) => {
    try {
      const result = await window.electronAPI.expenses.delete(id)
      if (result.changes > 0) {
        get().fetchExpenses()
        return true
      }
      return false
    } catch (error) {
      console.error('删除支出记录失败:', error)
      return false
    }
  }
}))