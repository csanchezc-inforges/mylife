import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, SportRoute, SportRoutePoint } from '../types'
import { uid } from '../hooks/useStore'
import { totalDistanceKm } from '../lib/geo'
import { toast } from '../components/Toast'
import { Modal } from '../components/Modal'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
}

type TrackingStatus = 'idle' | 'recording' | 'paused'

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function Sports({ state, setState }: Props) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle')
  const [points, setPoints] = useState<SportRoutePoint[]>([])
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const watchIdRef = useRef<number | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polylineRef = useRef<L.Polyline | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [viewRoute, setViewRoute] = useState<SportRoute | null>(null)
  const viewMapRef = useRef<HTMLDivElement>(null)
  const viewMapInstanceRef = useRef<L.Map | null>(null)

  const distanceKm = points.length >= 2 ? totalDistanceKm(points) : 0

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (trackingStatus !== 'recording') return
    if (!navigator.geolocation) {
      toast('Geolocalización no disponible')
      setTrackingStatus('idle')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPoints((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now(),
          },
        ])
      },
      () => toast('Error de ubicación'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    )
    return clearWatch
  }, [trackingStatus, clearWatch])

  useEffect(() => {
    if (trackingStatus !== 'recording' || !startTime) return
    const t = setInterval(() => setElapsedMs(Date.now() - startTime), 500)
    return () => clearInterval(t)
  }, [trackingStatus, startTime])

  useEffect(() => {
    if (trackingStatus === 'idle') {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        polylineRef.current = null
      }
      return
    }
    const container = mapContainerRef.current
    if (!container) return
    if (!mapRef.current) {
      const center: [number, number] = points.length ? [points[0].lat, points[0].lng] : [40.4, -3.7]
      const map = L.map(container).setView(center, 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)
      mapRef.current = map
    }
    const map = mapRef.current
    const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng])
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs)
    } else {
      const polyline = L.polyline(latlngs, { color: '#00e5c0', weight: 4 }).addTo(map)
      polylineRef.current = polyline
    }
    if (latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs as L.LatLngExpression[]), { padding: [20, 20] })
    }
  }, [trackingStatus, points])

  useEffect(() => {
    if (viewRoute !== null && viewMapRef.current && !viewMapInstanceRef.current) {
      const r = viewRoute
      const latlngs: [number, number][] = r.points.map((p) => [p.lat, p.lng])
      const center: [number, number] = latlngs.length ? latlngs[Math.floor(latlngs.length / 2)] : [40.4, -3.7]
      const map = L.map(viewMapRef.current).setView(center, 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)
      if (latlngs.length >= 2) {
        L.polyline(latlngs, { color: '#00e5c0', weight: 4 }).addTo(map)
        map.fitBounds(L.latLngBounds(latlngs as L.LatLngExpression[]), { padding: [30, 30] })
      }
      viewMapInstanceRef.current = map
    }
    return () => {
      if (viewMapInstanceRef.current) {
        viewMapInstanceRef.current.remove()
        viewMapInstanceRef.current = null
      }
    }
  }, [viewRoute])

  const startRoute = () => {
    setPoints([])
    setElapsedMs(0)
    setStartTime(Date.now())
    setTrackingStatus('recording')
  }

  const pauseRoute = () => {
    clearWatch()
    setTrackingStatus('paused')
  }

  const resumeRoute = () => {
    setTrackingStatus('recording')
  }

  const finishRoute = () => {
    clearWatch()
    if (points.length < 2) {
      toast('Necesitas al menos 2 puntos para guardar la ruta')
      return
    }
    const now = new Date().toISOString()
    const startedAt = startTime ? new Date(startTime).toISOString().slice(0, 19).replace('T', ' ') : now
    const route: SportRoute = {
      id: uid(),
      points: [...points],
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      startedAt: startedAt.slice(0, 10),
      finishedAt: now.slice(0, 10),
    }
    setState((s) => ({ ...s, sportRoutes: [route, ...s.sportRoutes] }))
    setTrackingStatus('idle')
    setPoints([])
    setStartTime(null)
    toast('Ruta guardada')
  }

  const cancelRoute = () => {
    clearWatch()
    setTrackingStatus('idle')
    setPoints([])
    setStartTime(null)
    setElapsedMs(0)
  }

  const deleteRoute = (id: string) => {
    setState((s) => ({ ...s, sportRoutes: s.sportRoutes.filter((r) => r.id !== id) }))
    if (viewRoute?.id === id) setViewRoute(null)
  }

  const isTracking = trackingStatus === 'recording' || trackingStatus === 'paused'

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 16 }}>
        <div className="page-title">Sports</div>
        <div className="page-sub">Rutas de correr o andar</div>
      </div>

      {!isTracking ? (
        <>
          <button
            type="button"
            className="btn btn-primary btn-full"
            style={{ marginBottom: 20 }}
            onClick={startRoute}
          >
            🏃 Nueva ruta
          </button>
          {!state.sportRoutes.length ? (
            <div className="empty-state">
              <div className="empty-icon">🛤️</div>
              <div>Aún no hay rutas guardadas</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>Pulsa «Nueva ruta» e inicia para empezar a grabar</div>
            </div>
          ) : (
            <div className="sport-routes-list">
              {state.sportRoutes.map((r) => (
                <div key={r.id} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{r.distanceKm.toFixed(2)} km</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {r.startedAt} {r.startedAt !== r.finishedAt ? `– ${r.finishedAt}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewRoute(r)} aria-label="Ver mapa">
                        🗺️
                      </button>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteRoute(r.id)} aria-label="Eliminar">
                        ×
                      </button>
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => setViewRoute(r)}>
                    Ver en mapa
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div ref={mapContainerRef} className="sport-map-container" />
          <div className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>Distancia</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{distanceKm.toFixed(2)} km</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>Tiempo</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatDuration(elapsedMs)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {trackingStatus === 'recording' && (
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={pauseRoute}>
                ⏸ Pausar
              </button>
            )}
            {trackingStatus === 'paused' && (
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={resumeRoute}>
                ▶ Reanudar
              </button>
            )}
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={cancelRoute}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={finishRoute}>
              ✓ Finalizar ruta
            </button>
          </div>
        </>
      )}

      {viewRoute && (
        <Modal onClose={() => setViewRoute(null)}>
          <div className="modal-title">Ruta {viewRoute.distanceKm.toFixed(2)} km</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>{viewRoute.startedAt}</div>
          <div ref={viewMapRef} className="sport-map-view" />
        </Modal>
      )}
    </div>
  )
}
