import { useState, useEffect } from 'react'
import apiClient, { authAPI } from '../utils/api'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      validateToken(token)
    }
  }, [])

  const validateToken = async (token) => {
    try {
      const response = await apiClient.get('/api/health')
      // If health check passes, token is valid
    } catch (err) {
      localStorage.removeItem('access_token')
    }
  }

  const register = async (email, password, fullName) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authAPI.register({ email, password, full_name: fullName })
      localStorage.setItem('access_token', response.data.access_token)
      setUser(response.data.user)
      return response.data
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authAPI.login({ email, password })
      localStorage.setItem('access_token', response.data.access_token)
      setUser(response.data.user)
      return response.data
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return { user, loading, error, register, login, logout, setUser }
}
