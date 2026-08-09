import React, { useEffect, useState, useCallback } from 'react'
import { Card, Row, Col, Statistic, Spin, Select, Table, Tag } from 'antd'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { formatAmount, MONTH_NAMES } from '../utils'
import { useUIStore } from '../stores/uiStore'
import type { MonthlySummary, DailyTotal } from '../types'

// 注册 ECharts 组件
echarts.use([PieChart, BarChart, CanvasRenderer, TooltipComponent, GridComponent, LegendComponent])

const DashboardPage: React.FC = () => {
  const { selectedYear, selectedMonth, setYear, setMonth, openAddModal } = useUIStore()

  const [summary, setSummary] = useState<MonthlySummary[]>([])
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([])
  const [monthTotal, setMonthTotal] = useState<{ total: number; count: number }>({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, dailyData, totalData] = await Promise.all([
        window.electronAPI.stats.monthlySummary(selectedYear, selectedMonth),
        window.electronAPI.stats.dailyTotals(selectedYear, selectedMonth),
        window.electronAPI.stats.monthTotal(selectedYear, selectedMonth)
      ])
      setSummary(summaryData)
      setDailyTotals(dailyData)
      setMonthTotal(totalData)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
    setLoading(false)
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 饼图配置
  const pieOption = {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c}元 ({d}%)'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
          fontSize: 12
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: summary
          .filter(item => item.total_amount > 0)
          .map(item => ({
            name: item.l1_name,
            value: item.total_amount
          })),
        color: [
          '#0D9488', '#F56565', '#1890FF', '#722ED1',
          '#13C2C2', '#EB2F96', '#FA8C16', '#52C41A', '#FAAD14'
        ]
      }
    ]
  }

  // 柱状图配置
  const barOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>支出: ¥${param.value.toFixed(2)}`
      }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: dailyTotals.map(d => d.date.slice(8, 10) + '日'),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (value: number) => `¥${value}`
      }
    },
    series: [
      {
        type: 'bar',
        data: dailyTotals.map(d => d.total),
        itemStyle: {
          color: '#0D9488',
          borderRadius: [4, 4, 0, 0]
        },
        barMaxWidth: 30
      }
    ]
  }

  // Top 分类排名
  const topCategories = [...summary]
    .filter(item => item.total_amount > 0)
    .sort((a, b) => b.total_amount - a.total_amount)

  // 年份选项
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - 5 + i
    return { value: y, label: `${y}年` }
  })

  return (
    <div>
      <div className="page-header">
        <h2>📊 概览</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Select
            value={selectedYear}
            onChange={setYear}
            options={yearOptions}
            style={{ width: 100 }}
          />
          <Select
            value={selectedMonth}
            onChange={setMonth}
            options={MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))}
            style={{ width: 80 }}
          />
        </div>
      </div>

      <Spin spinning={loading}>
        {/* 月度统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value">{formatAmount(monthTotal.total)}</div>
              <div className="stat-label">本月总支出</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#1890FF' }}>
                {monthTotal.count}
              </div>
              <div className="stat-label">本月笔数</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#722ED1' }}>
                {monthTotal.count > 0
                  ? formatAmount(monthTotal.total / monthTotal.count)
                  : '¥0.00'}
              </div>
              <div className="stat-label">笔均支出</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#13C2C2' }}>
                {topCategories[0]
                  ? `${topCategories[0].l1_name} ${(topCategories[0].total_amount / monthTotal.total * 100).toFixed(0)}%`
                  : '-'}
              </div>
              <div className="stat-label">最大支出类别</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          {/* 分类占比饼图 */}
          <Col span={12}>
            <Card title="分类支出占比">
              {summary.some(s => s.total_amount > 0) ? (
                <ReactEChartsCore
                  echarts={echarts}
                  option={pieOption}
                  style={{ height: 300 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  本月暂无支出记录
                </div>
              )}
            </Card>
          </Col>

          {/* 每日趋势柱状图 */}
          <Col span={12}>
            <Card title="每日支出趋势">
              {dailyTotals.length > 0 ? (
                <ReactEChartsCore
                  echarts={echarts}
                  option={barOption}
                  style={{ height: 300 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  本月暂无支出记录
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 分类排名表 */}
        <Card title="分类支出排行">
          <Table
            dataSource={topCategories}
            rowKey="l1_id"
            pagination={false}
            columns={[
              {
                title: '排名',
                width: 60,
                render: (_: any, __: any, index: number) => (
                  <Tag color={['#0D9488', '#1890FF', '#722ED1'][index] || '#999'}>
                    {index + 1}
                  </Tag>
                )
              },
              { title: '分类', dataIndex: 'l1_name', width: 120 },
              {
                title: '支出金额',
                dataIndex: 'total_amount',
                render: (val: number) => (
                  <span className="amount-text">{formatAmount(val)}</span>
                )
              },
              {
                title: '占比',
                render: (_: any, record: MonthlySummary) => (
                  <span>
                    {monthTotal.total > 0
                      ? `${(record.total_amount / monthTotal.total * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                )
              },
              { title: '笔数', dataIndex: 'transaction_count', width: 60 }
            ]}
          />
        </Card>
      </Spin>
    </div>
  )
}

export default DashboardPage