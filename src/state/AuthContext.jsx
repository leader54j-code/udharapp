import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/auth/me').then(r => setUser(r.user)).catch(() => {}).finally(() => setLoading(false)) }, [])
  const login = async (credentials) => { const result = await api.post('/auth/login', credentials); setUser(result.user) }
  const register = async (details) => { const result = await api.post('/auth/register', details); setUser(result.user) }
  const logout = async () => { await api.post('/auth/logout'); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
