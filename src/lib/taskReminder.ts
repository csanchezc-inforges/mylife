import type { Task } from '../types'

const TASK_REMINDER_LAST_KEY = 'mylife_task_reminder_last'
const TASK_REMINDER_DB = 'mylife_reminder'
const TASK_REMINDER_STORE = 'data'

function todayYYYYMMDD(): string {
  return new Date().toISOString().split('T')[0]
}

function tomorrowYYYYMMDD(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

/** Tareas pendientes cuya fecha de vencimiento es hoy o mañana */
export function getTasksDueTodayOrTomorrow(tasks: Task[]): Task[] {
  const today = todayYYYYMMDD()
  const tomorrow = tomorrowYYYYMMDD()
  return tasks.filter(
    (t) => !t.done && t.due && (t.due === today || t.due === tomorrow)
  )
}

export function getTaskReminderLastDate(): string | null {
  try {
    return localStorage.getItem(TASK_REMINDER_LAST_KEY)
  } catch {
    return null
  }
}

export function setTaskReminderLastDate(date: string): void {
  try {
    localStorage.setItem(TASK_REMINDER_LAST_KEY, date)
  } catch {}
}

/** Solo mostrar recordatorio una vez por día */
export function shouldShowTaskReminderToday(): boolean {
  const last = getTaskReminderLastDate()
  return last !== todayYYYYMMDD()
}

/** Escribir en IndexedDB para que el Service Worker pueda leer con la app cerrada */
export function writeReminderToIDB(payload: {
  tasksDue: { name: string; due: string }[]
  lastNotifiedDate: string | null
}): void {
  if (typeof indexedDB === 'undefined') return
  try {
    const req = indexedDB.open(TASK_REMINDER_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(TASK_REMINDER_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(TASK_REMINDER_STORE, 'readwrite')
      tx.objectStore(TASK_REMINDER_STORE).put({ id: 'reminder', ...payload })
      db.close()
    }
  } catch {}
}

/** Leer desde IndexedDB (usado por el Service Worker) */
export function readReminderFromIDB(): Promise<{
  tasksDue: { name: string; due: string }[]
  lastNotifiedDate: string | null
} | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    try {
      const req = indexedDB.open(TASK_REMINDER_DB, 1)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(TASK_REMINDER_STORE)) {
          db.close()
          resolve(null)
          return
        }
        const tx = db.transaction(TASK_REMINDER_STORE, 'readonly')
        const getReq = tx.objectStore(TASK_REMINDER_STORE).get('reminder')
        getReq.onsuccess = () => {
          const raw = getReq.result
          db.close()
          resolve(
            raw && Array.isArray(raw.tasksDue)
              ? {
                  tasksDue: raw.tasksDue,
                  lastNotifiedDate: raw.lastNotifiedDate ?? null,
                }
              : null
          )
        }
        getReq.onerror = () => {
          db.close()
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function buildNotificationBody(tasks: Task[]): string {
  const today = todayYYYYMMDD()
  const todayTasks = tasks.filter((t) => t.due === today)
  const tomorrowTasks = tasks.filter((t) => t.due !== today)
  const parts: string[] = []
  if (todayTasks.length) parts.push(`Hoy: ${todayTasks.map((t) => t.name).join(', ')}`)
  if (tomorrowTasks.length) parts.push(`Mañana: ${tomorrowTasks.map((t) => t.name).join(', ')}`)
  return parts.join(' · ') || 'Tareas por vencer'
}

/** Mostrar notificación nativa (desde la app o desde el SW) */
export function showTaskReminderNotification(tasks: Task[]): void {
  if (tasks.length === 0) return
  const title =
    tasks.length === 1
      ? '1 tarea vence hoy o mañana'
      : `${tasks.length} tareas vencen hoy o mañana`
  const body = buildNotificationBody(tasks)
  const origin = typeof window !== 'undefined' ? window.location.origin : (self as any).origin || ''
  const iconUrl = origin ? new URL('/icon-192.png', origin).href : ''

  const fallback = () => {
    try {
      new (self as any).Notification(title, { body, icon: iconUrl })
    } catch {}
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(title, { body, icon: iconUrl, tag: 'mylife-task-reminder' })
      )
      .catch(fallback)
  } else {
    fallback()
  }
}

/** Comprobar y mostrar recordatorio si aplica (desde la app). Respetar notif.tasks y permiso. */
export function checkAndShowTaskReminder(
  tasks: Task[],
  remindersEnabled: boolean
): void {
  if (!remindersEnabled) return
  if (typeof (self as any).Notification === 'undefined') return
  if ((self as any).Notification.permission !== 'granted') return
  if (!shouldShowTaskReminderToday()) return

  const due = getTasksDueTodayOrTomorrow(tasks)
  if (due.length === 0) return

  showTaskReminderNotification(due)
  const today = todayYYYYMMDD()
  setTaskReminderLastDate(today)
  writeReminderToIDB({
    tasksDue: due.map((t) => ({ name: t.name, due: t.due })),
    lastNotifiedDate: today,
  })
}
