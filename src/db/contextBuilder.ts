import {
  getCampaign,
  getCharacter,
  getNarrativeState,
  getRecentStoryLog,
  listLore,
  listQuestsByStatus,
} from './repository'
import type { Campaign, Character, LoreEntry, Quest, StoryLogEntry } from './schema'
import { abilityModifier } from '@/lib/format'

export interface TurnContext {
  campaign: Campaign
  character: Character | undefined
  activeQuests: Quest[]
  relevantLore: LoreEntry[]
  recentLog: StoryLogEntry[]
  directorBrief: string
}

/** How many compendium entries are worth spending prompt budget on per turn. */
const MAX_LORE_ENTRIES = 6

/**
 * Assembles the per-turn prompt context. Deliberately bounded: recent log tail,
 * active quests, and only the lore that overlaps with what is happening now, so
 * token cost stays roughly constant no matter how long the campaign runs.
 */
export async function buildContext(
  campaignId: number,
  playerInput: string,
  recentExchanges: number,
): Promise<TurnContext> {
  const [campaign, character, activeQuests, allLore, recentLog, narrativeState] = await Promise.all([
    getCampaign(campaignId),
    getCharacter(campaignId),
    listQuestsByStatus(campaignId, 'active'),
    listLore(campaignId),
    getRecentStoryLog(campaignId, recentExchanges),
    getNarrativeState(campaignId),
  ])

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const haystack = [playerInput, ...recentLog.slice(-4).map((entry) => entry.content)].join('\n')

  return {
    campaign,
    character,
    activeQuests,
    relevantLore: selectRelevantLore(allLore, haystack),
    recentLog,
    directorBrief: narrativeState?.directorBrief ?? '',
  }
}

/**
 * Cheap keyword/tag overlap rather than embeddings (spec §4d) — at a few dozen
 * entries per campaign this is both fast enough and easy to reason about.
 */
export function selectRelevantLore(entries: LoreEntry[], text: string): LoreEntry[] {
  if (entries.length === 0) return []
  const lowered = text.toLowerCase()
  const words = new Set(tokenize(lowered))

  const scored = entries.map((entry) => {
    let score = 0

    // A name appearing verbatim is the strongest possible signal.
    if (entry.name.length > 2 && lowered.includes(entry.name.toLowerCase())) score += 10

    // Partial name matches catch "Tallow" for "Reeve Tallow".
    for (const part of tokenize(entry.name.toLowerCase())) {
      if (words.has(part)) score += 4
    }

    for (const tag of entry.tags) {
      if (words.has(tag)) score += 2
    }

    // Recency: things met lately are more likely to still be on stage.
    score += Math.min(2, entry.firstEncounteredTurn / 50)

    return { entry, score }
  })

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LORE_ENTRIES)
    .map((row) => row.entry)
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'your', 'you', 'are',
  'was', 'were', 'his', 'her', 'its', 'they', 'them', 'have', 'has', 'had', 'but', 'not',
  'what', 'when', 'where', 'who', 'how', 'all', 'any', 'can', 'will', 'one', 'out', 'about',
])

function tokenize(text: string): string[] {
  return text
    .split(/[^a-z0-9']+/i)
    .map((word) => word.toLowerCase().replace(/'s$/, ''))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

/* ------------------------------------------------------------------ */
/* Prompt fragment rendering                                           */
/* ------------------------------------------------------------------ */

export function renderCharacterSummary(character: Character | undefined): string {
  if (!character) return 'No character sheet on file.'
  const stats = Object.entries(character.statsJson)
    .map(([name, score]) => `${name.slice(0, 3).toUpperCase()} ${score} (${abilityModifier(score)})`)
    .join(', ')
  return [
    `${character.name}, level ${character.level} ${character.race} ${character.characterClass}`,
    `HP ${character.hpCurrent}/${character.hpMax} · XP ${character.xp}`,
    stats,
    character.backstory ? `Backstory: ${character.backstory}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function renderQuestSummaries(quests: Quest[]): string {
  if (quests.length === 0) return 'None yet.'
  return quests
    .map((quest) => {
      const latest = quest.logJson.at(-1)
      return `- ${quest.title} (from ${quest.questGiver}): ${quest.description}${
        latest ? ` — latest: ${latest.note}` : ''
      }`
    })
    .join('\n')
}

export function renderLoreSnippets(entries: LoreEntry[]): string {
  if (entries.length === 0) return 'Nothing recorded yet.'
  return entries
    .map((entry) => `- [${entry.category}] ${entry.name}: ${entry.description}`)
    .join('\n')
}

export function renderRecentLog(entries: StoryLogEntry[]): string {
  if (entries.length === 0) return 'This is the opening scene of the campaign.'
  return entries
    .map((entry) => `${entry.role === 'player' ? 'Player' : 'DM'}: ${entry.content}`)
    .join('\n\n')
}
