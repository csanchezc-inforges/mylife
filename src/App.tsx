import { useState, useEffect, useCallback } from 'react'
import { Page } from './types'
import { useStore, todayStr } from './hooks/useStore'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { Dashboard } from './pages/Dashboard'
import { Budget } from './pages/Budget'
import { Recipes } from './pages/Recipes'
import { Shopping } from './pages/Shopping'
import { MenuPlanner } from './pages/MenuPlanner'
import { Tasks } from './pages/Tasks'
import { Habits } from './pages/Habits'
import { Config } from './pages/Config'

export default function App() {
  const { state, setState, resetState } = useStore()
  const [page, setPage] = useState<Page>('dash')
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const toggleHabit = useCallback((id: string) => {
    const t = todayStr()
    setState(s => {
      const logs = [...(s.habitLogs[id] || [])]
      const idx = logs.indexOf(t)
      if (idx >= 0) logs.splice(idx, 1)
      else logs.push(t)
      return { ...s, habitLogs: { ...s.habitLogs, [id]: logs } }
    })
  }, [setState])

  const navigate = useCallback((p: string) => setPage(p as Page), [])

  const pages: Record<Page, React.ReactNode> = {
    dash:    <Dashboard key="dash"    state={state} onToggleHabit={toggleHabit} onNavigate={navigate} />,
    budget:  <Budget    key="budget"  state={state} setState={setState} />,
    recipes: <Recipes   key="recipes" state={state} setState={setState} onNavigate={navigate} />,
    shop:    <Shopping  key="shop"    state={state} setState={setState} />,
    menu:    <MenuPlanner key="menu"  state={state} setState={setState} />,
    tasks:   <Tasks     key="tasks"   state={state} setState={setState} />,
    habits:  <Habits    key="habits"  state={state} setState={setState} />,
    config:  <Config    key="config"  state={state} setState={setState} onReset={resetState} />,
  }

  return (
    <>
      {!online && <div className="offline-banner">📡 Sin conexión — Modo offline</div>}
      <Toast />
      {pages[page]}
      <Nav current={page} onNav={setPage} state={state} />
    </>
  )
}
