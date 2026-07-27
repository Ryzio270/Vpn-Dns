import { callAgent, type CallAgentOptions } from '@/ai/resilientChat'
import type { AgentConfig, ChatMessage } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'
import { parseJsonLoose } from '@/lib/json'

export interface StateUpdates {
  new_items: Array<{ name: string; description: string; quantity: number; item_type: string }>
  removed_items: Array<{ name: string; quantity: number }>
  quest_updates: Array<{
    title: string
    status: 'active' | 'completed' | 'failed'
    log_entry: string
    is_new: boolean
  }>
  new_lore_entries: Array<{
    category: 'npc' | 'location' | 'faction' | 'history' | 'item' | 'monster'
    name: string
    description: string
    tags: string[]
  }>
  character_updates: {
    hp_delta: number | null
    xp_delta: number | null
    level: number | null
    notes: string | null
  }
}

export const EMPTY_UPDATES: StateUpdates = {
  new_items: [],
  removed_items: [],
  quest_updates: [],
  new_lore_entries: [],
  character_updates: { hp_delta: null, xp_delta: null, level: null, notes: null },
}

const SYSTEM_PROMPT = `Extract structured game-state changes from this DM/player exchange.
Output ONLY valid JSON matching this schema — no prose, no markdown
fences:

{
  "new_items": [{"name": str, "description": str, "quantity": int, "item_type": str}],
  "removed_items": [{"name": str, "quantity": int}],
  "quest_updates": [{"title": str, "status": "active"|"completed"|"failed", "log_entry": str, "is_new": bool}],
  "new_lore_entries": [{"category": "npc"|"location"|"faction"|"history"|"item"|"monster", "name": str, "description": str, "tags": [str]}],
  "character_updates": {"hp_delta": int|null, "xp_delta": int|null, "level": int|null, "notes": str|null}
}

Only include things explicitly stated or unambiguously implied below.
Never invent numbers not present in the text. Empty categories -> [] or null.`

export function buildBookkeeperPrompt(playerInput: string, storyResponse: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `EXCHANGE:\nPlayer: ${playerInput}\nDM: ${storyResponse}`,
    },
  ]
}

export async function extractStateUpdates(
  config: AgentConfig,
  credentials: ProviderCredentials,
  playerInput: string,
  storyResponse: string,
  options: CallAgentOptions = {},
): Promise<StateUpdates> {
  const result = await callAgent(
    'bookkeeper',
    config,
    credentials,
    buildBookkeeperPrompt(playerInput, storyResponse),
    {
      // Extraction is not a creative task; near-zero temperature keeps it literal.
      temperature: 0.1,
      jsonMode: true,
      maxTokens: 900,
      ...options,
    },
  )
  return normalizeStateUpdates(parseJsonLoose<Partial<StateUpdates>>(result.content))
}

/**
 * Coerces whatever the model produced into the expected shape. Anything missing
 * or of the wrong type becomes an empty value rather than reaching the DB.
 */
export function normalizeStateUpdates(raw: Partial<StateUpdates> | null | undefined): StateUpdates {
  if (!raw || typeof raw !== 'object') return EMPTY_UPDATES

  const characterUpdates = (raw.character_updates ?? {}) as Partial<StateUpdates['character_updates']>

  return {
    new_items: asArray(raw.new_items).map((item) => ({
      name: String(item?.name ?? ''),
      description: String(item?.description ?? ''),
      quantity: toInt(item?.quantity, 1),
      item_type: String(item?.item_type ?? 'misc'),
    })),
    removed_items: asArray(raw.removed_items).map((item) => ({
      name: String(item?.name ?? ''),
      quantity: toInt(item?.quantity, 1),
    })),
    quest_updates: asArray(raw.quest_updates).map((quest) => ({
      title: String(quest?.title ?? ''),
      status:
        quest?.status === 'completed' || quest?.status === 'failed' ? quest.status : 'active',
      log_entry: String(quest?.log_entry ?? ''),
      is_new: Boolean(quest?.is_new),
    })),
    new_lore_entries: asArray(raw.new_lore_entries).map((entry) => ({
      category: entry?.category ?? 'history',
      name: String(entry?.name ?? ''),
      description: String(entry?.description ?? ''),
      tags: asArray(entry?.tags).map(String),
    })),
    character_updates: {
      hp_delta: toNullableInt(characterUpdates.hp_delta),
      xp_delta: toNullableInt(characterUpdates.xp_delta),
      level: toNullableInt(characterUpdates.level),
      notes: typeof characterUpdates.notes === 'string' ? characterUpdates.notes : null,
    },
  }
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function toInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}
