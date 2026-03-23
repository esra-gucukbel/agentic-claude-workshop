import { useNavigate } from 'react-router-dom'
import { VibeLogo } from '../components/VibeLogo'
import Navbar from '../components/Navbar'

export default function LandingPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const isLoggedIn = !!token

  return (
    <>
      <Navbar />
      <div className="page">
        <VibeLogo />
        <p className="tagline">Like Planner but with higher vibes.</p>
        {isLoggedIn ? (
          <button
            className="btn-primary"
            style={{ minWidth: 180 }}
            onClick={() => navigate('/tours')}
          >
            My Tours
          </button>
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
    </>
  )
}
