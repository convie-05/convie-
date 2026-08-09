import React, { useEffect, useState, useMemo } from 'react'
import { Modal, Table, Select, message, Statistic, Row, Col, Tag, Button, Space } from 'antd'
import { useCategoryStore } from '../stores/categoryStore'
import type { Category } from '../types'

/** 一条导入预览记录 */
export interface ImportPreviewRecord {
  index: number
  date: string
  counterparty: string
  description: string
  amount: number
  tradeCategory: string   // 原始交易分类（支付宝"交易分类"或微信"交易类型"）
  selectedL1Id: number | null
  selectedL2Id: number | null
  autoMatched: boolean    // 是否由系统自动匹配
}

interface Props {
  visible: boolean
  platform: 'alipay' | 'wechat'
  records: ImportPreviewRecord[]
  onCancel: () => void
  onImport: (records: ImportPreviewRecord[]) => void
  loading: boolean
}

// ============== 分类映射规则 ==============

/** 支付宝"交易分类" → 我们的分类名称 */
const ALIPAY_MAP: Record<string, { l1: string; l2: string }> = {
  '餐饮美食':   { l1: '餐饮饮食', l2: '三餐主食' },
  '交通出行':   { l1: '交通出行', l2: '公共交通' },
  '生活服务':   { l1: '居住生活', l2: '水电燃气' },
  '日用百货':   { l1: '购物消费', l2: '日用百货' },
  '数码电器':   { l1: '购物消费', l2: '数码电器' },
  '教育培训':   { l1: '教育提升', l2: '学费培训' },
  '文化休闲':   { l1: '娱乐休闲', l2: '兴趣爱好' },
  '服饰美容':   { l1: '购物消费', l2: '美妆护肤' },
  '休闲娱乐':   { l1: '娱乐休闲', l2: '兴趣爱好' },
  '家居家装':   { l1: '居住生活', l2: '家居用品' },
  '医疗健康':   { l1: '医疗健康', l2: '门诊就医' },
  '住房物业':   { l1: '居住生活', l2: '房租房贷' },
  '通讯物流':   { l1: '居住生活', l2: '物业网费' },
  '运动户外':   { l1: '娱乐休闲', l2: '运动健身' },
  '珠宝配饰':   { l1: '购物消费', l2: '服装鞋帽' },
  '母婴亲子':   { l1: '人情社交', l2: '宠物开销' },
  '商业服务':   { l1: '其他',     l2: '其他支出' },
  '公共服务':   { l1: '居住生活', l2: '水电燃气' },
  '其他':       { l1: '其他',     l2: '其他支出' },
  '退款':       { l1: '其他',     l2: '其他支出' },
}

/** 微信"交易对方"关键词 → 分类名称 */
const WECHAT_RULES: Array<{ keywords: string[]; l1: string; l2: string }> = [
  { keywords: ['美团', '饿了么', '外卖', '黄焖鸡', '麻辣烫', '奶茶', '咖啡', '包子', '早餐', '午餐', '晚餐', '小吃', '零食', '水果', '买菜', '肯德基', '麦当劳', '汉堡', '披萨', '火锅', '烧烤', '餐饮'], l1: '餐饮饮食', l2: '外卖配送' },
  { keywords: ['拼多多', '淘宝', '京东', '天猫', '唯品会', '闲鱼'], l1: '购物消费', l2: '日用百货' },
  { keywords: ['滴滴', '出行', '骑安', '哈啰', '青桔', 'Ugo', '小绿车', '打车', '高铁', '火车', '机票', '航空', '地铁', '公交'], l1: '交通出行', l2: '打车租车' },
  { keywords: ['便利店', '超市', '百货', '商场', '小店'], l1: '购物消费', l2: '日用百货' },
  { keywords: ['大学', '学院', '学校', '教育', '培训', '考试'], l1: '教育提升', l2: '学费培训' },
  { keywords: ['水电', '燃气', '煤气', '水费', '电费', '物业', '宽带', '话费', '手机', '联通', '移动', '电信'], l1: '居住生活', l2: '水电燃气' },
  { keywords: ['医院', '药房', '药店', '诊所', '医疗', '体检', '卫生'], l1: '医疗健康', l2: '药房购药' },
  { keywords: ['电影', 'KTV', '游戏', 'TapTap', '哔哩哔哩', 'B站', '腾讯视频', '爱奇艺', '优酷', '会员', '视频', '音乐', '网咖', '网吧'], l1: '娱乐休闲', l2: '游戏充值' },
  { keywords: ['健身', '运动', '游泳', '瑜伽', '球', '体育'], l1: '娱乐休闲', l2: '运动健身' },
  { keywords: ['理发', '美发', '美容', '美甲', '护肤', '化妆', '造型'], l1: '购物消费', l2: '美妆护肤' },
  { keywords: ['酒店', '宾馆', '民宿', '旅游', '景点', '门票', '度假'], l1: '娱乐休闲', l2: '旅游度假' },
  { keywords: ['加油', '充电', '停车', '洗车', '保养', '维修', '车'], l1: '交通出行', l2: '燃油充电' },
  { keywords: ['书籍', '书', '文具', '深度求索', '知识付费', '课程'], l1: '教育提升', l2: '知识付费' },
  { keywords: ['房租', '房贷', '租房', '住房'], l1: '居住生活', l2: '房租房贷' },
  { keywords: ['红包', '转账', '礼金'], l1: '人情社交', l2: '红包礼金' },
  { keywords: ['宠物', '猫', '狗', '鱼', '鸟'], l1: '人情社交', l2: '宠物开销' },
  { keywords: ['衣服', '服装', '鞋', '帽', '袜', '包', '配饰'], l1: '购物消费', l2: '服装鞋帽' },
]

/**
 * 根据分类名称查找ID
 */
function findCategoryIds(
  l1Name: string, l2Name: string,
  l1Categories: Category[],
  getL2Categories: (l1Id: number) => Category[]
): { l1Id: number; l2Id: number } | null {
  const l1 = l1Categories.find(c => c.name === l1Name)
  if (!l1) return null
  const children = getL2Categories(l1.id)
  // getL2Categories 返回的是 Category[]（同步），但实际可能是异步的
  // 这里需要特殊处理
  const l2 = children.find(c => c.name === l2Name)
  if (!l2) return null
  return { l1Id: l1.id, l2Id: l2.id }
}

const BillImportModal: React.FC<Props> = ({ visible, platform, records, onCancel, onImport, loading }) => {
  const { l1Categories, fetchL1Categories, getL2Categories } = useCategoryStore()
  const [l2Map, setL2Map] = useState<Record<number, Category[]>>({})
  const [previewRecords, setPreviewRecords] = useState<ImportPreviewRecord[]>(records)

  useEffect(() => {
    if (visible) {
      fetchL1Categories()
    }
  }, [visible])

  // 当 records 变化时，先加载所有二级分类，再自动匹配
  useEffect(() => {
    if (!visible || records.length === 0 || l1Categories.length === 0) return

    // 先预加载所有一级分类的二级分类
    const loadAll = async () => {
      const map: Record<number, Category[]> = {}
      for (const l1 of l1Categories) {
        const children = await getL2Categories(l1.id)
        map[l1.id] = children
      }
      setL2Map(map)

      // 自动匹配分类
      const matched = records.map(r => {
        let suggestion: { l1: string; l2: string } | null = null

        if (platform === 'alipay') {
          suggestion = ALIPAY_MAP[r.tradeCategory] || null
        } else {
          // 微信：基于交易对方+商品说明关键词匹配
          const searchText = (r.counterparty + ' ' + r.description).toLowerCase()
          for (const rule of WECHAT_RULES) {
            if (rule.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
              suggestion = { l1: rule.l1, l2: rule.l2 }
              break
            }
          }
        }

        if (suggestion) {
          const l1 = l1Categories.find(c => c.name === suggestion!.l1)
          if (l1 && map[l1.id]) {
            const l2 = map[l1.id].find(c => c.name === suggestion!.l2)
            if (l2) {
              return { ...r, selectedL1Id: l1.id, selectedL2Id: l2.id, autoMatched: true }
            }
          }
          // 一级匹配但二级不匹配，至少设一级
          const l1Fallback = l1Categories.find(c => c.name === suggestion!.l1)
          if (l1Fallback) {
            return { ...r, selectedL1Id: l1Fallback.id, selectedL2Id: null, autoMatched: false }
          }
        }
        return { ...r, autoMatched: false }
      })

      setPreviewRecords(matched)
    }

    loadAll()
  }, [visible, records, l1Categories])

  // 选择一级分类
  const handleL1Change = (index: number, l1Id: number) => {
    setPreviewRecords(prev => prev.map(r =>
      r.index === index ? { ...r, selectedL1Id: l1Id, selectedL2Id: null, autoMatched: false } : r
    ))
  }

  // 选择二级分类
  const handleL2Change = (index: number, l2Id: number) => {
    setPreviewRecords(prev => prev.map(r =>
      r.index === index ? { ...r, selectedL2Id: l2Id, autoMatched: false } : r
    ))
  }

  // 批量设置未匹配记录的分类
  const handleBatchSet = (l2Id: number) => {
    // 找到对应的 l1Id
    let l1Id: number | null = null
    for (const [key, children] of Object.entries(l2Map)) {
      if (children.some(c => c.id === l2Id)) {
        l1Id = Number(key)
        break
      }
    }
    if (l1Id === null) return

    setPreviewRecords(prev => prev.map(r =>
      r.selectedL2Id === null ? { ...r, selectedL1Id: l1Id, selectedL2Id: l2Id, autoMatched: false } : r
    ))
  }

  const totalAmount = previewRecords.reduce((sum, r) => sum + r.amount, 0)
  const autoCount = previewRecords.filter(r => r.autoMatched).length
  const manualCount = previewRecords.length - autoCount
  const canImport = previewRecords.every(r => r.selectedL2Id !== null)

  // 构建所有二级分类选项（用于批量设置）
  const allL2Options = useMemo(() => {
    const opts: { value: number; label: string; l1Name: string }[] = []
    for (const l1 of l1Categories) {
      const children = l2Map[l1.id] || []
      for (const l2 of children) {
        opts.push({ value: l2.id, label: `${l1.name} → ${l2.name}`, l1Name: l1.name })
      }
    }
    return opts
  }, [l1Categories, l2Map])

  const columns = [
    { title: '交易时间', dataIndex: 'date', width: 110, render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: '交易对方', dataIndex: 'counterparty', width: 110, ellipsis: true },
    { title: '商品说明', dataIndex: 'description', width: 130, ellipsis: true },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 85,
      render: (v: number) => <span style={{ color: '#F56565', fontWeight: 500 }}>¥{v.toFixed(2)}</span>
    },
    {
      title: '状态',
      width: 70,
      render: (_: unknown, record: ImportPreviewRecord) =>
        record.autoMatched
          ? <Tag color="green" style={{ fontSize: 11 }}>已匹配</Tag>
          : <Tag color="orange" style={{ fontSize: 11 }}>待选择</Tag>
    },
    {
      title: '一级分类',
      width: 110,
      render: (_: unknown, record: ImportPreviewRecord) => (
        <Select
          size="small"
          placeholder="选择"
          value={record.selectedL1Id}
          onChange={(val) => handleL1Change(record.index, val)}
          style={{ width: '100%' }}
          options={l1Categories.map(c => ({ value: c.id, label: c.name }))}
        />
      )
    },
    {
      title: '二级分类',
      width: 110,
      render: (_: unknown, record: ImportPreviewRecord) => (
        <Select
          size="small"
          placeholder={record.selectedL1Id ? '选择' : '先选一级'}
          value={record.selectedL2Id}
          onChange={(val) => handleL2Change(record.index, val)}
          style={{ width: '100%' }}
          disabled={!record.selectedL1Id}
          options={(l2Map[record.selectedL1Id!] || []).map(c => ({ value: c.id, label: c.name }))}
        />
      )
    }
  ]

  return (
    <Modal
      title={`导入${platform === 'alipay' ? '支付宝' : '微信'}账单`}
      open={visible}
      onCancel={onCancel}
      onOk={() => onImport(previewRecords)}
      okText={`确认导入（${previewRecords.length}条）`}
      cancelText="取消"
      width={1000}
      okButtonProps={{ disabled: !canImport || loading, loading }}
      destroyOnClose
    >
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={6}>
          <Statistic title="账单平台" value={platform === 'alipay' ? '支付宝' : '微信'} />
        </Col>
        <Col span={6}>
          <Statistic title="总记录数" value={previewRecords.length} suffix="条" />
        </Col>
        <Col span={6}>
          <Statistic
            title="自动匹配"
            value={autoCount}
            suffix={`条 (${previewRecords.length > 0 ? Math.round(autoCount / previewRecords.length * 100) : 0}%)`}
            valueStyle={{ color: '#0D9488' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="总支出"
            value={totalAmount}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#F56565' }}
          />
        </Col>
      </Row>

      {manualCount > 0 && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#d48806', fontSize: 13 }}>
            还有 <b>{manualCount}</b> 条记录未自动匹配，可以手动选择或批量设置：
          </span>
          <Select
            size="small"
            placeholder="批量设置剩余记录的分类"
            onChange={(val) => handleBatchSet(val)}
            style={{ width: 220 }}
            showSearch
            filterOption={(input, option) => (option?.label as string).includes(input)}
            options={allL2Options}
          />
        </div>
      )}

      <Table
        dataSource={previewRecords}
        columns={columns}
        rowKey="index"
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
        size="small"
        scroll={{ y: 400 }}
        rowClassName={(record) => record.autoMatched ? 'bill-import-matched' : ''}
      />
    </Modal>
  )
}

export default BillImportModal