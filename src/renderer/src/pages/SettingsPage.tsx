import React, { useEffect, useState } from 'react'
import {
  Card, Tree, Button, Modal, Form, Input, Select, message,
  Popconfirm, Tag, Empty, Typography
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, FileOutlined
} from '@ant-design/icons'
import { useCategoryStore } from '../stores/categoryStore'
import type { CategoryTreeNode, Category } from '../types'

const { Text } = Typography

const SettingsPage: React.FC = () => {
  const { categoryTree, fetchCategoryTree, createCategory, updateCategory, deleteCategory } = useCategoryStore()
  const [loading, setLoading] = useState(true)

  // 新增/编辑分类弹窗
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryTreeNode | null>(null)
  const [isL1, setIsL1] = useState(true)
  const [form] = Form.useForm()

  useEffect(() => {
    const init = async () => {
      await fetchCategoryTree()
      setLoading(false)
    }
    init()
  }, [])

  // 打开新增弹窗
  const handleAdd = (parentId?: number) => {
    setEditingCategory(null)
    setIsL1(!parentId)
    form.resetFields()
    if (parentId) {
      form.setFieldsValue({ parentId })
    }
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (category: CategoryTreeNode) => {
    setEditingCategory(category)
    setIsL1(category.parent_id === null)
    form.setFieldsValue({
      name: category.name,
      parentId: category.parent_id
    })
    setModalVisible(true)
  }

  // 保存分类
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingCategory) {
        const success = await updateCategory(editingCategory.id, { name: values.name })
        if (success) {
          message.success('分类已更新')
          setModalVisible(false)
        } else {
          message.error('更新失败')
        }
      } else {
        const result = await createCategory({
          name: values.name,
          parentId: values.parentId || null
        })
        if (result) {
          message.success('分类已创建')
          setModalVisible(false)
        } else {
          message.error('创建失败')
        }
      }
    } catch (error) {
      console.error('保存分类失败:', error)
    }
  }

  // 删除分类
  const handleDelete = async (category: CategoryTreeNode) => {
    const result = await deleteCategory(category.id)
    if (result.success) {
      message.success('分类已删除')
    } else {
      message.error(result.error || '删除失败')
    }
  }

  // 转换分类树为 Ant Design Tree 数据
  const convertToTreeData = (nodes: CategoryTreeNode[]): any[] => {
    return nodes.map(node => ({
      key: node.id,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <span>
            {node.parent_id === null ? (
              <FolderOutlined style={{ color: '#0D9488', marginRight: 8 }} />
            ) : (
              <FileOutlined style={{ color: '#1890FF', marginRight: 8 }} />
            )}
            {node.name}
            {node.is_system === 1 && (
              <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>系统</Tag>
            )}
          </span>
          <span>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleAdd(node.id)
              }}
            />
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(node)
              }}
            />
            <Popconfirm
              title={`确定删除「${node.name}」？`}
              onConfirm={(e) => {
                e?.stopPropagation()
                handleDelete(node)
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </span>
        </div>
      ),
      children: node.children?.length > 0 ? convertToTreeData(node.children) : undefined
    }))
  }

  return (
    <div>
      <div className="page-header">
        <h2>⚙️ 设置</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd()}>
          新增一级分类
        </Button>
      </div>

      <Card title="分类管理" style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          系统预设分类（带「系统」标签）不可删除。你可以新增、编辑或删除自定义分类。
          每个支出必须选择二级（叶子）分类。
        </Text>

        {categoryTree.length > 0 ? (
          <Tree
            showLine={{ showLeafIcon: false }}
            defaultExpandAll
            treeData={convertToTreeData(categoryTree)}
            style={{ background: 'transparent' }}
          />
        ) : (
          <Empty description="暂无分类数据" />
        )}
      </Card>

      <Card title="关于应用">
        <p><strong>Convie记账本</strong> v1.0.0</p>
        <p>一款跨平台个人记账工具，数据完全存储在本地。</p>
        <p>技术栈: Electron + React + TypeScript + SQLite</p>
      </Card>

      {/* 新增/编辑分类弹窗 */}
      <Modal
        title={editingCategory ? '编辑分类' : (isL1 ? '新增一级分类' : '新增二级分类')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 20, message: '名称最多20个字符' }
            ]}
          >
            <Input placeholder="例如：交通出行" />
          </Form.Item>

          {!isL1 && !editingCategory && (
            <Form.Item
              name="parentId"
              label="所属一级分类"
              rules={[{ required: true, message: '请选择所属一级分类' }]}
            >
              <Select
                placeholder="选择所属分类"
                options={categoryTree.map(c => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default SettingsPage