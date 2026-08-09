import { contextBridge, ipcRenderer } from 'electron'
import type { ExpenseFilter } from '../renderer/src/types/filter'

/**
 * 通过 contextBridge 暴露的 API
 * 渲染进程可以通过 window.electronAPI 访问
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ---- 分类 API ----
  categories: {
    getL1: () => ipcRenderer.invoke('categories:getL1'),
    getL2: (parentId: number) => ipcRenderer.invoke('categories:getL2', parentId),
    getTree: () => ipcRenderer.invoke('categories:getTree'),
    create: (data: { name: string; parentId: number | null; sortOrder?: number }) =>
      ipcRenderer.invoke('categories:create', data),
    update: (id: number, data: { name?: string; sortOrder?: number }) =>
      ipcRenderer.invoke('categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },

  // ---- 支出 API ----
  expenses: {
    list: (filter?: ExpenseFilter) => ipcRenderer.invoke('expenses:list', filter),
    get: (id: number) => ipcRenderer.invoke('expenses:get', id),
    create: (data: { amount: number; categoryId: number; date: string; note?: string }) =>
      ipcRenderer.invoke('expenses:create', data),
    update: (id: number, data: { amount?: number; categoryId?: number; date?: string; note?: string }) =>
      ipcRenderer.invoke('expenses:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('expenses:delete', id),
    exportAll: () => ipcRenderer.invoke('expenses:exportAll'),
    exportExcel: () => ipcRenderer.invoke('expenses:exportExcel')
  },

  // ---- 统计 API ----
  stats: {
    monthlySummary: (year: number, month: number) =>
      ipcRenderer.invoke('stats:monthlySummary', year, month),
    dailyTotals: (year: number, month: number) =>
      ipcRenderer.invoke('stats:dailyTotals', year, month),
    monthTotal: (year: number, month: number) =>
      ipcRenderer.invoke('stats:monthTotal', year, month),
    yearlyTrend: (year: number) =>
      ipcRenderer.invoke('stats:yearlyTrend', year)
  },

  // ---- 系统 API ----
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // ---- 账单导入 API ----
  bills: {
    import: () => ipcRenderer.invoke('bills:import'),
    batchCreate: (records: Array<{ amount: number; categoryId: number; date: string; note: string }>) =>
      ipcRenderer.invoke('bills:batchCreate', records)
  }
})