import { useState } from 'react'
import { AppState, Habit } from '../types'
import { uid, todayStr } from '../hooks/useStore'
import { Modal } from '../components/Modal'
import { toast } from '../components/Toast'
import { Sports } from './Sports'

type HabitsSubPage = 'habits' | 'sports'

interface Props { state: AppState; setState: (fn: (s: AppState) => AppState) => void }

const EMOJIS = ['⚡', '💧', '📚', '🏃', '🧘', '🍎', '💊', '✍️', '🎯', '🌿', '💪', '🧹', '😴', '🚴', '🧠']

function getDaysEndingOn(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00')
  return Array.from({ length: 14 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() - (13 - i))
    return x.toISOString().split('T')[0]
  })
}

function getStreak(logs: string[], upToDate: string): number {
  let streak = 0
  const d = new Date(upToDate + 'T12:00:00')
  if (!logs.includes(upToDate)) d.setDate(d.getDate() - 1)
  while (true) {
    const ds = d.toISOString().split('T')[0]
    if (logs.includes(ds)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const t = todayStr()
  if (dateStr === t) return 'Hoy'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Ayer'
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function Habits({ state, setState }: Props) {
  const t = todayStr()
  const [subPage, setSubPage] = useState<HabitsSubPage>('habits')
  const [selectedDate, setSelectedDate] = useState(t)
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [form, setForm] = useState({ name: '', emoji: '⚡', daysPerWeek: 5 })

  const days14 = getDaysEndingOn(selectedDate)
  const isToday = selectedDate === t
  const doneCount = state.habits.filter(h => (state.habitLogs[h.id] || []).includes(selectedDate)).length

  const goPrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const goNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const next = d.toISOString().split('T')[0]
    if (next > t) return
    setSelectedDate(next)
  }

  const toggleDay = (habitId: string, dateStr: string) => {
    setState(s => {
      const logs = [...(s.habitLogs[habitId] || [])]
      const idx = logs.indexOf(dateStr)
      if (idx >= 0) logs.splice(idx, 1)
      else logs.push(dateStr)
      return { ...s, habitLogs: { ...s.habitLogs, [habitId]: logs } }
    })
  }

  const deleteHabit = (id: string) => {
    setState(s => {
      const logs = { ...s.habitLogs }
      delete logs[id]
      return { ...s, habits: s.habits.filter(h => h.id !== id), habitLogs: logs }
    })
    setEditingHabit(null)
  }

  const openEdit = (h: Habit) => {
    setEditingHabit(h)
    setForm({ name: h.name, emoji: h.emoji, daysPerWeek: h.daysPerWeek ?? 5 })
  }

  const saveNew = () => {
    if (!form.name.trim()) { toast('Introduce un nombre'); return }
    const daysPerWeek = form.daysPerWeek >= 1 && form.daysPerWeek <= 7 ? form.daysPerWeek : undefined
    setState(s => ({
      ...s,
      habits: [...s.habits, { id: uid(), name: form.name.trim(), emoji: form.emoji, daysPerWeek, createdAt: t }]
    }))
    setShowModal(false)
    setForm({ name: '', emoji: '⚡', daysPerWeek: 5 })
    toast('✅ Hábito añadido')
  }

  const saveEdit = () => {
    if (!editingHabit || !form.name.trim()) return
    const daysPerWeek = form.daysPerWeek >= 1 && form.daysPerWeek <= 7 ? form.daysPerWeek : undefined
    setState(s => ({
      ...s,
      habits: s.habits.map(h => h.id === editingHabit.id ? { ...h, name: form.name.trim(), emoji: form.emoji, daysPerWeek } : h)
    }))
    setEditingHabit(null)
    setForm({ name: '', emoji: '⚡', daysPerWeek: 5 })
    toast('✅ Hábito actualizado')
  }

  return (
    <div className="page-wrap habits-page">
      <div className="habits-sports-tabs">
        <button type="button" className={`habits-sports-tab${subPage === 'habits' ? ' active' : ''}`} onClick={() => setSubPage('habits')}>Hábitos</button>
        <button type="button" className={`habits-sports-tab${subPage === 'sports' ? ' active' : ''}`} onClick={() => setSubPage('sports')}>Sports</button>
      </div>
      {subPage === 'sports' ? (
        <div className="habits-sports-content">
          <Sports state={state} setState={setState} />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div className="page-title">Hábitos</div>
            <div className="page-sub">{doneCount} de {state.habits.length} completados</div>
          </div>

      {/* Navegación por día */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" className="btn btn-ghost btn-icon" onClick={goPrevDay} aria-label="Día anterior">
          ←
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{formatDayLabel(selectedDate)}</div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={goNextDay} disabled={selectedDate >= t} aria-label="Día siguiente">
          →
        </button>
      </div>

      {!state.habits.length ? (
        <div className="empty-state"><div className="empty-icon">🌟</div><div>Añade tu primer hábito</div></div>
      ) : (
        state.habits.map(h => {
          const logs = state.habitLogs[h.id] || []
          const doneOnSelected = logs.includes(selectedDate)
          const streak = getStreak(logs, selectedDate)
          return (
            <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 10 }}>
              <div className="habit-card-header">
                <div className="habit-card-title">{h.emoji} {h.name}</div>
                <div className="habit-card-meta">
                  {h.daysPerWeek != null && (
                    <span className="habit-card-goal">Objetivo: {h.daysPerWeek}/sem</span>
                  )}
                  {streak > 0 && (
                    <span className="habit-card-streak">🔥 {streak}</span>
                  )}
                  <button type="button" onClick={() => openEdit(h)} className="habit-card-btn" aria-label="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" onClick={() => deleteHabit(h.id)} className="habit-card-btn habit-card-btn-x">×</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {days14.map(d => {
                  const isDone = logs.includes(d)
                  const isSelected = d === selectedDate
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`habit-dot${isDone ? ' done' : ''}${isSelected ? ' today-dot' : ''}`}
                      onClick={() => toggleDay(h.id, d)}
                      title={d}
                    >
                      {new Date(d + 'T12:00').getDate()}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => toggleDay(h.id, selectedDate)}
                style={{
                  width: '100%', padding: 10,
                  border: doneOnSelected ? '1px solid var(--accent)' : '1px dashed var(--border2)',
                  borderRadius: 'var(--radius-sm)',
                  background: doneOnSelected ? 'rgba(0,229,192,0.1)' : 'transparent',
                  color: doneOnSelected ? 'var(--accent)' : 'var(--text2)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                  cursor: 'pointer', transition: 'all .2s',
                  fontWeight: doneOnSelected ? 600 : 400,
                }}
              >
                {doneOnSelected ? '✅ Completado' : `☐ Marcar como completado (${formatDayLabel(selectedDate)})`}
              </button>
            </div>
          )
        })
      )}

      <button className="fab" onClick={() => { setEditingHabit(null); setForm({ name: '', emoji: '⚡', daysPerWeek: 5 }); setShowModal(true) }}>+</button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal-title">Nuevo hábito</div>
          <div className="input-group">
            <label className="input-label">Nombre</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Beber 2L de agua" onKeyDown={e => e.key === 'Enter' && saveNew()} />
          </div>
          <div className="input-group">
            <label className="input-label">Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {EMOJIS.map(e => (
                <span key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{
                  fontSize: 24, cursor: 'pointer', padding: 6,
                  borderRadius: 8, background: form.emoji === e ? 'var(--surface2)' : 'transparent',
                  border: form.emoji === e ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'all .15s'
                }}>{e}</span>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Días por semana (objetivo)</label>
            <select value={form.daysPerWeek} onChange={e => setForm(f => ({ ...f, daysPerWeek: +e.target.value }))}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'día' : 'días'}/semana</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={saveNew}>Crear hábito</button>
        </Modal>
      )}

      {editingHabit && (
        <Modal onClose={() => setEditingHabit(null)}>
          <div className="modal-title">Editar hábito</div>
          <div className="input-group">
            <label className="input-label">Nombre</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del hábito" onKeyDown={e => e.key === 'Enter' && saveEdit()} />
          </div>
          <div className="input-group">
            <label className="input-label">Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {EMOJIS.map(e => (
                <span key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{
                  fontSize: 24, cursor: 'pointer', padding: 6,
                  borderRadius: 8, background: form.emoji === e ? 'var(--surface2)' : 'transparent',
                  border: form.emoji === e ? '1px solid var(--accent)' : '1px solid transparent',
                  transition: 'all .15s'
                }}>{e}</span>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Días por semana (objetivo)</label>
            <select value={form.daysPerWeek} onChange={e => setForm(f => ({ ...f, daysPerWeek: +e.target.value }))}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'día' : 'días'}/semana</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit}>Guardar</button>
            <button className="btn btn-ghost" onClick={() => deleteHabit(editingHabit.id)}>Eliminar</button>
          </div>
        </Modal>
      )}
        </>
      )}
    </div>
  )
}
