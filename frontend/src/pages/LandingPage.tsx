import { useNavigate } from 'react-router-dom'
import { VibeLogo } from '../components/VibeLogo'

export default function LandingPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className="page">
      <VibeLogo />
      <p className="tagline">Like Planner but with higher vibes.</p>
      {isLoggedIn ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            You're logged in.
          </p>
          <button
            className="btn-secondary"
            style={{ minWidth: 180 }}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      ) : (
        <button
          className="btn-primary"
          style={{ minWidth: 180 }}
          onClick={() => navigate('/login')}
        >
          Get Started
        </button>
      )}
    </div>
  )
}
