import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (data) => apiClient.post('/api/auth/register', data),
  login: (data) => apiClient.post('/api/auth/login', data),
  logout: () => localStorage.removeItem('access_token'),
}

export const learningPathAPI = {
  getAll: () => apiClient.get('/api/learning-paths'),
  create: (data) => apiClient.post('/api/learning-paths', data),
  getById: (id) => apiClient.get(`/api/learning-paths/${id}`),
}

export const aiAPI = {
  generatePath: (data) => apiClient.post('/api/ai/generate-path', data),
}

export default apiClient
