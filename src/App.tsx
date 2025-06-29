import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './contexts/WalletContext'
import { SystemConfigProvider } from './contexts/SystemConfigContext'
import Layout from './components/Layout'
import Game from './pages/Game'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import History from './pages/History'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

function App() {
  return (
    <SystemConfigProvider>
      <WalletProvider>
        <Router>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Game />} />
              <Route path="profile" element={<Profile />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="history" element={<History />} />
            </Route>
          </Routes>
        </Router>
      </WalletProvider>
    </SystemConfigProvider>
  )
}

export default App