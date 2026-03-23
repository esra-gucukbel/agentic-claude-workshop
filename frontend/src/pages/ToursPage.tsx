import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import 'leaflet/dist/leaflet.css'

// Fix leaflet default icon URLs broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createNumberedIcon = (n: number) =>
  L.divIcon({
    html: `<div class="wp-marker">${n}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  })

interface Waypoint {
  id: number
  tourId: number
  title: string
  description: string
  lat: number
  lng: number
  position: number
}

interface Tour {
  id: number
  title: string
  description: string
  createdAt: string
  waypoints?: Waypoint[]
}

function MapClickHandler({ enabled, onMapClick }: { enabled: boolean; onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function ToursPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [tours, setTours] = useState<Tour[]>([])
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [isAddingStops, setIsAddingStops] = useState(false)
  const [loading, setLoading] = useState(true)

  const [showTourModal, setShowTourModal] = useState(false)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [tourForm, setTourForm] = useState({ title: '', description: '' })
  const [tourSaving, setTourSaving] = useState(false)

  const [showWaypointModal, setShowWaypointModal] = useState(false)
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null)
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [waypointForm, setWaypointForm] = useState({ title: '', description: '' })
  const [waypointSaving, setWaypointSaving] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchTours()
  }, [])

  async function fetchTours() {
    const res = await fetch('/api/tours', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setTours(await res.json())
    setLoading(false)
  }

  async function selectTour(tour: Tour) {
    setIsAddingStops(false)
    const res = await fetch(`/api/tours/${tour.id}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setSelectedTour(await res.json())
  }

  function openCreateTour() {
    setEditingTour(null)
    setTourForm({ title: '', description: '' })
    setShowTourModal(true)
  }

  function openEditTour(tour: Tour) {
    setEditingTour(tour)
    setTourForm({ title: tour.title, description: tour.description })
    setShowTourModal(true)
  }

  async function saveTour() {
    setTourSaving(true)
    if (editingTour) {
      const res = await fetch(`/api/tours/${editingTour.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(tourForm),
      })
      if (res.ok) {
        const updated = { ...editingTour, ...tourForm }
        setTours(tours.map(t => (t.id === editingTour.id ? updated : t)))
        if (selectedTour?.id === editingTour.id) setSelectedTour({ ...selectedTour, ...tourForm })
      }
    } else {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(tourForm),
      })
      if (res.ok) {
        const tour: Tour = await res.json()
        setTours([tour, ...tours])
        setSelectedTour(tour)
        setIsAddingStops(true)
      }
    }
    setTourSaving(false)
    setShowTourModal(false)
    setEditingTour(null)
  }

  async function deleteTour(tourId: number) {
    if (!confirm('Delete this tour and all its stops?')) return
    const res = await fetch(`/api/tours/${tourId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setTours(tours.filter(t => t.id !== tourId))
      if (selectedTour?.id === tourId) { setSelectedTour(null); setIsAddingStops(false) }
    }
  }

  function handleMapClick(lat: number, lng: number) {
    if (!isAddingStops || !selectedTour) return
    const stopNum = (selectedTour.waypoints?.length ?? 0) + 1
    setPendingLatLng({ lat, lng })
    setEditingWaypoint(null)
    setWaypointForm({ title: `Stop ${stopNum}`, description: '' })
    setShowWaypointModal(true)
  }

  function openEditWaypoint(wp: Waypoint) {
    setEditingWaypoint(wp)
    setPendingLatLng(null)
    setWaypointForm({ title: wp.title, description: wp.description })
    setShowWaypointModal(true)
  }

  async function saveWaypoint() {
    if (!selectedTour) return
    setWaypointSaving(true)
    if (editingWaypoint) {
      const res = await fetch(`/api/tours/${selectedTour.id}/waypoints/${editingWaypoint.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...waypointForm, lat: editingWaypoint.lat, lng: editingWaypoint.lng, position: editingWaypoint.position }),
      })
      if (res.ok) {
        const waypoints = (selectedTour.waypoints ?? []).map(w =>
          w.id === editingWaypoint.id ? { ...w, ...waypointForm } : w
        )
        setSelectedTour({ ...selectedTour, waypoints })
      }
    } else if (pendingLatLng) {
      const res = await fetch(`/api/tours/${selectedTour.id}/waypoints`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...waypointForm, ...pendingLatLng, position: selectedTour.waypoints?.length ?? 0 }),
      })
      if (res.ok) {
        const wp: Waypoint = await res.json()
        setSelectedTour({ ...selectedTour, waypoints: [...(selectedTour.waypoints ?? []), wp] })
      }
    }
    setWaypointSaving(false)
    setShowWaypointModal(false)
    setEditingWaypoint(null)
    setPendingLatLng(null)
  }

  async function deleteWaypoint(waypointId: number) {
    if (!selectedTour) return
    const res = await fetch(`/api/tours/${selectedTour.id}/waypoints/${waypointId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok)
      setSelectedTour({ ...selectedTour, waypoints: (selectedTour.waypoints ?? []).filter(w => w.id !== waypointId) })
  }

  return (
    <>
      <Navbar />
      <div className="tours-layout">
        {/* ── Sidebar ── */}
        <aside className="tours-sidebar">
          <div className="tours-sidebar-header">
            <h2 className="tours-sidebar-title">My Tours</h2>
            <button className="btn-primary btn-sm" onClick={openCreateTour}>+ New Tour</button>
          </div>

          <div className="tours-list">
            {loading && <p className="tours-empty">Loading…</p>}
            {!loading && tours.length === 0 && (
              <p className="tours-empty">No tours yet — create one to get started.</p>
            )}
            {tours.map(tour => (
              <div
                key={tour.id}
                className={`tour-card ${selectedTour?.id === tour.id ? 'tour-card--selected' : ''}`}
                onClick={() => selectTour(tour)}
              >
                <div className="tour-card__title">{tour.title}</div>
                {tour.description && <div className="tour-card__desc">{tour.description}</div>}
                <div className="tour-card__actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-link" onClick={() => openEditTour(tour)}>Edit</button>
                  <button className="btn-link btn-link--danger" onClick={() => deleteTour(tour.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {selectedTour && (
            <div className="tour-detail">
              <div className="tour-detail__header">
                <span className="tour-detail__name">{selectedTour.title}</span>
                <button
                  className={`btn-sm ${isAddingStops ? 'btn-active' : 'btn-secondary'}`}
                  onClick={() => setIsAddingStops(v => !v)}
                >
                  {isAddingStops ? 'Done' : '+ Add Stops'}
                </button>
              </div>
              {isAddingStops && <p className="tours-hint">Click anywhere on the map to add a stop</p>}
              <div className="waypoints-list">
                {(selectedTour.waypoints ?? []).length === 0 && (
                  <p className="tours-empty tours-empty--sm">No stops yet.</p>
                )}
                {(selectedTour.waypoints ?? []).map((wp, i) => (
                  <div key={wp.id} className="waypoint-row">
                    <span className="waypoint-num">{i + 1}</span>
                    <div className="waypoint-info">
                      <span className="waypoint-title">{wp.title}</span>
                      {wp.description && <span className="waypoint-desc">{wp.description}</span>}
                    </div>
                    <div className="waypoint-actions">
                      <button className="btn-icon" title="Edit" onClick={() => openEditWaypoint(wp)}>✎</button>
                      <button className="btn-icon btn-icon--danger" title="Delete" onClick={() => deleteWaypoint(wp.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Map ── */}
        <div className={`tours-map${isAddingStops ? ' tours-map--adding' : ''}`}>
          <MapContainer center={[48.8566, 2.3522]} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapClickHandler enabled={isAddingStops} onMapClick={handleMapClick} />
            {(selectedTour?.waypoints ?? []).map((wp, i) => (
              <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createNumberedIcon(i + 1)}>
                <Popup>
                  <div className="wp-popup">
                    <strong>{wp.title}</strong>
                    {wp.description && <p>{wp.description}</p>}
                    <div className="wp-popup__actions">
                      <button onClick={() => openEditWaypoint(wp)}>Edit</button>
                      <button onClick={() => deleteWaypoint(wp.id)}>Delete</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {isAddingStops && (
            <div className="map-adding-banner">Click on the map to drop a stop</div>
          )}
        </div>
      </div>

      {/* ── Tour Modal ── */}
      {showTourModal && (
        <div className="modal-overlay" onClick={() => { setShowTourModal(false); setEditingTour(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{editingTour ? 'Edit Tour' : 'New Tour'}</h3>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={tourForm.title}
                onChange={e => setTourForm({ ...tourForm, title: e.target.value })}
                placeholder="e.g. Rome Weekend"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={tourForm.description}
                onChange={e => setTourForm({ ...tourForm, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => { setShowTourModal(false); setEditingTour(null) }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveTour} disabled={!tourForm.title.trim() || tourSaving}>
                {tourSaving ? 'Saving…' : editingTour ? 'Save Changes' : 'Create Tour'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waypoint Modal ── */}
      {showWaypointModal && (
        <div className="modal-overlay" onClick={() => { setShowWaypointModal(false); setEditingWaypoint(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal__title">{editingWaypoint ? 'Edit Stop' : 'New Stop'}</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={waypointForm.title}
                onChange={e => setWaypointForm({ ...waypointForm, title: e.target.value })}
                placeholder="e.g. Colosseum"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <input
                type="text"
                value={waypointForm.description}
                onChange={e => setWaypointForm({ ...waypointForm, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => { setShowWaypointModal(false); setEditingWaypoint(null) }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveWaypoint} disabled={!waypointForm.title.trim() || waypointSaving}>
                {waypointSaving ? 'Saving…' : editingWaypoint ? 'Save Changes' : 'Add Stop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
