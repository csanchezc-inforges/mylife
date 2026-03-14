import { useState, useRef, useEffect } from 'react'
import { AppState, CATS } from '../types'
import { todayStr, daysInMonth, formatDate, uid } from '../hooks/useStore'
import { Modal } from '../components/Modal'
import { toast } from '../components/Toast'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
}

export function Budget({ state, setState }: Props) {
  const [modal, setModal] = useState<'budget' | 'expense' | null>(null)
  const [catFilter, setCatFilter] = useState('all')
  const [form, setForm] = useState({ name: '', amount: '', date: todayStr(), category: 'food' })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const now = new Date()
  const t = todayStr()
  const monthStr = t.slice(0, 7)
  const daysM = daysInMonth(now.getFullYear(), now.getMonth() + 1)
  const daily = state.budget.monthly > 0 ? state.budget.monthly / daysM : 0
  const todayExp = state.expenses.filter(e => e.date === t).reduce((a, b) => a + b.amount, 0)
  const monthExp = state.expenses.filter(e => e.date.startsWith(monthStr)).reduce((a, b) => a + b.amount, 0)
  const diffDay = daily - todayExp
  const diffAcc = daily * now.getDate() - monthExp
  const pct = state.budget.monthly > 0 ? Math.min(100, monthExp / state.budget.monthly * 100) : 0

  const monthExpenses = state.expenses.filter(e => e.date.startsWith(monthStr))
  const filtered = catFilter === 'all' ? monthExpenses : monthExpenses.filter(e => e.category === catFilter)
  const cats = [...new Set(monthExpenses.map(e => e.category))]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const bycat: Record<string, number> = {}
    monthExpenses.forEach(e => { bycat[e.category] = (bycat[e.category] || 0) + e.amount })
    const keys = Object.keys(bycat)
    if (!keys.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth, H = 160
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    const vals = keys.map(k => bycat[k])
    const max = Math.max(...vals)
    const barW = Math.min(40, (W - 40) / keys.length - 10)
    ctx.clearRect(0, 0, W, H)
    keys.forEach((k, i) => {
      const x = 20 + i * ((W - 40) / keys.length) + ((W - 40) / keys.length - barW) / 2
      const barH = (vals[i] / max) * (H - 40)
      const y = H - 25 - barH
      const col = CATS[k]?.color || '#94a3b8'
      ctx.fillStyle = col + '33'
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, 4); ctx.fill()
      ctx.fillStyle = col
      ctx.beginPath(); ctx.roundRect(x, y, barW, 4, [2, 2, 0, 0]); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '15px sans-serif'
      ctx.textAlign = 'center'; ctx.fillText(CATS[k]?.emoji || '?', x + barW / 2, H - 8)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '10px DM Sans, sans-serif'
      ctx.fillText(vals[i].toFixed(0) + '€', x + barW / 2, y - 4)
    })
  }, [monthExpenses])

  const saveBudget = (v: string) => {
    const n = parseFloat(v)
    if (isNaN(n) || n <= 0) { toast('Introduce un importe válido'); return }
    setState(s => ({ ...s, budget: { monthly: n } }))
    setModal(null); toast('✅ Presupuesto guardado')
  }

  const saveExpense = () => {
    if (!form.name.trim()) { toast('Introduce una descripción'); return }
    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) { toast('Introduce un importe válido'); return }
    setState(s => ({ ...s, expenses: [...s.expenses, { id: uid(), name: form.name.trim(), amount, date: form.date, category: form.category }] }))
    setModal(null); toast('✅ Gasto añadido')
    setForm({ name: '', amount: '', date: todayStr(), category: 'food' })
  }

  const [budgetInput, setBudgetInput] = useState(state.budget.monthly > 0 ? String(state.budget.monthly) : '')

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Presupuesto</div>
        <div className="page-sub">{now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
      </div>

      {/* Diffs */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className={`diff-card ${diffDay >= 0 ? 'positive' : 'negative'}`}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', opacity: .7 }}>Hoy</div>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: diffDay >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
            {diffDay >= 0 ? '+' : ''}{diffDay.toFixed(2)} €
          </div>
          <div style={{ fontSize: 12, opacity: .7 }}>Objetivo: {daily.toFixed(2)} €</div>
        </div>
        <div className={`diff-card ${diffAcc >= 0 ? 'positive' : 'negative'}`}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', opacity: .7 }}>Acumulado</div>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: diffAcc >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
            {diffAcc >= 0 ? '+' : ''}{diffAcc.toFixed(2)} €
          </div>
          <div style={{ fontSize: 12, opacity: .7 }}>Día {now.getDate()} de {daysM}</div>
        </div>
      </div>

      {/* Goal */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Objetivo mensual</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('budget')}>Editar</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <span className="syne" style={{ fontSize: 28, fontWeight: 800 }}>{monthExp.toFixed(2)} €</span>
          <span style={{ color: 'var(--text2)', fontSize: 14 }}>de</span>
          <span className="syne" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text2)' }}>{state.budget.monthly > 0 ? state.budget.monthly + ' €' : '—'}</span>
        </div>
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: pct + '%', background: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--accent)' }} />
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="syne" style={{ fontWeight: 700, marginBottom: 12 }}>Por categoría</div>
        <canvas ref={canvasRef} style={{ width: '100%', height: 160 }} />
      </div>

      {/* Expenses list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-label" style={{ margin: 0 }}>Gastos</div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('expense')}>+ Añadir</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['all', ...cats].map(c => (
          <span key={c} className={`cat-pill${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>
            {c === 'all' ? 'Todos' : `${CATS[c]?.emoji || '?'} ${CATS[c]?.label || c}`}
          </span>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="empty-state"><div className="empty-icon">💸</div><div>Sin gastos registrados</div></div>
        : [...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{CATS[e.category]?.emoji || '?'}</span>
            <div style={{ flex: 1, padding: '0 10px' }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{formatDate(e.date)} · {CATS[e.category]?.label || e.category}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="syne" style={{ fontWeight: 700, fontSize: 16, color: 'var(--danger)' }}>-{e.amount.toFixed(2)} €</div>
              <button onClick={() => setState(s => ({ ...s, expenses: s.expenses.filter(x => x.id !== e.id) }))} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          </div>
        ))
      }

      {modal === 'budget' && (
        <Modal onClose={() => setModal(null)}>
          <div className="modal-title">Objetivo mensual</div>
          <div className="input-group">
            <label className="input-label">Presupuesto en €</label>
            <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} placeholder="ej: 1500" autoFocus />
          </div>
          <button className="btn btn-primary btn-full" onClick={() => saveBudget(budgetInput)}>Guardar</button>
        </Modal>
      )}

      {modal === 'expense' && (
        <Modal onClose={() => setModal(null)}>
          <div className="modal-title">Añadir gasto</div>
          <div className="input-group">
            <label className="input-label">Descripción</label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: Supermercado" />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Importe (€)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" step="0.01" />
            </div>
            <div className="input-group">
              <label className="input-label">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Categoría</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={saveExpense}>Añadir gasto</button>
        </Modal>
      )}
    </div>
  )
}
