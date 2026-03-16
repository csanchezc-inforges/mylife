export type Page = 'dash' | 'budget' | 'food' | 'tasks' | 'habits' | 'config'
export type FoodSubPage = 'recipes' | 'shop' | 'menu'
export type Priority = 'high' | 'mid' | 'low'
export type Provider = 'claude' | 'openai'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface Expense {
  id: string
  name: string
  amount: number
  date: string
  category: string
}

export interface Budget {
  monthly: number
}

export interface RecipeIngredient {
  name: string
  amount: string
}

export interface Recipe {
  id: string
  name: string
  time: string
  servings: number
  difficulty: string
  ingredients: RecipeIngredient[]
  steps: string[]
  tips?: string
  savedAt: string
}

export interface ShoppingItem {
  id: string
  name: string
  qty: string
  done: boolean
  source?: 'recipe' | 'menu' | 'manual'
}

export interface DayMenu {
  breakfast?: string
  lunch?: string
  dinner?: string
}

export type MenuPlan = Record<string, DayMenu>

export type TaskEnvironment = 'personal' | 'home' | 'work'

export const TASK_ENVIRONMENTS: { id: TaskEnvironment; label: string; emoji: string }[] = [
  { id: 'personal', label: 'Personal', emoji: '👤' },
  { id: 'home', label: 'Hogar', emoji: '🏠' },
  { id: 'work', label: 'Trabajo', emoji: '💼' },
]

export interface Task {
  id: string
  name: string
  priority: Priority
  due: string
  category: string
  environment?: TaskEnvironment
  done: boolean
  createdAt: string
}

export interface Habit {
  id: string
  name: string
  emoji: string
  /** Objetivo: días a la semana (1-7). Opcional. */
  daysPerWeek?: number
  createdAt: string
}

export type HabitLogs = Record<string, string[]>

/** Punto GPS de una ruta de deporte */
export interface SportRoutePoint {
  lat: number
  lng: number
  timestamp: number
}

/** Ruta guardada (correr/andar) */
export interface SportRoute {
  id: string
  points: SportRoutePoint[]
  distanceKm: number
  startedAt: string
  finishedAt: string  // YYYY-MM-DD
}

export interface IntegrationsConfig {
  /** Token de acceso de Strava (se renueva automáticamente si hay refresh) */
  stravaToken?: string
  /** Token de actualización para renovar el access_token cuando caduque */
  stravaRefreshToken?: string
  /** Client ID de la app en Strava (para renovación automática) */
  stravaClientId?: string
  /** Client Secret de la app en Strava (para renovación automática) */
  stravaClientSecret?: string
  /** Última sincronización exitosa con Strava (ISO date) */
  stravaLastSync?: string
}

export interface Config {
  provider: Provider
  claudeKey: string
  openaiKey: string
  /** Desbloquear app con huella dactilar (opcional) */
  biometricEnabled?: boolean
  /** PIN de desbloqueo (4 dígitos), alternativo a la huella */
  unlockPin?: string
  /** Integraciones con servicios externos (Strava, etc.) */
  integrations?: IntegrationsConfig
}

export interface NotifConfig {
  habits: boolean
  daily: boolean
}

export type Theme = 'light' | 'dark'

export const ACCENT_COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'teal', name: 'Teal', hex: '#00e5c0' },
  { id: 'green', name: 'Verde', hex: '#22c55e' },
  { id: 'blue', name: 'Azul', hex: '#3b82f6' },
  { id: 'violet', name: 'Violeta', hex: '#8b5cf6' },
  { id: 'pink', name: 'Rosa', hex: '#ec4899' },
  { id: 'orange', name: 'Naranja', hex: '#f97316' },
]

export interface AppState {
  expenses: Expense[]
  budget: Budget
  recipes: Recipe[]
  shoppingList: ShoppingItem[]
  shoppingFavorites: string[]
  menuPlan: MenuPlan
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLogs
  sportRoutes: SportRoute[]
  config: Config
  notif: NotifConfig
  theme: Theme
  accentColor: string
}

export interface Category {
  label: string
  emoji: string
  color: string
}

export const CATS: Record<string, Category> = {
  food:          { label: 'Alimentación',  emoji: '🛒', color: '#00e5c0' },
  transport:     { label: 'Transporte',    emoji: '🚗', color: '#a78bfa' },
  leisure:       { label: 'Ocio',         emoji: '🎮', color: '#fb923c' },
  health:        { label: 'Salud',        emoji: '💊', color: '#f87171' },
  home:          { label: 'Hogar',        emoji: '🏠', color: '#60a5fa' },
  clothes:       { label: 'Ropa',         emoji: '👕', color: '#f472b6' },
  workshop:      { label: 'Taller',       emoji: '🔧', color: '#eab308' },
  subscriptions: { label: 'Suscripciones', emoji: '📱', color: '#06b6d4' },
  other:         { label: 'Otros',         emoji: '📦', color: '#94a3b8' },
}

export const DEFAULT_STATE: AppState = {
  expenses: [],
  budget: { monthly: 0 },
  recipes: [],
  shoppingList: [],
  shoppingFavorites: [],
  menuPlan: {},
  tasks: [],
  habits: [],
  habitLogs: {},
  sportRoutes: [],
  config: {
    provider: 'claude',
    claudeKey: '',
    openaiKey: '',
    biometricEnabled: false,
    integrations: {},
  },
  notif: { habits: false, daily: false },
  theme: 'dark',
  accentColor: '#00e5c0',
}
