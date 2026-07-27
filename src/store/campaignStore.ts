import { create } from 'zustand'

/**
 * Transient per-turn state. Anything durable lives in Dexie; this store only
 * holds what the UI needs between the player pressing Send and the DM's reply
 * landing in the story log.
 */
interface CampaignState {
  /** Player message shown optimistically before it is persisted. */
  pendingPlayerMessage: string | null
  isStoryGenerating: boolean
  /** Set when the Story Agent exhausted primary and fallback providers. */
  storyError: string | null
  /** The input that produced storyError, so it can be retried verbatim. */
  lastFailedInput: string | null
  /** Bookkeeper/Director still running after the prose has already rendered. */
  backgroundAgents: string[]

  beginTurn: (input: string) => void
  endTurn: () => void
  failTurn: (message: string, input: string) => void
  clearStoryError: () => void
  setBackgroundAgent: (agent: string, running: boolean) => void
  reset: () => void
}

export const useCampaignStore = create<CampaignState>((set) => ({
  pendingPlayerMessage: null,
  isStoryGenerating: false,
  storyError: null,
  lastFailedInput: null,
  backgroundAgents: [],

  beginTurn: (input) =>
    set({
      pendingPlayerMessage: input,
      isStoryGenerating: true,
      storyError: null,
      lastFailedInput: null,
    }),

  endTurn: () => set({ pendingPlayerMessage: null, isStoryGenerating: false }),

  failTurn: (message, input) =>
    set({
      pendingPlayerMessage: null,
      isStoryGenerating: false,
      storyError: message,
      lastFailedInput: input,
    }),

  clearStoryError: () => set({ storyError: null, lastFailedInput: null }),

  setBackgroundAgent: (agent, running) =>
    set((state) => ({
      backgroundAgents: running
        ? state.backgroundAgents.includes(agent)
          ? state.backgroundAgents
          : [...state.backgroundAgents, agent]
        : state.backgroundAgents.filter((name) => name !== agent),
    })),

  reset: () =>
    set({
      pendingPlayerMessage: null,
      isStoryGenerating: false,
      storyError: null,
      lastFailedInput: null,
      backgroundAgents: [],
    }),
}))
