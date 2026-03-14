import { useState, useCallback } from 'react'
import { AppState, DEFAULT_STATE } from '../types'

const STORE_KEY = 'mylife_v1'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_STATE
}

export function useStore() {
  const [state, setStateRaw] = useState<AppState>(loadState)

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev)
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const resetState = useCallback(() => {
    localStorage.removeItem(STORE_KEY)
    setStateRaw(DEFAULT_STATE)
  }, [])

  return { state, setState, resetState }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(d: string): string {
  return new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export function getWeekDates(offset = 0): string[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}
