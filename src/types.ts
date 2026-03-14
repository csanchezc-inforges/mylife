export type Page = 'dash' | 'budget' | 'recipes' | 'shop' | 'menu' | 'tasks' | 'habits' | 'config'
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

export interface Task {
  id: string
  name: string
  priority: Priority
  due: string
  category: string
  done: boolean
  createdAt: string
}

export interface Habit {
  id: string
  name: string
  emoji: string
  createdAt: string
}

export type HabitLogs = Record<string, string[]>

export interface Config {
  provider: Provider
  claudeKey: string
  openaiKey: string
}

export interface NotifConfig {
  habits: boolean
  daily: boolean
}

export interface AppState {
  expenses: Expense[]
  budget: Budget
  recipes: Recipe[]
  shoppingList: ShoppingItem[]
  menuPlan: MenuPlan
  tasks: Task[]
  habits: Habit[]
  habitLogs: HabitLogs
  config: Config
  notif: NotifConfig
}

export interface Category {
  label: string
  emoji: string
  color: string
}

export const CATS: Record<string, Category> = {
  food:      { label: 'Alimentación', emoji: '🛒', color: '#00e5c0' },
  transport: { label: 'Transporte',   emoji: '🚗', color: '#a78bfa' },
  leisure:   { label: 'Ocio',         emoji: '🎮', color: '#fb923c' },
  health:    { label: 'Salud',        emoji: '💊', color: '#f87171' },
  home:      { label: 'Hogar',        emoji: '🏠', color: '#60a5fa' },
  clothes:   { label: 'Ropa',         emoji: '👕', color: '#f472b6' },
  other:     { label: 'Otros',        emoji: '📦', color: '#94a3b8' },
}

export const DEFAULT_STATE: AppState = {
  expenses: [],
  budget: { monthly: 0 },
  recipes: [],
  shoppingList: [],
  menuPlan: {},
  tasks: [],
  habits: [],
  habitLogs: {},
  config: { provider: 'claude', claudeKey: '', openaiKey: '' },
  notif: { habits: false, daily: false },
}
