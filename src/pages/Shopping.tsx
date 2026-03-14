import { useState } from 'react'
import { AppState } from '../types'
import { uid } from '../hooks/useStore'
import { toast } from '../components/Toast'

interface Props { state: AppState; setState: (fn: (s: AppState) => AppState) => void }

export function Shopping({ state, setState }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  const pending = state.shoppingList.filter(s => !s.done).length

  const add = () => {
    if (!name.trim()) return
    setState(s => ({ ...s, shoppingList: [...s.shoppingList, { id: uid(), name: name.trim(), qty, done: false }] }))
    setName(''); setQty('')
  }

  const toggle = (id: string) => setState(s => ({ ...s, shoppingList: s.shoppingList.map(i => i.id === id ? { ...i, done: !i.done } : i) }))
  const remove = (id: string) => setState(s => ({ ...s, shoppingList: s.shoppingList.filter(i => i.id !== id) }))
  const clearDone = () => setState(s => ({ ...s, shoppingList: s.shoppingList.filter(i => !i.done) }))
  const clearAll = () => { if (confirm('¿Vaciar toda la lista?')) setState(s => ({ ...s, shoppingList: [] })) }

  const sorted = [...state.shoppingList].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Lista de la Compra</div>
        <div className="page-sub">{pending} pendiente{pending !== 1 ? 's' : ''}</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Añadir producto..." style={{ margin: 0 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <input value={qty} onChange={e => setQty(e.target.value)} placeholder="Cant." style={{ margin: 0, width: 80 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn btn-primary" onClick={add}>+</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={clearDone}>Limpiar tachados</button>
        <button className="btn btn-ghost btn-sm" onClick={clearAll}>Vaciar todo</button>
      </div>

      {!state.shoppingList.length
        ? <div className="empty-state"><div className="empty-icon">🛒</div><div>La lista está vacía</div></div>
        : sorted.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6, opacity: item.done ? .4 : 1, transition: 'opacity .2s' }}>
            <div className={`checkbox${item.done ? ' checked' : ''}`} onClick={() => toggle(item.id)}>
              {item.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={13} height={13}><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <span style={{ flex: 1, fontSize: 15, textDecoration: item.done ? 'line-through' : 'none' }}>{item.name}</span>
            {item.qty && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.qty}</span>}
            <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        ))
      }
    </div>
  )
}
