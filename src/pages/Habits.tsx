import { useState } from 'react'
import { AppState, Habit } from '../types'
import { uid, todayStr } from '../hooks/useStore'
import { Modal } from '../components/Modal'
import { toast } from '../components/Toast'

interface Props { state: AppState; setState: (fn: (s: AppState) => AppState) => void }

const EMOJIS = ['⚡', '💧', '📚', '🏃', '🧘', '🍎', '💊', '✍️', '🎯', '🌿', '💪', '🧹', '😴', '🚴', '🧠']

function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
}

function getStreak(logs: string[], t: string): number {
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

export function Habits({ state, setState }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '⚡' })
  const t = todayStr()
  const days14 = getLast14Days()
  const done = state.habits.filter(h => (state.habitLogs[h.id] || []).includes(t)).length

  const toggleToday = (id: string) => {
    setState(s => {
      const logs = [...(s.habitLogs[id] || [])]
      const idx = logs.indexOf(t)
      if (idx >= 0) logs.splice(idx, 1)
      else logs.push(t)
      return { ...s, habitLogs: { ...s.habitLogs, [id]: logs } }
    })
  }

  const deleteHabit = (id: string) => {
    setState(s => {
      const logs = { ...s.habitLogs }
      delete logs[id]
      return { ...s, habits: s.habits.filter(h => h.id !== id), habitLogs: logs }
    })
  }

  const save = () => {
    if (!form.name.trim()) { toast('Introduce un nombre'); return }
    setState(s => ({ ...s, habits: [...s.habits, { id: uid(), name: form.name.trim(), emoji: form.emoji, createdAt: t }] }))
    setShowModal(false)
    setForm({ name: '', emoji: '⚡' })
    toast('✅ Hábito añadido')
  }

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Hábitos</div>
        <div className="page-sub">{done} de {state.habits.length} completados hoy</div>
      </div>

      {!state.habits.length
        ? <div className="empty-state"><div className="empty-icon">🌟</div><div>Añade tu primer hábito</div></div>
        : state.habits.map(h => {
          const logs = state.habitLogs[h.id] || []
          const doneToday = logs.includes(t)
          const streak = getStreak(logs, t)
          return (
            <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'DM Sans, sans-serif' }}>{h.emoji} {h.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {streak > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(251,191,36,0.12)', color: 'var(--warning)', padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                      🔥 {streak}
                    </div>
                  )}
                  <button onClick={() => deleteHabit(h.id)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {days14.map(d => {
                  const isDone = logs.includes(d)
                  const isT = d === t
                  return (
                    <div key={d} className={`habit-dot${isDone ? ' done' : ''}${isT ? ' today-dot' : ''}`}>
                      {new Date(d + 'T12:00').getDate()}
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => toggleToday(h.id)}
                style={{
                  width: '100%', padding: 10,
                  border: doneToday ? '1px solid var(--accent)' : '1px dashed var(--border2)',
                  borderRadius: 'var(--radius-sm)',
                  background: doneToday ? 'rgba(0,229,192,0.1)' : 'transparent',
                  color: doneToday ? 'var(--accent)' : 'var(--text2)',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                  cursor: 'pointer', transition: 'all .2s',
                  fontWeight: doneToday ? 600 : 400,
                }}
              >
                {doneToday ? '✅ Completado hoy' : '☐ Marcar como completado hoy'}
              </button>
            </div>
          )
        })
      }

      <button className="fab" onClick={() => setShowModal(true)}>+</button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal-title">Nuevo hábito</div>
          <div className="input-group">
            <label className="input-label">Nombre</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Beber 2L de agua" onKeyDown={e => e.key === 'Enter' && save()} />
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
          <button className="btn btn-primary btn-full" onClick={save}>Crear hábito</button>
        </Modal>
      )}
    </div>
  )
}
