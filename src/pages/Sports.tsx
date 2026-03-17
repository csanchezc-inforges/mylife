import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, SportRoute, SportRoutePoint } from '../types'
import { uid } from '../hooks/useStore'
import { totalDistanceKm } from '../lib/geo'
import { toast } from '../components/Toast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
}

type TrackingStatus = 'idle' | 'recording' | 'paused'

const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
const MAP_ATTRIBUTION = '© OpenStreetMap, © CARTO'

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function formatPace(minPerKm: number): string {
  if (!isFinite(minPerKm) || minPerKm <= 0) return '--:--'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** km por día/mes/año para gráficos */
function getRouteAggregates(routes: SportRoute[]) {
  const weekly = (() => {
    const out: { label: string; km: number; date: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      const km = routes.filter((r) => r.startedAt === date).reduce((s, r) => s + r.distanceKm, 0)
      out.push({ label, km, date })
    }
    return out
  })()
  const monthly = (() => {
    const out: { label: string; km: number; monthKey: string }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const km = routes.filter((r) => r.startedAt.startsWith(monthKey)).reduce((s, r) => s + r.distanceKm, 0)
      out.push({ label: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), km, monthKey })
    }
    return out
  })()
  const yearly = (() => {
    const out: { label: string; km: number; yearKey: string }[] = []
    const y = new Date().getFullYear()
    for (let i = 4; i >= 0; i--) {
      const yearKey = String(y - i)
      const km = routes.filter((r) => r.startedAt.startsWith(yearKey)).reduce((s, r) => s + r.distanceKm, 0)
      out.push({ label: yearKey, km, yearKey })
    }
    return out
  })()
  return { weekly, monthly, yearly }
}

function BarChart({
  data,
  maxKm,
  height = 120,
}: {
  data: { label: string; km: number }[]
  maxKm?: number
  height?: number
}) {
  const max = maxKm ?? Math.max(1, ...data.map((d) => d.km))
  return (
    <div className="sport-chart" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="sport-chart-bar-wrap">
          <div
            className="sport-chart-bar"
            style={{ height: max > 0 ? `${(d.km / max) * 100}%` : '0%' }}
            title={`${d.label}: ${d.km.toFixed(1)} km`}
          />
          <span className="sport-chart-label">{d.label}</span>
          {d.km > 0 && <span className="sport-chart-value">{d.km.toFixed(1)}</span>}
        </div>
      ))}
    </div>
  )
}

function getMotivationalMessage(distanceKm: number): string {
  const messages = [
    '¡Genial! Cada kilómetro cuenta. 💪',
    '¡Buenísimo! Sigue así. 🏃',
    '¡Increíble! Tu cuerpo te lo agradece. ✨',
    '¡Perfecto! Una ruta más en tu historial. 🎯',
    '¡Enhorabuena! Estás en racha. 🔥',
    '¡Muy bien! La constancia es clave. 🌟',
    '¡Excelente! Cada paso suma. 👟',
  ]
  if (distanceKm >= 5) {
    const long = [
      '¡5 km o más! Eres una máquina. 🚀',
      '¡Ruta larga completada! Impresionante. 💪',
    ]
    messages.push(...long)
  }
  if (distanceKm >= 10) {
    messages.push('¡10 km! Nivel profesional. 🏆')
  }
  return messages[Math.floor(Math.random() * messages.length)]
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
  const liveAvgSpeedKmh = elapsedMs > 0 && distanceKm > 0 ? distanceKm / (elapsedMs / 3_600_000) : 0
  const livePaceMinPerKm = distanceKm > 0 && elapsedMs > 0 ? (elapsedMs / 60_000) / distanceKm : 0

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
      L.tileLayer(MAP_TILES, { attribution: MAP_ATTRIBUTION, subdomains: 'abcd' }).addTo(map)
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
      L.tileLayer(MAP_TILES, { attribution: MAP_ATTRIBUTION, subdomains: 'abcd' }).addTo(map)
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
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
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
    const startedAtIso = startTime ? new Date(startTime).toISOString().slice(0, 19).replace('T', ' ') : now
    const firstTs = points[0]?.timestamp ?? Date.now()
    const lastTs = points[points.length - 1]?.timestamp ?? Date.now()
    const durationMs = Math.max(0, lastTs - firstTs)
    const avgSpeedKmh = durationMs > 0 && distanceKm > 0 ? distanceKm / (durationMs / 3_600_000) : undefined
    const route: SportRoute = {
      id: uid(),
      points: [...points],
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      durationMs,
      avgSpeedKmh,
      startedAt: startedAtIso.slice(0, 10),
      finishedAt: now.slice(0, 10),
    }
    setState((s) => ({ ...s, sportRoutes: [route, ...s.sportRoutes] }))
    setTrackingStatus('idle')
    setPoints([])
    setStartTime(null)
    const msg = getMotivationalMessage(route.distanceKm)
    toast(msg)
    const title = 'Ruta guardada 🏃'
    const body = `${route.distanceKm.toFixed(2)} km · ${msg}`
    const iconUrl = new URL('/icon-192.png', window.location.origin).href
    const showNativeNotification = () => {
      const fallback = () => {
        try {
          new Notification(title, { body, icon: iconUrl })
        } catch {}
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.showNotification(title, { body, icon: iconUrl, tag: 'sport-route' }))
          .catch(fallback)
      } else {
        fallback()
      }
    }
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        showNativeNotification()
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') showNativeNotification()
        }).catch(() => {})
      }
    }
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
  const aggregates = getRouteAggregates(state.sportRoutes)
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')
  const chartData = chartPeriod === 'weekly' ? aggregates.weekly : chartPeriod === 'monthly' ? aggregates.monthly : aggregates.yearly
  const chartMax = Math.max(1, ...chartData.map((d) => d.km))

  return (
    <div className={`page-wrap sport-page${isTracking ? ' sport-page-tracking' : ''}`}>
      <div className="sport-header">
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Sports</div>
          <div className="page-sub">Rutas de correr o andar</div>
        </div>
        {!isTracking && (
          <button type="button" className="btn btn-primary sport-btn-start" onClick={startRoute}>
            🏃 Nueva ruta
          </button>
        )}
      </div>

      {!isTracking ? (
        <>
          {!state.sportRoutes.length ? (
            <div className="sport-empty">
              <div className="sport-empty-icon">🛤️</div>
              <div className="sport-empty-title">Aún no hay rutas guardadas</div>
              <div className="sport-empty-sub">Pulsa «Nueva ruta» e inicia para empezar a grabar</div>
            </div>
          ) : (
            <>
              <section className="sport-evolution">
                <h3 className="sport-evolution-title">Evolución (km)</h3>
                <div className="sport-evolution-tabs">
                  {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`sport-evolution-tab${chartPeriod === p ? ' active' : ''}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p === 'weekly' ? 'Semanal' : p === 'monthly' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
                <BarChart data={chartData} maxKm={chartMax} height={140} />
              </section>
              <div className="sport-routes-list-header">
                <h3 className="sport-routes-list-title">Rutas</h3>
              </div>
              <div className="sport-routes-grid">
                {state.sportRoutes.map((r) => {
                  const dur = r.durationMs
                  const avgSpeed = r.avgSpeedKmh
                  const paceMinPerKm = dur && r.distanceKm > 0 ? (dur / 60_000) / r.distanceKm : undefined
                  return (
                    <div
                      key={r.id}
                      className="sport-route-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewRoute(r)}
                      onKeyDown={(e) => e.key === 'Enter' && setViewRoute(r)}
                    >
                      <div className="sport-route-card-left">
                        <span className="sport-route-distance">{r.distanceKm.toFixed(2)} km</span>
                        <span className="sport-route-date">{r.startedAt}</span>
                        <div className="sport-route-meta">
                          {dur ? formatDuration(dur) : '—'} · {avgSpeed != null ? `${avgSpeed.toFixed(1)} km/h` : paceMinPerKm != null ? formatPace(paceMinPerKm) + '/km' : '—'}
                          {typeof r.elevationGain === 'number' && ` · ${Math.round(r.elevationGain)} m`}
                        </div>
                      </div>
                      <div className="sport-route-card-right">
                        <span className="sport-route-open-label">Ver detalle</span>
                        <span className="sport-route-arrow">›</span>
                        <button
                          type="button"
                          className="sport-route-delete"
                          onClick={(e) => { e.stopPropagation(); deleteRoute(r.id) }}
                          aria-label="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="sport-tracking">
          <div ref={mapContainerRef} className="sport-map-container" />
          <div className="sport-stats-bar">
            <div className="sport-stat">
              <span className="sport-stat-value">{distanceKm.toFixed(2)}</span>
              <span className="sport-stat-unit">km</span>
            </div>
            <div className="sport-stat-divider" />
            <div className="sport-stat">
              <span className="sport-stat-value">{formatDuration(elapsedMs)}</span>
              <span className="sport-stat-unit">tiempo</span>
            </div>
            <div className="sport-stat-divider" />
            <div className="sport-stat">
              <span className="sport-stat-value">{liveAvgSpeedKmh > 0 ? liveAvgSpeedKmh.toFixed(1) : '0.0'}</span>
              <span className="sport-stat-unit">km/h</span>
            </div>
          </div>
          <div className="sport-controls">
            {trackingStatus === 'recording' && (
              <button type="button" className="btn btn-ghost sport-control-btn" onClick={pauseRoute}>⏸ Pausar</button>
            )}
            {trackingStatus === 'paused' && (
              <button type="button" className="btn btn-primary sport-control-btn" onClick={resumeRoute}>▶ Reanudar</button>
            )}
            <button type="button" className="btn btn-ghost sport-control-btn" onClick={cancelRoute}>Cancelar</button>
            <button type="button" className="btn btn-primary sport-control-btn sport-control-finish" onClick={finishRoute}>✓ Finalizar</button>
          </div>
        </div>
      )}

      {viewRoute && (
        <div className="sport-route-detail-overlay" role="dialog" aria-modal="true" aria-label="Detalle de ruta">
          <div className="sport-route-detail">
            <header className="sport-route-detail-header">
              <button type="button" className="sport-route-detail-back" onClick={() => setViewRoute(null)} aria-label="Cerrar">
                ← Cerrar
              </button>
              <div className="sport-route-detail-title">
                <span className="sport-route-detail-date">{viewRoute.startedAt}</span>
                <span className="sport-route-detail-distance">{viewRoute.distanceKm.toFixed(2)} km</span>
              </div>
            </header>
            <div ref={viewMapRef} className="sport-route-detail-map" />
            <section className="sport-route-detail-stats">
              <h4 className="sport-route-detail-section-title">Resumen</h4>
              <div className="sport-route-detail-grid">
                <div className="sport-route-detail-stat">
                  <span className="sport-route-detail-stat-value">{viewRoute.distanceKm.toFixed(2)}</span>
                  <span className="sport-route-detail-stat-unit">km</span>
                </div>
                <div className="sport-route-detail-stat">
                  <span className="sport-route-detail-stat-value">
                    {viewRoute.durationMs != null ? formatDuration(viewRoute.durationMs) : '—'}
                  </span>
                  <span className="sport-route-detail-stat-unit">tiempo</span>
                </div>
                <div className="sport-route-detail-stat">
                  <span className="sport-route-detail-stat-value">
                    {viewRoute.durationMs != null && viewRoute.distanceKm > 0
                      ? formatPace((viewRoute.durationMs / 60_000) / viewRoute.distanceKm)
                      : '—'}
                  </span>
                  <span className="sport-route-detail-stat-unit">ritmo /km</span>
                </div>
                <div className="sport-route-detail-stat">
                  <span className="sport-route-detail-stat-value">
                    {viewRoute.avgSpeedKmh != null ? viewRoute.avgSpeedKmh.toFixed(1) : '—'}
                  </span>
                  <span className="sport-route-detail-stat-unit">km/h</span>
                </div>
                {typeof viewRoute.elevationGain === 'number' && (
                  <div className="sport-route-detail-stat">
                    <span className="sport-route-detail-stat-value">{Math.round(viewRoute.elevationGain)}</span>
                    <span className="sport-route-detail-stat-unit">m desnivel</span>
                  </div>
                )}
              </div>
            </section>
            <div className="sport-route-detail-actions">
              <button type="button" className="btn btn-danger" onClick={() => { deleteRoute(viewRoute.id); setViewRoute(null) }}>
                Eliminar ruta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
