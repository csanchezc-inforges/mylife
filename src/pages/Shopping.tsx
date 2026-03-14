import { useState } from 'react'
import { AppState } from '../types'
import { uid } from '../hooks/useStore'
import { toast } from '../components/Toast'

interface Props { state: AppState; setState: (fn: (s: AppState) => AppState) => void }

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} width={20} height={20}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

export function Shopping({ state, setState }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  const pending = state.shoppingList.filter(s => !s.done).length
  const favorites = [...(state.shoppingFavorites || [])].sort((a, b) => a.localeCompare(b, 'es'))

  const add = () => {
    if (!name.trim()) return
    setState(s => ({ ...s, shoppingList: [...s.shoppingList, { id: uid(), name: name.trim(), qty, done: false }] }))
    setName(''); setQty('')
  }

  const toggle = (id: string) => setState(s => ({ ...s, shoppingList: s.shoppingList.map(i => i.id === id ? { ...i, done: !i.done } : i) }))
  const remove = (id: string) => setState(s => ({ ...s, shoppingList: s.shoppingList.filter(i => i.id !== id) }))
  const clearDone = () => setState(s => ({ ...s, shoppingList: s.shoppingList.filter(i => !i.done) }))
  const clearAll = () => { if (confirm('¿Vaciar toda la lista?')) setState(s => ({ ...s, shoppingList: [] })) }

  const toggleFavorite = (itemName: string) => {
    setState(s => {
      const fav = s.shoppingFavorites || []
      const idx = fav.findIndex(n => n.toLowerCase() === itemName.toLowerCase())
      const next = idx >= 0 ? fav.filter((_, i) => i !== idx) : [...fav, itemName]
      return { ...s, shoppingFavorites: next }
    })
    toast((state.shoppingFavorites || []).some(n => n.toLowerCase() === itemName.toLowerCase()) ? 'Quitado de habituales' : 'Añadido a habituales')
  }

  const addFromFavorite = (itemName: string) => {
    setState(s => ({ ...s, shoppingList: [...s.shoppingList, { id: uid(), name: itemName, qty: '', done: false }] }))
    toast(`"${itemName}" añadido a la lista`)
  }

  const copyList = async () => {
    if (!state.shoppingList.length) { toast('La lista está vacía'); return }
    const pendingFirst = [...state.shoppingList].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
    const lines = pendingFirst.map(i => {
      const qty = i.qty?.trim() ? ` (${i.qty})` : ''
      return `${i.done ? '✓' : '•'} ${i.name}${qty}`
    })
    const text = `🛒 Lista de la compra\n\n${lines.join('\n')}`
    try {
      await navigator.clipboard.writeText(text)
      toast('✅ Lista copiada al portapapeles')
    } catch {
      toast('No se pudo copiar')
    }
  }

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copyList}>📋 Copiar lista</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearDone}>Limpiar tachados</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>Vaciar todo</button>
      </div>

      {!state.shoppingList.length
        ? <div className="empty-state"><div className="empty-icon">🛒</div><div>La lista está vacía</div></div>
        : sorted.map(item => {
          const isFav = (state.shoppingFavorites || []).some(n => n.toLowerCase() === item.name.toLowerCase())
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6, opacity: item.done ? .4 : 1, transition: 'opacity .2s' }}>
              <div className={`checkbox${item.done ? ' checked' : ''}`} onClick={() => toggle(item.id)}>
                {item.done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={13} height={13}><path d="M20 6L9 17l-5-5"/></svg>}
              </div>
              <span style={{ flex: 1, fontSize: 15, textDecoration: item.done ? 'line-through' : 'none' }}>{item.name}</span>
              {item.qty && <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.qty}</span>}
              <button type="button" onClick={() => toggleFavorite(item.name)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: isFav ? 'var(--warning)' : 'var(--text2)' }} title={isFav ? 'Quitar de habituales' : 'Añadir a habituales'}><StarIcon filled={isFav} /></button>
              <button type="button" onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18 }} aria-label="Eliminar">×</button>
            </div>
          )
        })
      }

      {favorites.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24, marginBottom: 10 }}>Habituales</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>Toca para volver a añadir a la lista</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {favorites.map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ flex: 1, fontSize: 15 }}>{n}</span>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => addFromFavorite(n)}>Añadir</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
