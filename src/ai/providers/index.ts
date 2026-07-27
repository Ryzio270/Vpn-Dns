import type { AIProvider, ProviderId, ProviderTarget } from '@/ai/types'
import { OpenAICompatibleProvider } from './openAICompatible'

export interface ProviderCredentials {
  openRouterKey: string
  pollinationsKey: string
  /**
   * Pollinations limits by time between requests, not by daily quota:
   * anonymous is 1 req/15s, a free Seed account is 1 req/5s.
   */
  pollinationsTier: 'anonymous' | 'seed'
}

export interface ProviderMeta {
  id: ProviderId
  label: string
  baseUrl: string
  modelsUrl: string
  /** Minimum gap between requests this app will send to the provider. */
  minIntervalMs: number
  keyRequired: boolean
  keyHint: string
  signupUrl: string
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    // Free tier is 20 requests/minute; 3.1s spacing stays just inside it.
    minIntervalMs: 3100,
    keyRequired: true,
    keyHint: 'Free key from openrouter.ai/keys. A one-time $10 top-up raises the daily cap from 50 to 1,000.',
    signupUrl: 'https://openrouter.ai/keys',
  },
  pollinations: {
    id: 'pollinations',
    label: 'Pollinations',
    baseUrl: 'https://gen.pollinations.ai/v1',
    modelsUrl: 'https://gen.pollinations.ai/v1/models',
    minIntervalMs: 15_000,
    keyRequired: false,
    keyHint: 'Optional. A free account at auth.pollinations.ai unlocks the Seed tier (1 request/5s instead of 1/15s).',
    signupUrl: 'https://auth.pollinations.ai',
  },
}

export function providerInterval(id: ProviderId, credentials: ProviderCredentials): number {
  if (id === 'pollinations') {
    return credentials.pollinationsTier === 'seed' ? 5_000 : 15_000
  }
  return PROVIDERS[id].minIntervalMs
}

export function createProvider(target: ProviderTarget, credentials: ProviderCredentials): AIProvider {
  if (target.provider === 'openrouter') {
    return new OpenAICompatibleProvider(
      'openrouter',
      PROVIDERS.openrouter.baseUrl,
      credentials.openRouterKey,
      target.model,
      // OpenRouter uses these purely for its public app leaderboard; harmless
      // to send and it makes the traffic identifiable in the dashboard.
      { 'HTTP-Referer': 'https://github.com/', 'X-Title': 'Solo DM' },
    )
  }
  return new OpenAICompatibleProvider(
    'pollinations',
    PROVIDERS.pollinations.baseUrl,
    credentials.pollinationsKey,
    target.model,
  )
}

/* ------------------------------------------------------------------ */
/* Live model discovery                                                */
/* ------------------------------------------------------------------ */

export interface DiscoveredModel {
  id: string
  label: string
  free: boolean
}

/**
 * Both free rosters rotate without notice, so the app never trusts a baked-in
 * list as authoritative — this fetches whatever the provider offers right now.
 */
export async function fetchModels(
  id: ProviderId,
  credentials: ProviderCredentials,
): Promise<DiscoveredModel[]> {
  const meta = PROVIDERS[id]
  const key = id === 'openrouter' ? credentials.openRouterKey : credentials.pollinationsKey

  const res = await fetch(meta.modelsUrl, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  })
  if (!res.ok) throw new Error(`${meta.label} model list failed (${res.status})`)

  const payload = (await res.json()) as unknown
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] }).data ?? (payload as { models?: unknown[] }).models ?? [])

  const models: DiscoveredModel[] = []
  for (const row of rows as Array<Record<string, unknown>>) {
    const modelId = typeof row.id === 'string' ? row.id : typeof row.name === 'string' ? row.name : null
    if (!modelId) continue
    models.push({
      id: modelId,
      label: typeof row.name === 'string' ? row.name : modelId,
      free: isFreeModel(id, modelId, row),
    })
  }

  models.sort((a, b) => Number(b.free) - Number(a.free) || a.id.localeCompare(b.id))
  return models
}

function isFreeModel(id: ProviderId, modelId: string, row: Record<string, unknown>): boolean {
  if (id === 'openrouter') {
    if (modelId.endsWith(':free')) return true
    const pricing = row.pricing as { prompt?: string; completion?: string } | undefined
    return Number(pricing?.prompt ?? 1) === 0 && Number(pricing?.completion ?? 1) === 0
  }
  // Pollinations flags its metered models; anything not marked is $0-Pollen.
  if (row.tier === 'seed' || row.tier === 'anonymous') return true
  return row.pricing == null && row.paid !== true
}

/**
 * Starting suggestions only. The roster on both providers rotates, so these are
 * seeds for the picker, not guarantees — the Fetch button is the source of truth.
 */
export const SUGGESTED_MODELS: Record<ProviderId, string[]> = {
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-coder:free',
    'deepseek/deepseek-r1:free',
    'google/gemma-3-27b-it:free',
    'openai/gpt-oss-120b:free',
    'openrouter/free',
  ],
  pollinations: ['openai', 'openai-fast', 'gemini', 'deepseek', 'qwen-coder', 'mistral'],
}

export { OpenAICompatibleProvider }
