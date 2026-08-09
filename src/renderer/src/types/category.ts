/** 分类类型 */
export interface Category {
  id: number
  name: string
  parent_id: number | null
  sort_order: number
  icon: string | null
  is_system: number
  children?: Category[]
}

/** 分类树节点 */
export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}