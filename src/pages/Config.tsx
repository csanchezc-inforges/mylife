import { useState } from 'react'
import { AppState, Provider, ACCENT_COLORS, SportRoute } from '../types'
import { toast } from '../components/Toast'
import { isBiometricSupported, registerBiometric, clearBiometricCredential } from '../lib/biometric'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  onReset: () => void
}

export function Config({ state, setState, onReset }: Props) {
  const [claudeKey, setClaudeKey] = useState(state.config.claudeKey)
  const [openaiKey, setOpenaiKey] = useState(state.config.openaiKey)
  const [stravaToken, setStravaToken] = useState(state.config.integrations?.stravaToken ?? '')
  const [stravaSyncing, setStravaSyncing] = useState(false)

  const selectProvider = (p: Provider) => setState(s => ({ ...s, config: { ...s.config, provider: p } }))
  const toggleNotif = (key: 'habits' | 'daily') => setState(s => ({ ...s, notif: { ...s.notif, [key]: !s.notif[key] } }))

  const [biometricLoading, setBiometricLoading] = useState(false)
  const biometricOn = Boolean(state.config.biometricEnabled)

  const toggleBiometric = async () => {
    if (biometricOn) {
      clearBiometricCredential()
      setState(s => ({ ...s, config: { ...s.config, biometricEnabled: false } }))
      toast('Desbloqueo con huella desactivado')
      return
    }
    if (!isBiometricSupported()) {
      toast('Tu dispositivo no soporta desbloqueo con huella')
      return
    }
    setBiometricLoading(true)
    try {
      const result = await registerBiometric()
      if (result.ok) {
        setState(s => ({ ...s, config: { ...s.config, biometricEnabled: true } }))
        toast('Desbloqueo con huella activado')
      } else {
        toast(result.error)
      }
    } finally {
      setBiometricLoading(false)
    }
  }

  const saveKeys = () => {
    setState(s => ({
      ...s,
      config: {
        ...s.config,
        claudeKey,
        openaiKey,
        integrations: { ...(s.config.integrations || {}), stravaToken: stravaToken.trim() || undefined },
      },
    }))
    toast('✅ Configuración guardada')
  }

  function decodeStravaPolyline(encoded: string): [number, number][] {
    let index = 0
    const len = encoded.length
    let lat = 0
    let lng = 0
    const coords: [number, number][] = []

    while (index < len) {
      let result = 0
      let shift = 0
      let b: number
      do {
        // eslint-disable-next-line no-bitwise
        b = encoded.charCodeAt(index++) - 63
        // eslint-disable-next-line no-bitwise
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      // eslint-disable-next-line no-bitwise
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1)
      lat += dlat

      result = 0
      shift = 0
      do {
        // eslint-disable-next-line no-bitwise
        b = encoded.charCodeAt(index++) - 63
        // eslint-disable-next-line no-bitwise
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      // eslint-disable-next-line no-bitwise
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1)
      lng += dlng

      coords.push([lat / 1e5, lng / 1e5])
    }

    return coords
  }

  const syncStrava = async () => {
    const token = stravaToken.trim() || state.config.integrations?.stravaToken
    if (!token) {
      toast('Añade primero tu token personal de Strava')
      return
    }
    try {
      setStravaSyncing(true)
      const res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 401) {
          toast('Token de Strava no válido o sin permisos')
        } else {
          toast('No se pudieron obtener las actividades de Strava')
        }
        return
      }
      const activities: any[] = await res.json()
      const runs = activities.filter(a => (a.sport_type || a.type) === 'Run')
      if (!runs.length) {
        toast('No se encontraron carreras en Strava')
        return
      }
      const imported: SportRoute[] = runs.map(a => {
        const id = `strava-${a.id}`
        const distanceKm = typeof a.distance === 'number' ? a.distance / 1000 : 0
        const start = (a.start_date_local || a.start_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
        const poly = a.map?.summary_polyline as string | undefined
        const points = poly
          ? decodeStravaPolyline(poly).map(([lat, lng], idx) => ({
              lat,
              lng,
              timestamp: new Date(a.start_date_local || a.start_date || Date.now()).getTime() + idx * 1000,
            }))
          : []
        return {
          id,
          points,
          distanceKm: Math.round(distanceKm * 1000) / 1000,
          startedAt: start,
          finishedAt: start,
        }
      })

      setState(s => {
        const existing = new Set(s.sportRoutes.map(r => r.id))
        const unique = imported.filter(r => !existing.has(r.id))
        if (!unique.length) {
          toast('Las carreras de Strava ya están importadas')
          return {
            ...s,
            config: {
              ...s.config,
              integrations: { ...(s.config.integrations || {}), stravaToken: token, stravaLastSync: new Date().toISOString() },
            },
          }
        }
        toast(`✅ Importadas ${unique.length} carreras de Strava`)
        return {
          ...s,
          sportRoutes: [...unique, ...s.sportRoutes],
          config: {
            ...s.config,
            integrations: { ...(s.config.integrations || {}), stravaToken: token, stravaLastSync: new Date().toISOString() },
          },
        }
      })
    } catch (e) {
      console.error(e)
      toast('Error al sincronizar con Strava')
    } finally {
      setStravaSyncing(false)
    }
  }

  const requestNotif = async () => {
    if (!('Notification' in window)) { toast('Tu navegador no soporta notificaciones'); return }
    const perm = await Notification.requestPermission()
    toast(perm === 'granted' ? '✅ Notificaciones activadas' : '❌ Permiso denegado')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mylife-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    toast('✅ Datos exportados')
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          setState(() => data)
          toast('✅ Datos importados correctamente')
        } catch { toast('❌ Archivo inválido') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleReset = () => {
    if (confirm('¿Borrar todos los datos? Esta acción no se puede deshacer.')) onReset()
  }

  const clearCache = async () => {
    try {
      // Limpiar cachés del navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      // Desregistrar Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
      }

      toast('✅ Caché limpiada. Recargando...')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      toast('❌ Error al limpiar caché')
      console.error(error)
    }
  }

  const providers: { id: Provider; label: string; desc: string }[] = [
    { id: 'claude', label: 'Claude (Anthropic)', desc: 'claude-haiku — Recomendado, sin restricciones CORS' },
    { id: 'openai', label: 'OpenAI', desc: 'gpt-4o-mini — Usa proxy CORS automático' },
  ]

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 24 }}>
        <div className="page-title">Configuración</div>
      </div>

      {/* Provider */}
      <Section title="Proveedor de IA">
        {providers.map(p => (
          <div
            key={p.id}
            onClick={() => selectProvider(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px',
              background: state.config.provider === p.id ? 'rgba(0,229,192,0.06)' : 'var(--surface)',
              border: `2px solid ${state.config.provider === p.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', transition: 'all .2s',
              marginBottom: 8,
            } as React.CSSProperties}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${state.config.provider === p.id ? 'var(--accent)' : 'var(--border2)'}`,
              background: state.config.provider === p.id ? 'var(--accent)' : 'transparent',
              flexShrink: 0, transition: 'all .2s'
            }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </Section>

      {/* API Keys */}
      <Section title="Claves API">
        <div className="input-group">
          <label className="input-label">Claude API Key</label>
          <input
            type="password"
            value={claudeKey}
            onChange={e => setClaudeKey(e.target.value)}
            placeholder="sk-ant-api03-..."
          />
        </div>
        <div className="input-group">
          <label className="input-label">OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-proj-..."
          />
        </div>
        <div style={{ padding: '10px 12px', background: 'rgba(0,229,192,0.06)', borderRadius: 8, borderLeft: '3px solid var(--accent)', fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
          💡 Las claves se guardan <strong style={{ color: 'var(--text)' }}>solo en tu dispositivo</strong>, nunca se envían a ningún servidor externo.
        </div>
        <button className="btn btn-primary btn-full" onClick={saveKeys}>Guardar configuración</button>
      </Section>

      {/* Integraciones */}
      <Section title="Integraciones">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>Strava</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
            Conecta tu cuenta de Strava usando un <strong>token de acceso personal</strong> para importar tus carreras como rutas en la sección Sports.
            El token se guarda <strong style={{ color: 'var(--text)' }}>solo en este dispositivo</strong>.
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Token personal de Strava</label>
          <input
            type="password"
            value={stravaToken}
            onChange={e => setStravaToken(e.target.value)}
            placeholder="ej: 0123456789abcdef..."
          />
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Puedes crear un token desde tu panel de desarrollador de Strava (My API Application → Create &amp; Manage Access Tokens).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={saveKeys}
            style={{ flex: 1, minWidth: 0 }}
          >
            💾 Guardar token
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={syncStrava}
            disabled={stravaSyncing}
            style={{ flex: 1.2, minWidth: 0 }}
          >
            {stravaSyncing ? 'Sincronizando…' : '⬇️ Importar carreras de Strava'}
          </button>
        </div>
        {state.config.integrations?.stravaLastSync && (
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
            Última sincronización: {new Date(state.config.integrations.stravaLastSync).toLocaleString()}
          </p>
        )}
      </Section>

      {/* Seguridad: huella y PIN */}
      <Section title="Seguridad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>Desbloquear con huella</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {isBiometricSupported() ? 'Al abrir la app deberás identificarte con el sensor de huella o con PIN' : 'No disponible en este dispositivo o navegador'}
            </div>
          </div>
          <div
            className={`toggle${biometricOn ? ' on' : ''}`}
            onClick={isBiometricSupported() && !biometricLoading ? toggleBiometric : undefined}
            style={biometricLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          />
        </div>
        {biometricLoading && (
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Registrando huella… Sigue las indicaciones del dispositivo.</p>
        )}
        {biometricOn && (
          <div className="input-group" style={{ marginTop: 12 }}>
            <label className="input-label">PIN de desbloqueo (4 dígitos)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]*"
              value={state.config.unlockPin ?? ''}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                setState(s => ({ ...s, config: { ...s.config, unlockPin: v } }))
              }}
              placeholder="ej: 1234"
            />
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>Alternativa a la huella al desbloquear la app.</p>
          </div>
        )}
      </Section>

      {/* Theme */}
      <Section title="Apariencia">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>Modo claro</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Cambiar entre tema claro y oscuro</div>
          </div>
          <div className={`toggle${state.theme === 'light' ? ' on' : ''}`} onClick={() => setState(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 10 }}>Color del tema</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ACCENT_COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setState(s => ({ ...s, accentColor: c.hex }))}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: c.hex,
                  border: (state.accentColor || '#00e5c0') === c.hex ? '3px solid var(--text)' : '2px solid var(--border)',
                  boxShadow: (state.accentColor || '#00e5c0') === c.hex ? '0 0 0 2px var(--bg)' : 'none',
                  cursor: 'pointer',
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notificaciones">
        {[
          { key: 'habits' as const, label: 'Recordatorio de hábitos', sub: 'Cada día a las 20:00' },
          { key: 'daily' as const, label: 'Resumen diario', sub: 'Cada mañana a las 9:00' },
        ].map(n => (
          <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{n.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{n.sub}</div>
            </div>
            <div className={`toggle${state.notif[n.key] ? ' on' : ''}`} onClick={() => toggleNotif(n.key)} />
          </div>
        ))}
        <button className="btn btn-ghost btn-full" style={{ marginTop: 4 }} onClick={requestNotif}>
          🔔 Activar permisos de notificación
        </button>
      </Section>

      {/* Data */}
      <Section title="Datos">
        <div className="grid-2" style={{ marginBottom: 8 }}>
          <button className="btn btn-ghost" onClick={exportData}>📤 Exportar</button>
          <button className="btn btn-ghost" onClick={importData}>📥 Importar</button>
        </div>
        <button className="btn btn-ghost btn-full" onClick={clearCache} style={{ marginBottom: 8 }}>
          🗑️ Limpiar caché de aplicación
        </button>
        <button className="btn btn-danger btn-full" onClick={handleReset}>⚠️ Borrar todos los datos</button>
      </Section>

      <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, padding: '20px 0' }}>
        MyLife v1.0 · Datos guardados localmente en tu dispositivo
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>{title}</div>
      {children}
    </div>
  )
}
