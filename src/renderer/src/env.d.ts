/// <reference types="vite/client" />

interface ElectronAPI {
  categories: {
    getL1: () => Promise<any[]>
    getL2: (parentId: number) => Promise<any[]>
    getTree: () => Promise<any[]>
    create: (data: { name: string; parentId: number | null; sortOrder?: number }) => Promise<{ id: number }>
    update: (id: number, data: { name?: string; sortOrder?: number }) => Promise<{ changes: number }>
    delete: (id: number) => Promise<{ success: boolean; error?: string }>
  }
  expenses: {
    list: (filter?: any) => Promise<any>
    get: (id: number) => Promise<any>
    create: (data: { amount: number; categoryId: number; date: string; note?: string }) => Promise<{ id: number }>
    update: (id: number, data: any) => Promise<{ changes: number }>
    delete: (id: number) => Promise<{ changes: number }>
    exportAll: () => Promise<any[]>
  }
  stats: {
    monthlySummary: (year: number, month: number) => Promise<any[]>
    dailyTotals: (year: number, month: number) => Promise<any[]>
    monthTotal: (year: number, month: number) => Promise<{ total: number; count: number }>
    yearlyTrend: (year: number) => Promise<any[]>
  }
}

interface Window {
  electronAPI: ElectronAPI
}