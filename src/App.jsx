import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { Loading } from './components/UI.jsx'
import { useAuth } from './state/AuthContext.jsx'
import { AuthPage } from './pages/AuthPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { PeoplePage } from './pages/PeoplePage.jsx'
import { TransactionsPage } from './pages/TransactionsPage.jsx'
import { ReportsPage } from './pages/ReportsPage.jsx'

export function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-canvas"><Loading/></div>
  if (!user) return <AuthPage/>
  return <Layout><Routes><Route path="/" element={<DashboardPage/>}/><Route path="/people" element={<PeoplePage/>}/><Route path="/transactions" element={<TransactionsPage/>}/><Route path="/reports" element={<ReportsPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Layout>
}
