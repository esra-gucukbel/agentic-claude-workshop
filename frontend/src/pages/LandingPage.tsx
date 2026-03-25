import { useNavigate } from 'react-router-dom'
import { VibeLogo } from '../components/VibeLogo'
import Navbar from '../components/Navbar'

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <>
      <Navbar />
      <div className="page">
        <VibeLogo />
        <p className="tagline">Like Planner but with higher vibes.</p>
        <button
          className="btn-primary"
          style={{ minWidth: 180 }}
          onClick={() => navigate('/login')}
        >
          Get Started
        </button>
      </div>
    </>
  )
}
