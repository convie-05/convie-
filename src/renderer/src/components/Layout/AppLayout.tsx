import React from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  OrderedListOutlined,
  PieChartOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'

const { Sider, Content } = Layout

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '概览'
  },
  {
    key: '/records',
    icon: <OrderedListOutlined />,
    label: '记录'
  },
  {
    key: '/statistics',
    icon: <PieChartOutlined />,
    label: '统计'
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '设置'
  }
]

const AppLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Layout className="app-layout">
      <Sider width={200} theme="light">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0D9488' }}>
            📒 Convie记账本
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none' }}
        />
      </Sider>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}

export default AppLayout