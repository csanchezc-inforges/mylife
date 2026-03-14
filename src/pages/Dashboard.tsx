import { useState, useEffect } from 'react'
import { AppState } from '../types'
import { todayStr, daysInMonth, formatDate } from '../hooks/useStore'

interface Props {
  state: AppState
  onToggleHabit: (id: string) => void
  onNavigate: (p: string) => void
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Despejado'
  if (code <= 3) return 'Nubes'
  if (code <= 49) return 'Niebla'
  if (code <= 67) return 'Lluvia'
  if (code <= 77) return 'Nieve'
  if (code <= 82) return 'Chubascos'
  if (code <= 86) return 'Nieve'
  if (code <= 99) return 'Tormenta'
  return 'Variable'
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return code === 1 ? '🌤' : code === 2 ? '⛅' : '☁️'
  if (code <= 49) return '🌫'
  if (code <= 67) return '🌧'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦'
  if (code <= 86) return '❄️'
  if (code <= 99) return '⛈'
  return '🌡'
}

export function Dashboard({ state, onToggleHabit, onNavigate }: Props) {
  const [weather, setWeather] = useState<{ temp: number; code: number; city?: string } | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          )
          const data = await res.json()
          if (data.current) {
            let city: string | undefined
            try {
              const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`)
              const geoData = await geo.json()
              city = geoData.results?.[0]?.name
            } catch {}
            setWeather({
              temp: Math.round(data.current.temperature_2m),
              code: data.current.weather_code,
              city,
            })
          }
        } catch {
          setWeatherError('Sin datos')
        }
      },
      () => setWeatherError('Sin ubicación')
    )
  }, [])

  const now = new Date()
  const hrs = now.getHours()
  const greet = hrs < 13 ? 'Buenos días' : hrs < 20 ? 'Buenas tardes' : 'Buenas noches'
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const t = todayStr()
  const monthStr = t.slice(0, 7)
  const daysM = daysInMonth(now.getFullYear(), now.getMonth() + 1)
  const daily = state.budget.monthly > 0 ? state.budget.monthly / daysM : 0
  const todayExp = state.expenses.filter(e => e.date === t).reduce((a, b) => a + b.amount, 0)
  const monthExp = state.expenses.filter(e => e.date.startsWith(monthStr)).reduce((a, b) => a + b.amount, 0)
  const diffDay = daily - todayExp
  const pct = state.budget.monthly > 0 ? Math.min(100, (monthExp / state.budget.monthly) * 100) : 0

  const pendTasks = state.tasks.filter(t2 => !t2.done).length
  const habitsToday = state.habits.filter(h => (state.habitLogs[h.id] || []).includes(t)).length
  const shopPend = state.shoppingList.filter(s => !s.done).length

  const todayMenu = state.menuPlan[t]
  const topTasks = state.tasks.filter(t2 => !t2.done).slice(0, 4)

  const getStreak = (id: string) => {
    const logs = state.habitLogs[id] || []
    let streak = 0
    const d = new Date()
    if (!logs.includes(t)) d.setDate(d.getDate() - 1)
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if (logs.includes(ds)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }

  const mealLabels: Record<string, string> = { breakfast: '☀️ Desayuno', lunch: '🌤 Comida', dinner: '🌙 Cena' }

  return (
    <div className="page-wrap">
      {/* Greeting + Clima */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{greet} 👋</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{dateStr}</div>
        </div>
        {(weather || weatherError) && (
          <div className="weather-widget">
            {weather ? (
              <>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{weatherEmoji(weather.code)}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{weather.temp}°</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>{weatherLabel(weather.code)}{weather.city ? ` · ${weather.city}` : ''}</div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{weatherError}</div>
            )}
          </div>
        )}
      </div>

      {/* Budget hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,192,0.1) 0%, rgba(167,139,250,0.08) 100%)',
        border: '1px solid rgba(0,229,192,0.2)',
        borderRadius: 'var(--radius)', padding: 20, marginBottom: 16, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Diferencial hoy</div>
        <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', color: diffDay >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
          {diffDay >= 0 ? '+' : ''}{diffDay.toFixed(2)} €
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          {daily > 0 ? `Objetivo diario: ${daily.toFixed(2)} €` : 'Configura tu presupuesto mensual'}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
            {monthExp.toFixed(2)} € de {state.budget.monthly > 0 ? state.budget.monthly + ' €' : '—'} este mes
          </div>
          <div className="progress-wrap">
            <div className="progress-bar" style={{
              width: pct + '%',
              background: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--accent)'
            }} />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Tareas', value: pendTasks },
          { label: 'Hábitos', value: `${habitsToday}/${state.habits.length}` },
          { label: 'Compra', value: shopPend },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu today */}
      <div className="section-label">Menú de hoy</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {todayMenu && (todayMenu.breakfast || todayMenu.lunch || todayMenu.dinner) ? (
          (['breakfast', 'lunch', 'dinner'] as const).map(m =>
            todayMenu[m] ? (
              <div key={m} style={{ display: 'flex', gap: 10, padding: '5px 0' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13, width: 80 }}>{mealLabels[m]}</span>
                <span style={{ fontSize: 14 }}>{todayMenu[m]}</span>
              </div>
            ) : null
          )
        ) : (
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>
            Sin menú para hoy ·{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNavigate('food#menu')}>Planificar</span>
          </div>
        )}
      </div>

      {/* Habits today */}
      <div className="section-label">Hábitos de hoy</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {!state.habits.length ? (
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>
            Sin hábitos ·{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNavigate('habits')}>Añadir</span>
          </div>
        ) : state.habits.map(h => {
          const done = (state.habitLogs[h.id] || []).includes(t)
          const streak = getStreak(h.id)
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className={`checkbox${done ? ' checked' : ''}`} onClick={() => onToggleHabit(h.id)}>
                {done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={13} height={13}><path d="M20 6L9 17l-5-5"/></svg>}
              </div>
              <span style={{ flex: 1, fontSize: 14 }}>{h.emoji} {h.name}</span>
              {streak > 0 && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--warning)' }}>🔥{streak}</span>}
            </div>
          )
        })}
      </div>

      {/* Top tasks */}
      <div className="section-label">Tareas pendientes</div>
      {!topTasks.length ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text2)' }}>Sin tareas pendientes 🎉</div>
      ) : topTasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: task.priority === 'high' ? 'var(--danger)' : task.priority === 'mid' ? 'var(--warning)' : 'var(--accent)' }} />
          <span style={{ flex: 1, fontSize: 14 }}>{task.name}</span>
          {task.due && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(task.due)}</span>}
        </div>
      ))}
    </div>
  )
}
