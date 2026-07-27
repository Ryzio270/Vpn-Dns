import { callAgent, type CallAgentOptions } from '@/ai/resilientChat'
import type { AgentConfig, ChatMessage } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'
import { getNarrativeState, saveNarrativeState } from '@/db/repository'
import { parseJsonLoose } from '@/lib/json'

export interface DirectorUpdate {
  arc_summary: string
  unresolved_threads: string[]
  tone_notes: string
  director_brief: string
}

const SYSTEM_PROMPT = `You are the long-term story architect for an ongoing solo RPG campaign.
You do not write prose — you maintain narrative continuity and brief
the DM-writer agent.

Return JSON only, no markdown fences:
{
  "arc_summary": str,
  "unresolved_threads": [str],
  "tone_notes": str,
  "director_brief": str
}

arc_summary is an updated 3-6 sentence running plot summary.
director_brief is 2-4 sentences on what to nudge toward next turn.`

export function buildDirectorPrompt(
  existing: {
    arcSummary: string
    unresolvedThreads: string[]
    toneNotes: string
  },
  playerInput: string,
  storyResponse: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `CURRENT STORY BIBLE:
${existing.arcSummary || 'Nothing yet — this is the start of the campaign.'}
Unresolved threads: ${existing.unresolvedThreads.length ? existing.unresolvedThreads.join('; ') : 'none yet'}
Tone/pacing notes: ${existing.toneNotes || 'not yet established'}

LATEST EXCHANGE:
Player: ${playerInput}
DM: ${storyResponse}`,
    },
  ]
}

/**
 * Reads the current story bible, asks the Director to advance it, and writes the
 * result back. The brief it produces is what steers the Story agent next turn.
 */
export async function updateStoryBible(
  config: AgentConfig,
  credentials: ProviderCredentials,
  campaignId: number,
  playerInput: string,
  storyResponse: string,
  turnIndex: number,
  options: CallAgentOptions = {},
): Promise<DirectorUpdate | null> {
  const existing = await getNarrativeState(campaignId)

  const result = await callAgent(
    'director',
    config,
    credentials,
    buildDirectorPrompt(
      {
        arcSummary: existing?.arcSummary ?? '',
        unresolvedThreads: existing?.unresolvedThreadsJson ?? [],
        toneNotes: existing?.toneNotes ?? '',
      },
      playerInput,
      storyResponse,
    ),
    { temperature: 0.4, jsonMode: true, maxTokens: 800, ...options },
  )

  const update = normalizeDirectorUpdate(parseJsonLoose<Partial<DirectorUpdate>>(result.content))
  if (!update) return null

  await saveNarrativeState(campaignId, {
    arcSummary: update.arc_summary,
    unresolvedThreadsJson: update.unresolved_threads,
    toneNotes: update.tone_notes,
    directorBrief: update.director_brief,
    lastUpdatedTurn: turnIndex,
  })

  return update
}

/**
 * A Director response that carries no brief is worse than none at all — it
 * would blank the field the Story agent reads — so an empty result is dropped.
 */
export function normalizeDirectorUpdate(
  raw: Partial<DirectorUpdate> | null | undefined,
): DirectorUpdate | null {
  if (!raw || typeof raw !== 'object') return null

  const brief = typeof raw.director_brief === 'string' ? raw.director_brief.trim() : ''
  const arcSummary = typeof raw.arc_summary === 'string' ? raw.arc_summary.trim() : ''
  if (!brief && !arcSummary) return null

  return {
    arc_summary: arcSummary,
    unresolved_threads: Array.isArray(raw.unresolved_threads)
      ? raw.unresolved_threads.map(String).filter((thread) => thread.trim()).slice(0, 12)
      : [],
    tone_notes: typeof raw.tone_notes === 'string' ? raw.tone_notes.trim() : '',
    director_brief: brief,
  }
}
