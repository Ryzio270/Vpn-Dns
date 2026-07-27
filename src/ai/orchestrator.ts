import { extractStateUpdates } from '@/ai/agents/bookkeeperAgent'
import { updateStoryBible } from '@/ai/agents/directorAgent'
import { generateStory } from '@/ai/agents/storyAgent'
import type { AgentId, ProviderTarget } from '@/ai/types'
import { appendStoryEntry, getNextTurnIndex } from '@/db/repository'
import { buildContext } from '@/db/contextBuilder'
import { applyStateUpdates } from '@/db/stateUpdates'
import { selectCredentials, type Settings } from '@/store/settingsStore'

export interface TurnEvents {
  /** A provider in an agent's chain failed and the next one is being tried. */
  onFallback?: (agent: AgentId, info: { failed: ProviderTarget; next: ProviderTarget; reason: string }) => void
  /** Background agent started or finished, for the "working…" indicator. */
  onBackgroundAgent?: (agent: AgentId, running: boolean) => void
  /** A background agent failed. Never fatal — the prose is already on screen. */
  onBackgroundError?: (agent: AgentId, error: unknown) => void
  /** Bookkeeper wrote something; surfaced as a toast per change. */
  onStateChange?: (message: string) => void
}

export interface TurnResult {
  storyResponse: string
  target: ProviderTarget
  usedFallback: boolean
}

/**
 * Spec §4d. The Story agent is awaited because its prose is the turn; the
 * Bookkeeper and Director run afterwards without blocking the read.
 */
export async function handlePlayerTurn(
  campaignId: number,
  playerInput: string,
  settings: Settings,
  events: TurnEvents = {},
): Promise<TurnResult> {
  const credentials = selectCredentials(settings)
  const context = await buildContext(campaignId, playerInput, settings.recentExchanges)

  const story = await generateStory(
    settings.agents.story,
    credentials,
    context,
    playerInput,
    settings.recentExchanges,
    {
      onFallback: (info) => events.onFallback?.('story', info),
    },
  )

  await appendStoryEntry(campaignId, 'player', playerInput)
  await appendStoryEntry(campaignId, 'dm', story.content)

  // Fire-and-forget: the UI has the prose already and must not wait on these.
  void runBackgroundAgents(campaignId, playerInput, story.content, settings, events)

  return { storyResponse: story.content, target: story.target, usedFallback: story.usedFallback }
}

async function runBackgroundAgents(
  campaignId: number,
  playerInput: string,
  storyResponse: string,
  settings: Settings,
  events: TurnEvents,
): Promise<void> {
  const credentials = selectCredentials(settings)
  const turnIndex = await getNextTurnIndex(campaignId)

  const bookkeeper = (async () => {
    events.onBackgroundAgent?.('bookkeeper', true)
    try {
      const updates = await extractStateUpdates(
        settings.agents.bookkeeper,
        credentials,
        playerInput,
        storyResponse,
      )
      const messages = await applyStateUpdates(campaignId, updates, turnIndex)
      for (const message of messages) events.onStateChange?.(message)
    } catch (error) {
      events.onBackgroundError?.('bookkeeper', error)
    } finally {
      events.onBackgroundAgent?.('bookkeeper', false)
    }
  })()

  const director = (async () => {
    // Cadence lets the user trade plot responsiveness for free-tier headroom.
    const cadence = Math.max(1, settings.directorEveryNTurns)
    const exchangeIndex = Math.floor(turnIndex / 2)
    if (exchangeIndex % cadence !== 0) return

    events.onBackgroundAgent?.('director', true)
    try {
      await updateStoryBible(
        settings.agents.director,
        credentials,
        campaignId,
        playerInput,
        storyResponse,
      )
    } catch (error) {
      events.onBackgroundError?.('director', error)
    } finally {
      events.onBackgroundAgent?.('director', false)
    }
  })()

  await Promise.allSettled([bookkeeper, director])
}
