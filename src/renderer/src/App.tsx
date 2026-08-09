import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/Layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import RecordsPage from './pages/RecordsPage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'

const theme = {
  token: {
    colorPrimary: '#0D9488',
    colorSuccess: '#0D9488',
    colorWarning: '#F56565',
    borderRadius: 6
  }
}

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ConfigProvider>
  )
}

export default App