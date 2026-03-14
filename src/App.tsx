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

const INSTALL_BANNER_DISMISS_KEY = 'mylife-install-banner-dismissed'
const DISMISS_DAYS = 7

function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return true
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
  return Boolean(standalone || displayMode)
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function App() {
  const { state, setState, resetState } = useStore()
  const [page, setPage] = useState<Page>('dash')
  const [online, setOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (isInstalledPWA()) return
    const dismissed = localStorage.getItem(INSTALL_BANNER_DISMISS_KEY)
    if (dismissed) {
      const until = parseInt(dismissed, 10)
      if (Date.now() < until) return
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    setShowInstallBanner(true)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  useEffect(() => {
    if (installPrompt) setShowInstallBanner(true)
  }, [installPrompt])

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return
    setInstalling(true)
    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setShowInstallBanner(false)
    } finally {
      setInstalling(false)
    }
  }, [installPrompt])

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false)
    localStorage.setItem(INSTALL_BANNER_DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

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

  const canInstall = Boolean(installPrompt)

  return (
    <>
      {!online && <div className="offline-banner">📡 Sin conexión — Modo offline</div>}
      {showInstallBanner && !isInstalledPWA() && (
        <div className="install-banner">
          <span className="install-banner-text">
            {canInstall ? 'Instala MyLife en tu dispositivo para acceder más rápido' : 'Añade MyLife a tu pantalla de inicio para usarlo como app'}
          </span>
          <div className="install-banner-actions">
            {canInstall && (
              <button type="button" className="install-banner-btn" onClick={handleInstall} disabled={installing}>
                {installing ? '…' : 'Instalar'}
              </button>
            )}
            <button type="button" className="install-banner-dismiss" onClick={dismissInstallBanner} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>
      )}
      <Toast />
      {pages[page]}
      <Nav current={page} onNav={setPage} state={state} />
    </>
  )
}
