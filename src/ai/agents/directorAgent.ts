import type { AgentConfig } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'

export interface DirectorUpdate {
  arc_summary: string
  unresolved_threads: string[]
  tone_notes: string
  director_brief: string
}

/** Stubbed in phase 4; the real story-bible pass lands with the Director phase. */
export async function updateStoryBible(
  _config: AgentConfig,
  _credentials: ProviderCredentials,
  _campaignId: number,
  _playerInput: string,
  _storyResponse: string,
): Promise<DirectorUpdate | null> {
  return null
}
