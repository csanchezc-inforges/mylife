import { AppState } from '../types'
import { Recipes } from '../pages/Recipes'
import { Shopping } from '../pages/Shopping'
import { MenuPlanner } from '../pages/MenuPlanner'
import type { FoodSubPage } from '../types'

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
const RecipeTabIcon = () => <svg {...svg}><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>
const ShopTabIcon = () => <svg {...svg}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
const MenuTabIcon = () => <svg {...svg}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

const TABS: { id: FoodSubPage; label: string; icon: React.ReactNode }[] = [
  { id: 'recipes', label: 'Recetas', icon: <RecipeTabIcon /> },
  { id: 'shop', label: 'Compra', icon: <ShopTabIcon /> },
  { id: 'menu', label: 'Menús', icon: <MenuTabIcon /> },
]

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  subPage: FoodSubPage
  setSubPage: (p: FoodSubPage) => void
  onNavigate: (p: string) => void
}

export function FoodSection({ state, setState, subPage, setSubPage, onNavigate }: Props) {
  return (
    <div>
      <div className="food-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`food-tab${subPage === t.id ? ' active' : ''}`}
            onClick={() => setSubPage(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="food-content">
        {subPage === 'recipes' && <Recipes state={state} setState={setState} onNavigate={onNavigate} />}
        {subPage === 'shop' && <Shopping state={state} setState={setState} />}
        {subPage === 'menu' && <MenuPlanner state={state} setState={setState} />}
      </div>
    </div>
  )
}
