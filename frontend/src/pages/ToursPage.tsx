import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TourMapModal from '../components/TourMapModal'

interface Tour {
  id: number
  tourNumber: string
  vehicleType: string
  maxVolume: number
  maxWeight: number
  rangeKm: number
}

const VEHICLE_TYPES: Record<string, string> = {
  CARGO_BIKE: 'Cargo Bike',
  SPRINTER_3_5T: 'Sprinter 3.5t',
  SPRINTER_5_5T: 'Sprinter 5.5t',
  BOX_TRUCK_7_5T: 'Box Truck 7.5t',
  BOX_TRUCK_12T: 'Box Truck 12t',
}

const EMPTY_FORM = {
  tourNumber: '',
  vehicleType: 'SPRINTER_3_5T',
  maxVolume: '',
  maxWeight: '',
  rangeKm: '',
}

export default function ToursPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const [tours, setTours] = useState<Tour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Tour | null>(null)
  const [mapTour, setMapTour] = useState<Tour | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchTours()
  }, [])

  async function fetchTours() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tours', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        navigate('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load tours')
      setTours(await res.json())
    } catch {
      setError('Could not load tours.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingTour(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(tour: Tour) {
    setEditingTour(tour)
    setForm({
      tourNumber: tour.tourNumber,
      vehicleType: tour.vehicleType,
      maxVolume: String(tour.maxVolume),
      maxWeight: String(tour.maxWeight),
      rangeKm: String(tour.rangeKm),
    })
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!/^\d{4}$/.test(form.tourNumber)) {
      setFormError('Tour number must be exactly 4 digits.')
      return
    }
    if (!form.maxVolume || !form.maxWeight || !form.rangeKm) {
      setFormError('All fields are required.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const body = {
        tourNumber: form.tourNumber,
        vehicleType: form.vehicleType,
        maxVolume: parseFloat(form.maxVolume),
        maxWeight: parseFloat(form.maxWeight),
        rangeKm: parseInt(form.rangeKm),
      }
      const url = editingTour ? `/api/tours/${editingTour.id}` : '/api/tours'
      const method = editingTour ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Failed to save tour.')
        return
      }
      setModalOpen(false)
      fetchTours()
    } catch {
      setFormError('Failed to save tour.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(tour: Tour) {
    try {
      await fetch(`/api/tours/${tour.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setDeleteConfirm(null)
      fetchTours()
    } catch {
      setError('Failed to delete tour.')
    }
  }

  return (
    <>
      <Navbar />
      <div className="tours-page">
        <div className="tours-header">
          <h1 className="tours-title">Tours</h1>
          <button className="btn-primary" onClick={openCreate}>
            + New Tour
          </button>
        </div>

        {error && <div className="error-text">{error}</div>}

        {loading ? (
          <p className="hint-text">Loading…</p>
        ) : tours.length === 0 ? (
          <div className="tours-empty">
            <p>No tours yet.</p>
            <p className="hint-text">Create your first tour to get started.</p>
          </div>
        ) : (
          <div className="tours-table-wrapper">
            <table className="tours-table">
              <thead>
                <tr>
                  <th>Tour No.</th>
                  <th>Vehicle Type</th>
                  <th>Max Volume (m³)</th>
                  <th>Max Weight (kg)</th>
                  <th>Range (km)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tours.map((tour) => (
                  <tr key={tour.id}>
                    <td className="tours-table__number">{tour.tourNumber}</td>
                    <td>{VEHICLE_TYPES[tour.vehicleType] ?? tour.vehicleType}</td>
                    <td>{tour.maxVolume}</td>
                    <td>{tour.maxWeight}</td>
                    <td>{tour.rangeKm}</td>
                    <td className="tours-table__actions">
                      <button
                        className="btn-icon"
                        title="Map"
                        onClick={() => setMapTour(tour)}
                      >
                        ⌖
                      </button>
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => openEdit(tour)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete"
                        onClick={() => setDeleteConfirm(tour)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{editingTour ? 'Edit Tour' : 'New Tour'}</h2>

            <div className="form-group">
              <label htmlFor="tour-number">Tour Number</label>
              <input
                id="tour-number"
                type="text"
                maxLength={4}
                placeholder="0001"
                value={form.tourNumber}
                onChange={(e) => setForm({ ...form, tourNumber: e.target.value.replace(/\D/g, '') })}
              />
              <p className="hint-text">4-digit number (e.g. 0023)</p>
            </div>

            <div className="form-group">
              <label htmlFor="vehicle-type">Vehicle Type</label>
              <select
                id="vehicle-type"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              >
                {Object.entries(VEHICLE_TYPES).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="max-volume">Max Volume (m³)</label>
              <input
                id="max-volume"
                type="number"
                min="0"
                step="0.01"
                placeholder="14.00"
                value={form.maxVolume}
                onChange={(e) => setForm({ ...form, maxVolume: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="max-weight">Max Weight (kg)</label>
              <input
                id="max-weight"
                type="number"
                min="0"
                step="0.1"
                placeholder="3500"
                value={form.maxWeight}
                onChange={(e) => setForm({ ...form, maxWeight: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="range-km">Range (km)</label>
              <input
                id="range-km"
                type="number"
                min="0"
                placeholder="200"
                value={form.rangeKm}
                onChange={(e) => setForm({ ...form, rangeKm: e.target.value })}
              />
            </div>

            {formError && <div className="error-text">{formError}</div>}

            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map modal */}
      {mapTour && token && (
        <TourMapModal
          tour={mapTour}
          token={token}
          onClose={() => setMapTour(null)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Delete Tour {deleteConfirm.tourNumber}?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This action cannot be undone.
            </p>
            <div className="modal__actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: '#FF6666', color: '#fff' }}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
