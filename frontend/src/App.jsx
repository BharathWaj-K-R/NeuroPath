import { useState } from 'react'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { LoginForm } from './components/LoginForm'
import { PathGenerator } from './components/PathGenerator'
import './App.css'

function AppContent() {
  const { user, logout } = useAuthContext()
  const [showGenerator, setShowGenerator] = useState(false)

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>NeuroPath</h1>
          <p className="subtitle">AI-Powered Personalized Learning</p>
          <LoginForm onSuccess={() => setShowGenerator(true)} />
          <p className="register-hint">No account? Register first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-content">
          <h1>NeuroPath</h1>
          <div className="nav-right">
            <span>Welcome, {user.full_name}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>
      
      <main className="main-content">
        {showGenerator ? (
          <PathGenerator />
        ) : (
          <div className="dashboard">
            <h2>Your Learning Dashboard</h2>
            <button 
              onClick={() => setShowGenerator(true)}
              className="primary-btn"
            >
              Generate New Learning Path
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
