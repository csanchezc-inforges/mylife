import { useState } from 'react'
import { AppState, Recipe, RecipeIngredient } from '../types'
import { uid, todayStr } from '../hooks/useStore'
import { generateRecipeAI, RecipeOptions } from '../api/ai'
import { toast } from '../components/Toast'

interface Props {
  state: AppState
  setState: (fn: (s: AppState) => AppState) => void
  onNavigate: (p: string) => void
}

const DIET_OPTIONS = [
  { value: '', label: 'Sin preferencia' },
  { value: 'keto', label: 'Keto' },
  { value: 'low carb', label: 'Low carb' },
  { value: 'baja en grasas', label: 'Baja en grasas' },
  { value: 'baja en calorías', label: 'Baja en calorías' },
  { value: 'alta en proteínas', label: 'Alta en proteínas' },
  { value: 'mediterránea', label: 'Mediterránea' },
]

const CUISINE_OPTIONS = [
  { value: '', label: 'Sin preferencia' },
  { value: 'española', label: 'Española' },
  { value: 'italiana', label: 'Italiana' },
  { value: 'asiática', label: 'Asiática' },
  { value: 'mexicana', label: 'Mexicana' },
  { value: 'india', label: 'India' },
  { value: 'mediterránea', label: 'Mediterránea' },
  { value: 'americana', label: 'Americana' },
]

export function Recipes({ state, setState, onNavigate }: Props) {
  const [prompt, setPrompt] = useState('')
  const [servings, setServings] = useState(2)
  const [maxTime, setMaxTime] = useState(30)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [dietType, setDietType] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [otherReq, setOtherReq] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Recipe | null>(null)

  const getOptions = (): RecipeOptions | undefined => {
    const diet = dietType.trim() || undefined
    const cuisine = cuisineType.trim() || undefined
    const other = otherReq.trim() || undefined
    if (!diet && !cuisine && !other) return undefined
    return { dietType: diet, cuisineType: cuisine, other }
  }

  const generate = async (excludeIngredients?: string[]) => {
    if (!prompt.trim()) { toast('Describe qué receta quieres'); return }
    const hasClaude = state.config.claudeKey?.startsWith('sk-ant')
    const hasOpenAI = state.config.openaiKey?.startsWith('sk-')
    if (!hasClaude && !hasOpenAI) {
      toast('Configura una clave API primero')
      onNavigate('config')
      return
    }
    setLoading(true); setError(''); setResult(null)
    try {
      const recipe = await generateRecipeAI(
        state.config,
        prompt,
        servings,
        maxTime,
        getOptions(),
        excludeIngredients
      )
      setResult(recipe)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const addToShop = (ingredients: RecipeIngredient[]) => {
    setState(s => ({
      ...s,
      shoppingList: [...s.shoppingList, ...ingredients.map(i => ({ id: uid(), name: i.name, qty: i.amount, done: false, source: 'recipe' as const }))]
    }))
    toast(`✅ ${ingredients.length} ingredientes añadidos a la compra`)
  }

  const saveRecipe = (recipe: Recipe) => {
    if (state.recipes.find(r => r.name === recipe.name)) { toast('Ya tienes esta receta guardada'); return }
    setState(s => ({ ...s, recipes: [...s.recipes, { ...recipe, id: uid(), savedAt: todayStr() }] }))
    toast('✅ Receta guardada')
  }

  const deleteRecipe = (id: string) => {
    setState(s => ({ ...s, recipes: s.recipes.filter(r => r.id !== id) }))
  }

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Recetas IA</div>
        <div className="page-sub">Genera recetas y añade ingredientes a la compra</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="input-group">
          <label className="input-label">¿Qué tipo de receta?</label>
          <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="ej: pasta vegana para 2, cena fácil y rápida..." onKeyDown={e => e.key === 'Enter' && generate()} />
        </div>
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Personas</label>
            <input type="number" min={1} max={10} value={servings} onChange={e => setServings(+e.target.value)} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Tiempo máx.</label>
            <select value={maxTime} onChange={e => setMaxTime(+e.target.value)}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>+1 hora</option>
            </select>
          </div>
        </div>

        <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={() => setAdvancedOpen(o => !o)}>
          {advancedOpen ? '▼ Ocultar opciones avanzadas' : '▶ Opciones avanzadas'}
        </button>
        {advancedOpen && (
          <div style={{ marginBottom: 14, padding: 12, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label className="input-label">Tipo de dieta</label>
              <select value={dietType} onChange={e => setDietType(e.target.value)}>
                {DIET_OPTIONS.map(o => <option key={o.value || 'none'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label className="input-label">Tipo de cocina</label>
              <select value={cuisineType} onChange={e => setCuisineType(e.target.value)}>
                {CUISINE_OPTIONS.map(o => <option key={o.value || 'none'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Otros (sin gluten, vegano, etc.)</label>
              <input value={otherReq} onChange={e => setOtherReq(e.target.value)} placeholder="ej: sin gluten, vegano" />
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-full" onClick={() => generate()} disabled={loading}>
          {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Generando...</> : '✨ Generar receta'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 16 }}>
          <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>❌ Error</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{error}</div>
        </div>
      )}

      {result && (
        <RecipeCard
          recipe={result}
          onAddToShop={addToShop}
          onSave={saveRecipe}
          onRegenerate={excluded => generate(excluded)}
          loading={loading}
          isNew
        />
      )}

      <div className="section-label" style={{ marginTop: 8 }}>Mis recetas guardadas</div>
      {!state.recipes.length ? (
        <div className="empty-state"><div className="empty-icon">🍳</div><div>Sin recetas guardadas</div></div>
      ) : (
        state.recipes.map(r => (
          <RecipeCard key={r.id} recipe={r} onAddToShop={addToShop} onSave={saveRecipe} onDelete={() => deleteRecipe(r.id)} />
        ))
      )}
    </div>
  )
}

function RecipeCard({
  recipe,
  onAddToShop,
  onSave,
  onDelete,
  onRegenerate,
  loading,
  isNew,
}: {
  recipe: Recipe
  onAddToShop: (i: RecipeIngredient[]) => void
  onSave: (r: Recipe) => void
  onDelete?: () => void
  onRegenerate?: (excludeNames: string[]) => void
  loading?: boolean
  isNew?: boolean
}) {
  const [open, setOpen] = useState(!!isNew)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const toggleExclude = (idx: number) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleRegenerate = () => {
    const names = recipe.ingredients.filter((_, i) => excluded.has(i)).map(i => i.name)
    onRegenerate?.(names)
  }

  return (
    <div className={`card${isNew ? ' card-glow' : ''}`} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: open ? 12 : 0 }}>
        <div onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'DM Sans, sans-serif' }}>{recipe.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>⏱ {recipe.time} · 👥 {recipe.servings} · {recipe.difficulty}</div>
        </div>
        {onDelete && <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>×</button>}
      </div>
      {open && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>Ingredientes</div>
          <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recipe.ingredients.map((i, idx) => {
              const isEx = excluded.has(idx)
              return (
                <label key={idx} className={isNew && onRegenerate ? 'recipe-ingredient-label' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isEx ? 'var(--surface)' : 'var(--surface2)', border: '1px solid ' + (isEx ? 'var(--danger)' : 'var(--border)'), borderRadius: 6, padding: '4px 10px', fontSize: 13, cursor: isNew && onRegenerate ? 'pointer' : 'default' }}>
                  {isNew && onRegenerate && (
                    <input type="checkbox" checked={isEx} onChange={() => toggleExclude(idx)} className="recipe-ingredient-check" />
                  )}
                  <span style={{ textDecoration: isEx ? 'line-through' : 'none', color: isEx ? 'var(--text2)' : 'inherit' }}>
                    {i.amount} {i.name}
                  </span>
                </label>
              )
            })}
          </div>
          {isNew && onRegenerate && excluded.size > 0 && (
            <button type="button" className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={handleRegenerate} disabled={loading}>
              🔄 Regenerar sin los ingredientes marcados
            </button>
          )}
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>Pasos</div>
          <ol style={{ paddingLeft: 16, color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: recipe.tips ? 12 : 0 }}>
            {recipe.steps.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
          </ol>
          {recipe.tips && (
            <div style={{ padding: '10px 12px', background: 'rgba(167,139,250,0.08)', borderRadius: 8, borderLeft: '3px solid var(--accent2)', fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              💡 {recipe.tips}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => onAddToShop(recipe.ingredients)}>🛒 A la compra</button>
            {isNew && <button type="button" className="btn btn-ghost" onClick={() => onSave(recipe)}>💾 Guardar</button>}
          </div>
        </>
      )}
    </div>
  )
}
