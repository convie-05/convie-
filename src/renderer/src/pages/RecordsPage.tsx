import React, { useEffect, useState } from 'react'
import {
  Table, Button, Input, Select, DatePicker, Space, Tag, Modal,
  Form, InputNumber, message, Popconfirm, Row, Col
} from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, EditOutlined, ExportOutlined, FileExcelOutlined, ImportOutlined } from '@ant-design/icons'
import { useExpenseStore } from '../stores/expenseStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useUIStore } from '../stores/uiStore'
import { formatAmount, formatDate, getTodayString } from '../utils'
import type { ExpenseWithCategory, Category } from '../types'
import dayjs from 'dayjs'
import BillImportModal, { ImportPreviewRecord } from '../components/BillImportModal'

const RecordsPage: React.FC = () => {
  const { expenses, total, page, pageSize, loading, fetchExpenses, setFilter, setPage, deleteExpense, clearAllExpenses } = useExpenseStore()
  const { l1Categories, fetchL1Categories, getL2Categories } = useCategoryStore()
  const { addModalVisible, editingExpenseId, openAddModal, closeAddModal } = useUIStore()

  const [form] = Form.useForm()
  const [l2Categories, setL2Categories] = useState<Category[]>([])
  const [selectedL1Id, setSelectedL1Id] = useState<number | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchDateRange, setSearchDateRange] = useState<[string, string] | null>(null)

  // 账单导入状态
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importPlatform, setImportPlatform] = useState<'alipay' | 'wechat'>('alipay')
  const [importRecords, setImportRecords] = useState<ImportPreviewRecord[]>([])
  const [importLoading, setImportLoading] = useState(false)

  // 初始化加载
  useEffect(() => {
    fetchExpenses()
    fetchL1Categories()
  }, [])

  // 编辑时加载数据
  useEffect(() => {
    if (editingExpenseId) {
      loadExpenseForEdit(editingExpenseId)
    } else if (addModalVisible) {
      form.resetFields()
      form.setFieldsValue({ date: dayjs(getTodayString()) })
      setSelectedL1Id(null)
      setL2Categories([])
    }
  }, [editingExpenseId, addModalVisible])

  // 加载支出数据到编辑表单
  const loadExpenseForEdit = async (id: number) => {
    try {
      const expense = await window.electronAPI.expenses.get(id)
      if (expense) {
        const l1List = l1Categories.length > 0 ? l1Categories : await window.electronAPI.categories.getL1()

        // 获取这个二级分类属于哪个一级分类
        for (const l1 of l1List) {
          const children = await window.electronAPI.categories.getL2(l1.id)
          if (children.some((c: Category) => c.id === expense.category_id)) {
            setSelectedL1Id(l1.id)
            setL2Categories(children)
            break
          }
        }

        form.setFieldsValue({
          amount: expense.amount,
          category_id: expense.category_id,
          date: dayjs(expense.date),
          note: expense.note
        })
      } else {
        message.warning('未找到该支出记录')
        closeAddModal()
      }
    } catch (error) {
      console.error('加载支出详情失败:', error)
    }
  }

  // 一级分类切换，加载对应的二级分类
  const handleL1Change = async (l1Id: number) => {
    setSelectedL1Id(l1Id)
    form.setFieldsValue({ category_id: undefined })
    const children = await getL2Categories(l1Id)
    setL2Categories(children)
  }

  // 保存支出（新增或编辑）
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        amount: values.amount,
        categoryId: values.category_id,
        date: values.date.format('YYYY-MM-DD'),
        note: values.note || ''
      }

      if (editingExpenseId) {
        await window.electronAPI.expenses.update(editingExpenseId, data)
        message.success('支出记录已更新')
      } else {
        await window.electronAPI.expenses.create(data)
        message.success('支出记录已添加')
      }

      closeAddModal()
      fetchExpenses()
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  // 删除支出
  const handleDelete = async (id: number) => {
    const success = await deleteExpense(id)
    if (success) {
      message.success('支出记录已删除')
    } else {
      message.error('删除失败')
    }
  }

  // 清空全部记录
  const handleClearAll = async () => {
    const success = await clearAllExpenses()
    if (success) {
      message.success('全部支出记录已清除')
      fetchExpenses()
    } else {
      message.error('清除失败')
    }
  }

  // 导出数据
  const handleExport = async () => {
    try {
      const data = await window.electronAPI.expenses.exportAll()
      if (data.length === 0) {
        message.warning('暂无数据可导出')
        return
      }

      // 简单 CSV 导出
      let csv = '日期,一级分类,二级分类,金额,备注\n'
      for (const row of data) {
        csv += `"${row.date}","${row.parent_category}","${row.category}",${row.amount},"${row.note || ''}"\n`
      }

      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Convie记账_${getTodayString()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('CSV 导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败')
    }
  }

  // 导出 Excel
  const handleExportExcel = async () => {
    try {
      const result = await window.electronAPI.expenses.exportExcel()
      if (result.canceled) return
      if (result.success) {
        message.success('Excel 导出成功')
      } else {
        message.warning(result.error || '导出失败')
      }
    } catch (error) {
      console.error('Excel 导出失败:', error)
      message.error('Excel 导出失败')
    }
  }

  // 打开账单导入
  const handleOpenImport = async () => {
    try {
      const result = await window.electronAPI.bills.import()
      if (result.canceled) return
      if (result.error) {
        message.error(result.error)
        return
      }
      if (result.records.length === 0) {
        message.warning('未找到支出记录')
        return
      }
      setImportPlatform(result.platform)
      setImportRecords(result.records.map((r, i) => ({
        index: i,
        date: r.date,
        counterparty: r.counterparty,
        description: r.description,
        amount: r.amount,
        tradeCategory: r.tradeCategory || '',
        selectedL1Id: null,
        selectedL2Id: null,
        autoMatched: false
      })))
      setImportModalVisible(true)
    } catch (error) {
      console.error('导入账单失败:', error)
      message.error('导入账单失败')
    }
  }

  // 确认导入
  const handleConfirmImport = async (records: ImportPreviewRecord[]) => {
    setImportLoading(true)
    try {
      const result = await window.electronAPI.bills.batchCreate(
        records.map(r => ({
          amount: r.amount,
          categoryId: r.selectedL2Id!,
          date: r.date,
          note: `${r.counterparty} - ${r.description}`
        }))
      )
      message.success(`成功导入 ${result.successCount} 条记录`)
      setImportModalVisible(false)
      fetchExpenses()
    } catch (error) {
      console.error('批量导入失败:', error)
      message.error('批量导入失败')
    }
    setImportLoading(false)
  }

  // 搜索处理
  const handleSearch = () => {
    const filter: any = {}
    if (searchKeyword) filter.keyword = searchKeyword
    if (searchDateRange) {
      filter.startDate = searchDateRange[0]
      filter.endDate = searchDateRange[1]
    }
    setFilter(filter)
  }

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 130,
      render: (date: string) => formatDate(date)
    },
    {
      title: '分类',
      width: 180,
      render: (_: any, record: ExpenseWithCategory) => (
        <Tag color="blue">{record.parent_category_name}</Tag>
      )
    },
    {
      title: '子分类',
      dataIndex: 'category_name',
      width: 120
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      sorter: (a: ExpenseWithCategory, b: ExpenseWithCategory) => a.amount - b.amount,
      render: (amount: number) => (
        <span className="amount-text">{formatAmount(amount)}</span>
      )
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: ExpenseWithCategory) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => useUIStore.getState().openEditModal(record.id)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条记录？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <h2>📝 支出记录</h2>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            导出 Excel
          </Button>
          <Button icon={<ImportOutlined />} onClick={handleOpenImport}>
            导入账单
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            新增支出
          </Button>
          <Popconfirm
            title="是否确认清除全部信息？"
            description="此操作将删除所有支出记录，不可恢复！"
            onConfirm={handleClearAll}
            okText="确认清除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              重置
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* 搜索/筛选栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="搜索备注..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        <Col span={8}>
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setSearchDateRange([
                  dates[0].format('YYYY-MM-DD'),
                  dates[1].format('YYYY-MM-DD')
                ])
              } else {
                setSearchDateRange(null)
              }
            }}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
        </Col>
        <Col span={4}>
          <Button onClick={() => {
            setSearchKeyword('')
            setSearchDateRange(null)
            setFilter({})
          }}>
            重置
          </Button>
        </Col>
      </Row>

      {/* 支出列表 */}
      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        size="middle"
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingExpenseId ? '编辑支出' : '新增支出'}
        open={addModalVisible}
        onCancel={closeAddModal}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="amount"
            label="金额（元）"
            rules={[
              { required: true, message: '请输入金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="¥"
              placeholder="0.00"
              precision={2}
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {/* 一级分类选择 */}
          <Form.Item label="一级分类">
            <Select
              placeholder="选择一级分类"
              value={selectedL1Id}
              onChange={handleL1Change}
              style={{ width: '100%' }}
              options={l1Categories.map(c => ({ value: c.id, label: c.name }))}
              allowClear
            />
          </Form.Item>

          {/* 二级分类选择 */}
          <Form.Item
            name="category_id"
            label="二级分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              placeholder={selectedL1Id ? '选择二级分类' : '请先选择一级分类'}
              style={{ width: '100%' }}
              options={l2Categories.map(c => ({ value: c.id, label: c.name }))}
              disabled={!selectedL1Id}
            />
          </Form.Item>

          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} placeholder="可选：填写备注信息" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 账单导入预览弹窗 */}
      <BillImportModal
        visible={importModalVisible}
        platform={importPlatform}
        records={importRecords}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleConfirmImport}
        loading={importLoading}
      />
    </div>
  )
}

export default RecordsPage