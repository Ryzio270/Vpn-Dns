import { Preferences } from '@capacitor/preferences'
import { create } from 'zustand'

import type { AgentConfig, AgentId } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'

const STORAGE_KEY = 'solo-dm.settings.v1'

export type ThemeMode = 'dark' | 'light'

export interface Settings {
  openRouterKey: string
  pollinationsKey: string
  pollinationsTier: 'anonymous' | 'seed'
  agents: Record<AgentId, AgentConfig>
  theme: ThemeMode
  /** Story-log exchanges handed to the Story Agent each turn (spec §4d: ~6). */
  recentExchanges: number
  /** Run the Director every N turns; 1 = every turn. Higher saves free-tier calls. */
  directorEveryNTurns: number
  /** Shows the Director's current brief on the Story screen — useful for tuning. */
  showDirectorBrief: boolean
}

/**
 * Defaults follow the split in spec §2: the Story agent takes OpenRouter's
 * better free models, the Bookkeeper runs entirely on Pollinations so its
 * per-turn JSON calls never touch OpenRouter's daily budget, and the Director
 * takes a lighter OpenRouter model. Every slot is user-editable.
 */
export const DEFAULT_SETTINGS: Settings = {
  openRouterKey: '',
  pollinationsKey: '',
  pollinationsTier: 'anonymous',
  agents: {
    story: {
      primary: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
      fallbacks: [
        // OpenRouter's auto-router picks whatever free model is alive right now.
        { provider: 'openrouter', model: 'openrouter/free' },
        { provider: 'pollinations', model: 'openai' },
      ],
    },
    bookkeeper: {
      primary: { provider: 'pollinations', model: 'openai' },
      fallbacks: [{ provider: 'openrouter', model: 'qwen/qwen3-coder:free' }],
    },
    director: {
      primary: { provider: 'openrouter', model: 'google/gemma-3-27b-it:free' },
      fallbacks: [{ provider: 'pollinations', model: 'openai-fast' }],
    },
  },
  theme: 'dark',
  recentExchanges: 6,
  directorEveryNTurns: 1,
  showDirectorBrief: false,
}

interface SettingsState extends Settings {
  hydrated: boolean
  hydrate: () => Promise<void>
  update: (patch: Partial<Settings>) => void
  setAgentConfig: (agent: AgentId, config: AgentConfig) => void
  resetAgentsToDefaults: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY })
      if (value) {
        set({ ...mergeWithDefaults(JSON.parse(value) as Partial<Settings>), hydrated: true })
        return
      }
    } catch {
      // A corrupt or unreadable blob should not stop the app from starting.
    }
    set({ hydrated: true })
  },

  update: (patch) => {
    set(patch)
    void persist(get())
  },

  setAgentConfig: (agent, config) => {
    set((state) => ({ agents: { ...state.agents, [agent]: config } }))
    void persist(get())
  },

  resetAgentsToDefaults: () => {
    set({ agents: structuredClone(DEFAULT_SETTINGS.agents) })
    void persist(get())
  },
}))

async function persist(state: Settings): Promise<void> {
  const payload: Settings = {
    openRouterKey: state.openRouterKey,
    pollinationsKey: state.pollinationsKey,
    pollinationsTier: state.pollinationsTier,
    agents: state.agents,
    theme: state.theme,
    recentExchanges: state.recentExchanges,
    directorEveryNTurns: state.directorEveryNTurns,
    showDirectorBrief: state.showDirectorBrief,
  }
  try {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(payload) })
  } catch {
    // Preferences is unavailable in some embedded webviews; settings then live
    // for the session only rather than the app failing outright.
  }
}

/** Older saved blobs may predate a field; defaults fill the gaps. */
function mergeWithDefaults(stored: Partial<Settings>): Settings {
  const agents = { ...structuredClone(DEFAULT_SETTINGS.agents) }
  for (const agent of Object.keys(agents) as AgentId[]) {
    const saved = stored.agents?.[agent]
    if (saved?.primary?.model) {
      agents[agent] = { primary: saved.primary, fallbacks: saved.fallbacks ?? [] }
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    agents,
  }
}

/** Credentials in the shape the provider registry expects. */
export function selectCredentials(state: Settings): ProviderCredentials {
  return {
    openRouterKey: state.openRouterKey,
    pollinationsKey: state.pollinationsKey,
    pollinationsTier: state.pollinationsTier,
  }
}

/**
 * True when at least one target in the agent's chain could actually be reached:
 * Pollinations works anonymously, OpenRouter always needs a key.
 */
export function agentIsReachable(settings: Settings, agent: AgentId): boolean {
  const config = settings.agents[agent]
  return [config.primary, ...config.fallbacks].some(
    (target) =>
      target.model.trim().length > 0 &&
      (target.provider === 'pollinations' || settings.openRouterKey.trim().length > 0),
  )
}

export const AGENT_LABELS: Record<AgentId, { title: string; blurb: string }> = {
  story: {
    title: 'Story',
    blurb: 'Writes the prose. Quality matters most; fires once per turn.',
  },
  bookkeeper: {
    title: 'Bookkeeper',
    blurb: 'Extracts inventory, quest and lore changes as JSON. Short and frequent.',
  },
  director: {
    title: 'Narrative Director',
    blurb: 'Maintains the story bible and briefs the DM for the next turn.',
  },
}
