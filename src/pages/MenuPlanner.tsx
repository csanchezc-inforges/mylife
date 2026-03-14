import { useState } from 'react'
import { AppState, MealSlot } from '../types'
import { getWeekDates, uid, todayStr } from '../hooks/useStore'
import { Modal } from '../components/Modal'
import { toast } from '../components/Toast'

interface Props { state: AppState; setState: (fn: (s: AppState) => AppState) => void }

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MEALS: Record<MealSlot, string> = { breakfast: '☀️ Desat.', lunch: '🍽 Comida', dinner: '🌙 Cena' }

export function MenuPlanner({ state, setState }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [editing, setEditing] = useState<{ date: string; meal: MealSlot } | null>(null)
  const [mealInput, setMealInput] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState('')

  const dates = getWeekDates(weekOffset)
  const t = todayStr()
  const startDate = new Date(dates[0] + 'T12:00')
  const endDate = new Date(dates[6] + 'T12:00')

  const openEdit = (date: string, meal: MealSlot) => {
    setEditing({ date, meal })
    setMealInput(state.menuPlan[date]?.[meal] || '')
    setSelectedRecipe('')
  }

  const saveMeal = (del = false) => {
    if (!editing) return
    const { date, meal } = editing
    setState(s => {
      const plan = { ...s.menuPlan }
      if (!plan[date]) plan[date] = {}
      if (del) { delete plan[date][meal] }
      else if (mealInput.trim()) plan[date][meal] = mealInput.trim()
      return { ...s, menuPlan: plan }
    })
    setEditing(null)
    toast(del ? 'Plato eliminado' : '✅ Menú guardado')
  }

  const addMenuToShop = () => {
    let count = 0
    dates.forEach(d => {
      const menu = state.menuPlan[d]
      if (!menu) return
      Object.values(menu).forEach(meal => {
        const recipe = state.recipes.find(r => r.name === meal)
        if (recipe) {
          recipe.ingredients.forEach(i => {
            setState(s => ({ ...s, shoppingList: [...s.shoppingList, { id: uid(), name: i.name, qty: i.amount, done: false, source: 'menu' }] }))
            count++
          })
        }
      })
    })
    toast(count > 0 ? `✅ ${count} ingredientes añadidos` : 'No se encontraron ingredientes de recetas guardadas')
  }

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Planificador</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekOffset(o => o - 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="syne" style={{ fontWeight: 700, fontSize: 15 }}>
          {startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekOffset(o => o + 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={16} height={16}><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {dates.map((date, i) => {
        const menu = state.menuPlan[date] || {}
        const isToday = date === t
        return (
          <div key={date} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text)' }}>
              {DAYS_ES[i]} {new Date(date + 'T12:00').getDate()}{isToday ? ' · Hoy' : ''}
            </div>
            {(Object.keys(MEALS) as MealSlot[]).map(slot => (
              <div key={slot} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: slot === 'dinner' ? 'none' : '1px solid var(--border)', minHeight: 44 }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', fontWeight: 600, width: 70, flexShrink: 0 }}>{MEALS[slot]}</span>
                <span style={{ flex: 1, fontSize: 14, color: menu[slot] ? 'var(--text)' : 'var(--text2)', fontStyle: menu[slot] ? 'normal' : 'italic', padding: '0 8px' }}>
                  {menu[slot] || '—'}
                </span>
                <button onClick={() => openEdit(date, slot)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}>✏️</button>
              </div>
            ))}
          </div>
        )
      })}

      <button className="btn btn-ghost btn-full" onClick={addMenuToShop} style={{ marginTop: 12 }}>
        🛒 Añadir ingredientes del menú a la compra
      </button>

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <div className="modal-title">Editar {MEALS[editing.meal]}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            {new Date(editing.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="input-group">
            <label className="input-label">Plato</label>
            <input autoFocus value={mealInput} onChange={e => setMealInput(e.target.value)} placeholder="Escribe un plato..." onKeyDown={e => e.key === 'Enter' && saveMeal()} />
          </div>
          {state.recipes.length > 0 && (
            <div className="input-group">
              <label className="input-label">Desde mis recetas</label>
              <select value={selectedRecipe} onChange={e => { setSelectedRecipe(e.target.value); setMealInput(e.target.value) }}>
                <option value="">Seleccionar receta...</option>
                {state.recipes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => saveMeal()}>Guardar</button>
            {state.menuPlan[editing.date]?.[editing.meal] && (
              <button className="btn btn-danger" onClick={() => saveMeal(true)}>Borrar</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
