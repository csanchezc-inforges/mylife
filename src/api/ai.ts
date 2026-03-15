import { Config, Recipe } from '../types'

export interface RecipeOptions {
  dietType?: string   // keto, low carb, baja en grasas, baja en calorías, etc.
  cuisineType?: string // española, italiana, asiática, etc.
  other?: string      // sin gluten, vegano, sin lactosa, etc.
}

const SYS_PROMPT = `Eres un chef experto. Genera recetas detalladas en español.
Responde SOLO con JSON válido, sin markdown, sin backticks ni texto extra. Formato exacto:
{"name":"nombre","time":"X min","servings":N,"difficulty":"Fácil|Media|Difícil","ingredients":[{"name":"ingrediente","amount":"cantidad"}],"steps":["paso 1","paso 2"],"tips":"consejo opcional"}`

function parseRecipeJSON(text: string): Recipe {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No se encontró JSON en la respuesta')
  const parsed = JSON.parse(match[0])
  if (!parsed.name || !parsed.ingredients || !parsed.steps) {
    throw new Error('La respuesta no tiene el formato esperado. Inténtalo de nuevo.')
  }
  return parsed as Recipe
}

function buildRecipePrompt(
  prompt: string,
  servings: number,
  maxTime: number,
  options?: RecipeOptions,
  excludeIngredients?: string[]
): string {
  let text = `Receta: ${prompt}. Personas: ${servings}. Tiempo máximo: ${maxTime} minutos.`
  if (options?.dietType) text += ` Tipo de dieta: ${options.dietType}.`
  if (options?.cuisineType) text += ` Tipo de cocina: ${options.cuisineType}.`
  if (options?.other) text += ` Requisitos: ${options.other}.`
  if (excludeIngredients?.length) text += ` NO incluyas estos ingredientes: ${excludeIngredients.join(', ')}.`
  text += ' Responde SOLO el JSON.'
  return text
}

export async function generateRecipeAI(
  config: Config,
  prompt: string,
  servings: number,
  maxTime: number,
  options?: RecipeOptions,
  excludeIngredients?: string[]
): Promise<Recipe> {
  const hasClaude = config.claudeKey?.startsWith('sk-ant')
  const hasOpenAI = config.openaiKey?.startsWith('sk-')

  if (!hasClaude && !hasOpenAI) {
    throw new Error('No hay ninguna clave API configurada.')
  }

  const userPrompt = buildRecipePrompt(prompt, servings, maxTime, options, excludeIngredients)

  // Claude preferred (no CORS issues from browser)
  if (hasClaude && (config.provider === 'claude' || !hasOpenAI)) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: SYS_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? `Error Claude: ${res.status}`)
    return parseRecipeJSON(data.content[0].text)
  }

  // OpenAI vía proxy CORS (necesario en navegador/PWA) (necesario en navegador/PWA; en standalone puede fallar según red)
  if (hasOpenAI) {
    const openAiUrl = 'https://api.openai.com/v1/chat/completions'
    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYS_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + config.openaiKey,
    }
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(openAiUrl)
    let res = await fetch(proxyUrl, { method: 'POST', headers, body })
    if (!res.ok) {
      const retry = await fetch(proxyUrl, { method: 'POST', headers, body })
      if (retry.ok) res = retry
    }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? `Error OpenAI: ${res.status}`)
    return parseRecipeJSON(data.choices[0].message.content)
  }

  throw new Error('Configuración de IA no válida.')
}
