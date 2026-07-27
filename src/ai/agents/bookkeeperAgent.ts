import type { AgentConfig } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'

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

/** Stubbed in phase 4; the real extraction lands with the Bookkeeper phase. */
export async function extractStateUpdates(
  _config: AgentConfig,
  _credentials: ProviderCredentials,
  _playerInput: string,
  _storyResponse: string,
): Promise<StateUpdates> {
  return EMPTY_UPDATES
}
