import { useState, useEffect, useCallback } from 'react'
import { Page, FoodSubPage } from './types'
import { useStore, todayStr } from './hooks/useStore'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { LockScreen } from './components/LockScreen'
import { FoodSection } from './components/FoodSection'
import { Dashboard } from './pages/Dashboard'
import { Budget } from './pages/Budget'
import { Tasks } from './pages/Tasks'
import { Habits } from './pages/Habits'
import { Config } from './pages/Config'
import { isUnlocked, setUnlocked } from './lib/biometric'
import {
  checkAndShowTaskReminder,
  getTasksDueTodayOrTomorrow,
  writeReminderToIDB,
  getTaskReminderLastDate,
} from './lib/taskReminder'

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
  const [foodSubPage, setFoodSubPage] = useState<FoodSubPage>('recipes')
  const [online, setOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [biometricUnlocked, setBiometricUnlocked] = useState(() => isUnlocked())

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

  // Recordatorio de tareas que vencen hoy o mañana (al abrir o al volver a la app)
  useEffect(() => {
    if (!state.notif.tasks) return
    const run = () => {
      checkAndShowTaskReminder(state.tasks, state.notif.tasks)
      const due = getTasksDueTodayOrTomorrow(state.tasks)
      const last = getTaskReminderLastDate()
      writeReminderToIDB({
        tasksDue: due.map((t) => ({ name: t.name, due: t.due })),
        lastNotifiedDate: last,
      })
    }
    run()
    const onVisible = () => run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [state.tasks, state.notif.tasks])

  // Registrar Periodic Background Sync para notificar con la app cerrada (Chrome y compatibles)
  useEffect(() => {
    if (!state.notif.tasks || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then((reg) => {
      const r = reg as ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, opts?: { minInterval: number }) => Promise<void> } }
      if (r.periodicSync?.register) {
        r.periodicSync.register('mylife-task-reminder', { minInterval: 24 * 60 * 60 }).catch(() => {})
      }
    })
  }, [state.notif.tasks])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', state.accentColor || '#00e5c0')
  }, [state.accentColor])

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

  const navigate = useCallback((p: string) => {
    const [pagePart, sub] = p.split('#') as [Page, FoodSubPage?]
    setPage(pagePart)
    if (pagePart === 'food' && sub && (sub === 'recipes' || sub === 'shop' || sub === 'menu')) setFoodSubPage(sub)
  }, [])

  const pages: Record<Page, React.ReactNode> = {
    dash:   <Dashboard key="dash"   state={state} onToggleHabit={toggleHabit} onNavigate={navigate} />,
    budget: <Budget    key="budget" state={state} setState={setState} />,
    food:   <FoodSection key="food" state={state} setState={setState} subPage={foodSubPage} setSubPage={setFoodSubPage} onNavigate={navigate} />,
    tasks:  <Tasks     key="tasks"  state={state} setState={setState} />,
    habits: <Habits    key="habits" state={state} setState={setState} />,
    config: <Config    key="config" state={state} setState={setState} onReset={resetState} />,
  }

  const canInstall = Boolean(installPrompt)
  const requireBiometric = Boolean(state.config.biometricEnabled)
  const showLockScreen = requireBiometric && !biometricUnlocked

  const handleBiometricUnlock = useCallback(() => {
    setUnlocked(true)
    setBiometricUnlocked(true)
  }, [])

  if (showLockScreen) {
    return (
      <>
        <LockScreen onUnlock={handleBiometricUnlock} unlockPin={state.config.unlockPin ?? ''} />
        <Toast />
      </>
    )
  }

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
