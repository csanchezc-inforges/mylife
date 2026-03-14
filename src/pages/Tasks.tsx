import { useState } from 'react'
import { AppState, Priority, Task } from '../types'
import { uid, todayStr, formatDate } from '../hooks/useStore'
import { Modal } from '../components/Modal'
import { toast } from '../components/Toast'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  showFab?: boolean
}

type Filter = 'all' | 'pending' | 'done' | 'high'

const PRIORITY_COLORS: Record<Priority, string> = { high: 'var(--danger)', mid: 'var(--warning)', low: 'var(--accent)' }
const PRIORITY_LABELS: Record<Priority, string> = { high: 'Urgente', mid: 'Normal', low: 'Baja' }

export function Tasks({ state, setState }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', priority: 'mid' as Priority, due: '', category: '' })

  const pending = state.tasks.filter(t => !t.done).length

  const filtered = state.tasks
    .filter(t => filter === 'all' ? true : filter === 'pending' ? !t.done : filter === 'done' ? t.done : t.priority === 'high' && !t.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const p: Record<Priority, number> = { high: 0, mid: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    })

  const toggle = (id: string) => setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }))
  const remove = (id: string) => setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))

  const save = () => {
    if (!form.name.trim()) { toast('Introduce un nombre'); return }
    setState(s => ({ ...s, tasks: [...s.tasks, { id: uid(), ...form, name: form.name.trim(), done: false, createdAt: todayStr() }] }))
    setShowModal(false)
    setForm({ name: '', priority: 'mid', due: '', category: '' })
    toast('✅ Tarea añadida')
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'done', label: 'Hechas' },
    { id: 'high', label: '🔴 Urgentes' },
  ]

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Tareas</div>
        <div className="page-sub">{pending} pendiente{pending !== 1 ? 's' : ''}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map(f => (
          <span key={f.id} className={`cat-pill${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</span>
        ))}
      </div>

      {!filtered.length
        ? <div className="empty-state"><div className="empty-icon">✅</div><div>Sin tareas en esta categoría</div></div>
        : filtered.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, opacity: task.done ? .45 : 1 }}>
            <div className={`checkbox${task.done ? ' checked' : ''}`} style={{ marginTop: 1 }} onClick={() => toggle(task.id)}>
              {task.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={13} height={13}><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500, textDecoration: task.done ? 'line-through' : 'none' }}>{task.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] }} />
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{PRIORITY_LABELS[task.priority]}</span>
                {task.due && <span style={{ fontSize: 12, color: 'var(--text2)' }}>· {formatDate(task.due)}</span>}
                {task.category && <span className="chip chip-purple" style={{ fontSize: 11, padding: '1px 7px' }}>{task.category}</span>}
              </div>
            </div>
            <button onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>×</button>
          </div>
        ))
      }

      <button className="fab" onClick={() => setShowModal(true)}>+</button>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal-title">Nueva tarea</div>
          <div className="input-group">
            <label className="input-label">Tarea</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="¿Qué tienes que hacer?" onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Prioridad</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                <option value="high">🔴 Urgente</option>
                <option value="mid">🟡 Normal</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Fecha límite</label>
              <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Categoría (opcional)</label>
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="ej: Trabajo, Personal..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={save}>Añadir tarea</button>
        </Modal>
      )}
    </div>
  )
}
