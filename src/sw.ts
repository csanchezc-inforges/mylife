/* eslint-disable no-restricted-globals */
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new CacheFirst({ cacheName: 'google-fonts-cache', plugins: [] })
)
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({ cacheName: 'gstatic-fonts-cache', plugins: [] })
)
registerRoute(
  ({ request }) => request.destination === 'style',
  new NetworkFirst({ cacheName: 'css-cache', plugins: [] })
)

const TASK_REMINDER_DB = 'mylife_reminder'
const TASK_REMINDER_STORE = 'data'

function todayYYYYMMDD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TASK_REMINDER_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(TASK_REMINDER_STORE)) {
        req.result.createObjectStore(TASK_REMINDER_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

interface ReminderPayload {
  tasksDue: { name: string; due: string }[]
  lastNotifiedDate: string | null
}

function readReminder(db: IDBDatabase): Promise<ReminderPayload | null> {
  return new Promise((resolve) => {
    const tx = db.transaction(TASK_REMINDER_STORE, 'readonly')
    const store = tx.objectStore(TASK_REMINDER_STORE)
    const req = store.get('reminder')
    req.onsuccess = () => {
      const raw = req.result
      if (raw && Array.isArray(raw.tasksDue)) {
        resolve({
          tasksDue: raw.tasksDue,
          lastNotifiedDate: raw.lastNotifiedDate ?? null,
        })
      } else {
        resolve(null)
      }
    }
    req.onerror = () => resolve(null)
  })
}

function putReminder(
  db: IDBDatabase,
  payload: ReminderPayload & { lastNotifiedDate: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_REMINDER_STORE, 'readwrite')
    tx.objectStore(TASK_REMINDER_STORE).put({ id: 'reminder', ...payload })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

interface PeriodicSyncEvent extends Event {
  tag: string
  waitUntil(p: Promise<void>): void
}

self.addEventListener('periodicsync', (event: Event) => {
  const e = event as unknown as PeriodicSyncEvent
  if (e.tag !== 'mylife-task-reminder') return
  e.waitUntil(
    (async () => {
      const db = await openIDB()
      const data = await readReminder(db)
      db.close()
      if (!data || !data.tasksDue.length) return
      const today = todayYYYYMMDD()
      if (data.lastNotifiedDate === today) return
      const title =
        data.tasksDue.length === 1
          ? '1 tarea vence hoy o mañana'
          : `${data.tasksDue.length} tareas vencen hoy o mañana`
      const body = data.tasksDue.map((t) => t.name).join(', ')
      await self.registration.showNotification(title, {
        body,
        tag: 'mylife-task-reminder',
        icon: '/icon-192.png',
      })
      const db2 = await openIDB()
      await putReminder(db2, {
        tasksDue: data.tasksDue,
        lastNotifiedDate: today,
      })
      db2.close()
    })()
  )
})
