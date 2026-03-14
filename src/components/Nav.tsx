import { Page, AppState } from '../types'
import appIcon from '../assets/icon-192.png'

interface Props {
  current: Page
  onNav: (p: Page) => void
  state: AppState
}

export function Nav({ current, onNav, state }: Props) {
  const shopPend = state.shoppingList.filter(s => !s.done).length
  const taskPend = state.tasks.filter(t => !t.done).length

  const btn = (id: Page, label: string, icon: React.ReactNode, badge?: number) => (
    <button
      key={id}
      className={`nav-btn${current === id ? ' active' : ''}`}
      onClick={() => onNav(id)}
    >
      {icon}
      {label}
      {badge ? <span className="nav-badge">{badge > 9 ? '9+' : badge}</span> : null}
    </button>
  )

  return (
    <nav className="bottom-nav">
      {btn('dash', 'Inicio', <GridIcon />)}
      {btn('budget', 'Dinero', <CoinIcon />)}
      {btn('food', 'Comida', <FoodIcon />, shopPend)}
      <div className="nav-center-logo" aria-hidden>
        <img src={appIcon} alt="" width={32} height={32} className="nav-app-icon" />
      </div>
      {btn('tasks', 'Tareas', <CheckIcon />, taskPend)}
      {btn('habits', 'Hábitos', <StarIcon />)}
      {btn('config', 'Config', <GearIcon />)}
    </nav>
  )
}

// SVG Icons
import React from 'react'
const s = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
const GridIcon = () => <svg {...s}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const CoinIcon = () => <svg {...s}><circle cx="12" cy="12" r="9"/><path d="M12 7v1m0 8v1m-3.5-5.5a3.5 3.5 0 107 0c0-1.5-1-2.5-3.5-2.5S8.5 9 8.5 10.5"/></svg>
const FoodIcon = () => <svg {...s}><ellipse cx="12" cy="10" rx="7" ry="4"/><path d="M5 10v4c0 2.2 3 4 7 4s7-1.8 7-4v-4"/><path d="M9 14h6"/></svg>
const CheckIcon = () => <svg {...s}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
const StarIcon = () => <svg {...s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const GearIcon = () => <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
