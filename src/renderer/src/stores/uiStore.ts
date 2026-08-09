import { create } from 'zustand'

interface UIState {
  /** 新增支出弹窗是否可见 */
  addModalVisible: boolean
  /** 编辑中的支出ID */
  editingExpenseId: number | null
  /** 当前选中的年份 */
  selectedYear: number
  /** 当前选中的月份 */
  selectedMonth: number

  openAddModal: () => void
  closeAddModal: () => void
  openEditModal: (id: number) => void
  closeEditModal: () => void
  setYear: (year: number) => void
  setMonth: (month: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  addModalVisible: false,
  editingExpenseId: null,
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,

  openAddModal: () => set({ addModalVisible: true, editingExpenseId: null }),
  closeAddModal: () => set({ addModalVisible: false, editingExpenseId: null }),
  openEditModal: (id: number) => set({ addModalVisible: true, editingExpenseId: id }),
  closeEditModal: () => set({ addModalVisible: false, editingExpenseId: null }),
  setYear: (year: number) => set({ selectedYear: year }),
  setMonth: (month: number) => set({ selectedMonth: month })
}))