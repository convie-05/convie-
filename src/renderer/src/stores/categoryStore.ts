import { create } from 'zustand'
import type { Category, CategoryTreeNode } from '../types'

interface CategoryState {
  l1Categories: Category[]
  categoryTree: CategoryTreeNode[]
  loading: boolean

  fetchL1Categories: () => Promise<void>
  fetchCategoryTree: () => Promise<void>
  getL2Categories: (parentId: number) => Promise<Category[]>
  createCategory: (data: { name: string; parentId: number | null }) => Promise<{ id: number } | null>
  updateCategory: (id: number, data: { name?: string }) => Promise<boolean>
  deleteCategory: (id: number) => Promise<{ success: boolean; error?: string }>
}

export const useCategoryStore = create<CategoryState>((set) => ({
  l1Categories: [],
  categoryTree: [],
  loading: false,

  fetchL1Categories: async () => {
    set({ loading: true })
    try {
      const categories = await window.electronAPI.categories.getL1()
      set({ l1Categories: categories, loading: false })
    } catch (error) {
      console.error('获取一级分类失败:', error)
      set({ loading: false })
    }
  },

  fetchCategoryTree: async () => {
    set({ loading: true })
    try {
      const tree = await window.electronAPI.categories.getTree()
      set({ categoryTree: tree, loading: false })
    } catch (error) {
      console.error('获取分类树失败:', error)
      set({ loading: false })
    }
  },

  getL2Categories: async (parentId: number) => {
    try {
      return await window.electronAPI.categories.getL2(parentId)
    } catch (error) {
      console.error('获取二级分类失败:', error)
      return []
    }
  },

  createCategory: async (data) => {
    try {
      const result = await window.electronAPI.categories.create(data)
      await set.getState().fetchCategoryTree()
      await set.getState().fetchL1Categories()
      return result
    } catch (error) {
      console.error('创建分类失败:', error)
      return null
    }
  },

  updateCategory: async (id, data) => {
    try {
      const result = await window.electronAPI.categories.update(id, data)
      if (result.changes > 0) {
        await set.getState().fetchCategoryTree()
        await set.getState().fetchL1Categories()
      }
      return result.changes > 0
    } catch (error) {
      console.error('更新分类失败:', error)
      return false
    }
  },

  deleteCategory: async (id) => {
    try {
      const result = await window.electronAPI.categories.delete(id)
      if (result.success) {
        await set.getState().fetchCategoryTree()
        await set.getState().fetchL1Categories()
      }
      return result
    } catch (error) {
      console.error('删除分类失败:', error)
      return { success: false, error: '操作失败' }
    }
  }
}))