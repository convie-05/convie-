import React, { useEffect, useState, useCallback } from 'react'
import { Card, Row, Col, Select, Spin } from 'antd'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TooltipComponent, GridComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { useUIStore } from '../stores/uiStore'
import { formatAmount, MONTH_NAMES } from '../utils'
import type { YearlyTrendItem } from '../types'

echarts.use([BarChart, LineChart, PieChart, CanvasRenderer, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent])

const StatisticsPage: React.FC = () => {
  const { selectedYear, setYear } = useUIStore()
  const [yearlyTrend, setYearlyTrend] = useState<YearlyTrendItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchYearlyData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electronAPI.stats.yearlyTrend(selectedYear)
      setYearlyTrend(data)
    } catch (error) {
      console.error('获取年度趋势失败:', error)
    }
    setLoading(false)
  }, [selectedYear])

  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  // 年度趋势折线/柱状图
  const trendOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>支出: ¥${param.value.toFixed(2)}<br/>笔数: ${yearlyTrend.find(d => d.month === param.name)?.count || 0}`
      }
    },
    grid: { left: 60, right: 30, top: 40, bottom: 60 },
    xAxis: {
      type: 'category' as const,
      data: MONTH_NAMES,
      axisLabel: { fontSize: 12 }
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (value: number) => `¥${value}`
      }
    },
    dataZoom: [
      {
        type: 'inside' as const,
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        type: 'line',
        data: MONTH_NAMES.map((_, i) => {
          const item = yearlyTrend.find(d => d.month === `${selectedYear}-${String(i + 1).padStart(2, '0')}`)
          return item ? item.total : 0
        }),
        itemStyle: { color: '#0D9488' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(13, 148, 136, 0.3)' },
              { offset: 1, color: 'rgba(13, 148, 136, 0.05)' }
            ]
          }
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }

  // 年度汇总饼图
  const getAnnualSummary = async (year: number) => {
    const allSummaries: Record<string, number> = {}
    for (let m = 1; m <= 12; m++) {
      try {
        const data = await window.electronAPI.stats.monthlySummary(year, m)
        for (const item of data) {
          allSummaries[item.l1_name] = (allSummaries[item.l1_name] || 0) + item.total_amount
        }
      } catch {
        // skip errors
      }
    }
    return allSummaries
  }

  const [annualSummary, setAnnualSummary] = useState<Record<string, number>>({})

  useEffect(() => {
    getAnnualSummary(selectedYear).then(setAnnualSummary)
  }, [selectedYear])

  const annualPieOption = {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: ¥{c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '50%'],
      label: {
        show: true,
        formatter: '{b}: {d}%',
        fontSize: 12
      },
      data: Object.entries(annualSummary)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value })),
      color: [
        '#0D9488', '#F56565', '#1890FF', '#722ED1',
        '#13C2C2', '#EB2F96', '#FA8C16', '#52C41A', '#FAAD14'
      ]
    }]
  }

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - 5 + i
    return { value: y, label: `${y}年` }
  })

  // 计算全年合计
  const annualTotal = Object.values(annualSummary).reduce((sum, v) => sum + v, 0)
  const totalTransactions = yearlyTrend.reduce((sum, d) => sum + d.count, 0)

  // 最高月份
  const highestMonth = yearlyTrend.reduce((max, d) => d.total > max.total ? d : max, { month: '', total: 0 })

  return (
    <div>
      <div className="page-header">
        <h2>📈 统计报表</h2>
        <Select
          value={selectedYear}
          onChange={setYear}
          options={yearOptions}
          style={{ width: 100 }}
        />
      </div>

      <Spin spinning={loading}>
        {/* 年度统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value">{formatAmount(annualTotal)}</div>
              <div className="stat-label">{selectedYear}年总支出</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#1890FF' }}>{totalTransactions}</div>
              <div className="stat-label">全年总笔数</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#722ED1' }}>
                {totalTransactions > 0 ? formatAmount(annualTotal / totalTransactions) : '¥0.00'}
              </div>
              <div className="stat-label">笔均支出</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <div className="stat-value" style={{ color: '#13C2C2' }}>
                {highestMonth.total > 0
                  ? `${highestMonth.month.slice(5, 7)}月 ${formatAmount(highestMonth.total)}`
                  : '-'}
              </div>
              <div className="stat-label">支出最高月份</div>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={14}>
            <Card title={`${selectedYear}年 月度支出趋势`}>
              <ReactEChartsCore
                echarts={echarts}
                option={trendOption}
                style={{ height: 350 }}
              />
            </Card>
          </Col>
          <Col span={10}>
            <Card title={`${selectedYear}年 分类支出占比`}>
              {Object.keys(annualSummary).length > 0 ? (
                <ReactEChartsCore
                  echarts={echarts}
                  option={annualPieOption}
                  style={{ height: 350 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
                  {selectedYear}年暂无数据
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

export default StatisticsPage