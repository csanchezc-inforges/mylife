import { useState } from 'react'
import { AppState, Priority, Task, TaskEnvironment, TASK_ENVIRONMENTS } from '../types'
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

const defaultForm = () => ({ name: '', priority: 'mid' as Priority, due: '', category: '', environment: 'personal' as TaskEnvironment })

export function Tasks({ state, setState }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [envFilter, setEnvFilter] = useState<TaskEnvironment | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm())

  const pending = state.tasks.filter(t => !t.done).length

  const tasksWithEnv = state.tasks.map(t => ({ ...t, environment: (t as Task & { environment?: TaskEnvironment }).environment || 'personal' }))
  const filtered = tasksWithEnv
    .filter(t => {
      const envOk = envFilter === 'all' || t.environment === envFilter
      const statusOk = filter === 'all' ? true : filter === 'pending' ? !t.done : filter === 'done' ? t.done : t.priority === 'high' && !t.done
      return envOk && statusOk
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const p: Record<Priority, number> = { high: 0, mid: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    })

  const toggle = (id: string) => setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }))
  const remove = (id: string) => setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))

  const openEdit = (task: Task & { environment?: TaskEnvironment }) => {
    setEditingId(task.id)
    setForm({
      name: task.name,
      priority: task.priority,
      due: task.due || '',
      category: task.category || '',
      environment: (task.environment || 'personal') as TaskEnvironment,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(defaultForm())
  }

  const save = () => {
    if (!form.name.trim()) { toast('Introduce un nombre'); return }
    if (editingId) {
      setState(s => ({
        ...s,
        tasks: s.tasks.map(t =>
          t.id === editingId
            ? { ...t, name: form.name.trim(), priority: form.priority, due: form.due, category: form.category, environment: form.environment }
            : t
        ),
      }))
      toast('✅ Tarea actualizada')
    } else {
      setState(s => ({
        ...s,
        tasks: [...s.tasks, { id: uid(), name: form.name.trim(), priority: form.priority, due: form.due, category: form.category, environment: form.environment, done: false, createdAt: todayStr() }],
      }))
      toast('✅ Tarea añadida')
    }
    closeModal()
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

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Entorno</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={`cat-pill${envFilter === 'all' ? ' active' : ''}`} onClick={() => setEnvFilter('all')}>Todos</span>
          {TASK_ENVIRONMENTS.map(e => (
            <span key={e.id} className={`cat-pill${envFilter === e.id ? ' active' : ''}`} onClick={() => setEnvFilter(e.id)}>{e.emoji} {e.label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {filters.map(f => (
          <span key={f.id} className={`cat-pill${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</span>
        ))}
      </div>

      {!filtered.length
        ? <div className="empty-state"><div className="empty-icon">✅</div><div>Sin tareas en esta categoría</div></div>
        : filtered.map(task => {
          const env = TASK_ENVIRONMENTS.find(e => e.id === (task.environment || 'personal'))
          return (
            <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, opacity: task.done ? .45 : 1 }}>
              <div className={`checkbox${task.done ? ' checked' : ''}`} style={{ marginTop: 1 }} onClick={() => toggle(task.id)}>
                {task.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={13} height={13}><path d="M20 6L9 17l-5-5"/></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => openEdit(task)}>
                <div style={{ fontSize: 15, fontWeight: 500, textDecoration: task.done ? 'line-through' : 'none' }}>{task.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{env?.emoji} {env?.label}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{PRIORITY_LABELS[task.priority]}</span>
                  {task.due && <span style={{ fontSize: 12, color: 'var(--text2)' }}>· {formatDate(task.due)}</span>}
                  {task.category && <span className="chip chip-purple" style={{ fontSize: 11, padding: '1px 7px' }}>{task.category}</span>}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); openEdit(task) }} style={{ padding: 6 }} aria-label="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              <button type="button" onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, padding: '0 4px' }} aria-label="Eliminar">×</button>
            </div>
          )
        })
      }

      <button className="fab" onClick={() => { setEditingId(null); setForm(defaultForm()); setShowModal(true) }}>+</button>

      {showModal && (
        <Modal onClose={closeModal}>
          <div className="modal-title">{editingId ? 'Editar tarea' : 'Nueva tarea'}</div>
          <div className="input-group">
            <label className="input-label">Tarea</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="¿Qué tienes que hacer?" onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
          <div className="input-group">
            <label className="input-label">Entorno</label>
            <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value as TaskEnvironment }))}>
              {TASK_ENVIRONMENTS.map(e => <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
            </select>
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
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="ej: Proyecto X..." />
          </div>
          <button className="btn btn-primary btn-full" onClick={save}>{editingId ? 'Guardar cambios' : 'Añadir tarea'}</button>
        </Modal>
      )}
    </div>
  )
}
