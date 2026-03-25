import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default Leaflet marker icons broken by Vite's asset pipeline
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
})

interface WaypointDraft {
  lat: number
  lng: number
}

interface Tour {
  id: number
  tourNumber: string
}

interface Props {
  tour: Tour
  token: string
  onClose: () => void
}

const DEFAULT_CENTER: [number, number] = [51.0, 10.0]
const DEFAULT_ZOOM = 6

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FitBounds({ waypoints }: { waypoints: WaypointDraft[] }) {
  const map = useMap()
  useEffect(() => {
    if (waypoints.length === 0) return
    const bounds = L.latLngBounds(waypoints.map((w) => [w.lat, w.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [])
  return null
}

export default function TourMapModal({ tour, token, onClose }: Props) {
  const [waypoints, setWaypoints] = useState<WaypointDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchWaypoints() {
      try {
        const res = await fetch(`/api/tours/${tour.id}/waypoints`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load waypoints')
        const data: { lat: number; lng: number }[] = await res.json()
        setWaypoints(data.map((w) => ({ lat: w.lat, lng: w.lng })))
      } catch {
        setError('Could not load waypoints.')
      } finally {
        setLoading(false)
      }
    }
    fetchWaypoints()
  }, [tour.id, token])

  function handleMapClick(lat: number, lng: number) {
    setWaypoints((prev) => [...prev, { lat, lng }])
  }

  function handleMarkerDrag(index: number, lat: number, lng: number) {
    setWaypoints((prev) => prev.map((w, i) => (i === index ? { lat, lng } : w)))
  }

  function handleMarkerClick(index: number) {
    setWaypoints((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/tours/${tour.id}/waypoints`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(waypoints),
      })
      if (!res.ok) throw new Error('Failed to save waypoints')
      onClose()
    } catch {
      setError('Could not save waypoints.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal__header">
          <h2 className="modal__title">Tour {tour.tourNumber} — Map</h2>
          <p className="hint-text">Click on the map to add waypoints. Click a marker to remove it. Drag to reposition.</p>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="map-modal__map">
          {loading ? (
            <div className="map-modal__loading">Loading map…</div>
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {waypoints.length > 0 && <FitBounds waypoints={waypoints} />}
              {waypoints.map((wp, i) => (
                <Marker
                  key={i}
                  position={[wp.lat, wp.lng]}
                  draggable
                  eventHandlers={{
                    dragend(e) {
                      const { lat, lng } = (e.target as L.Marker).getLatLng()
                      handleMarkerDrag(i, lat, lng)
                    },
                    click() {
                      handleMarkerClick(i)
                    },
                  }}
                />
              ))}
            </MapContainer>
          )}
        </div>

        <div className="map-modal__footer">
          <span className="hint-text">{waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}</span>
          <div className="modal__actions" style={{ marginTop: 0 }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
