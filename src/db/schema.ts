import Dexie, { type EntityTable } from 'dexie'

/**
 * All ids are Dexie auto-increment numbers (`++id`). Route params arrive as
 * strings, so screens parse them once at the boundary and pass numbers inward.
 */

export type QuestStatus = 'active' | 'completed' | 'failed'

export type LoreCategory = 'npc' | 'location' | 'faction' | 'history' | 'item' | 'monster'

export type StoryRole = 'player' | 'dm'

export interface Campaign {
  id: number
  name: string
  settingSummary: string
  tone: string
  createdAt: number
  lastPlayedAt: number
}

/** The six classic ability scores. Stored as JSON so the shape can grow. */
export interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export interface Character {
  id: number
  campaignId: number
  name: string
  race: string
  characterClass: string
  level: number
  statsJson: CharacterStats
  hpCurrent: number
  hpMax: number
  xp: number
  backstory: string
}

export interface InventoryItem {
  id: number
  campaignId: number
  characterId: number
  name: string
  description: string
  quantity: number
  equipped: boolean
  itemType: string
  rarity: string
}

export interface QuestLogEntry {
  turn: number
  note: string
}

export interface Quest {
  id: number
  campaignId: number
  title: string
  description: string
  status: QuestStatus
  questGiver: string
  logJson: QuestLogEntry[]
}

export interface LoreEntry {
  id: number
  campaignId: number
  category: LoreCategory
  name: string
  description: string
  tags: string[]
  relatedEntryIds: number[]
  firstEncounteredTurn: number
}

export interface StoryLogEntry {
  id: number
  campaignId: number
  turnIndex: number
  role: StoryRole
  content: string
  timestamp: number
}

/** The Narrative Director's persistent scratchpad — one row per campaign. */
export interface NarrativeState {
  id: number
  campaignId: number
  arcSummary: string
  unresolvedThreadsJson: string[]
  toneNotes: string
  pacingNotes: string
  directorBrief: string
  lastUpdatedTurn: number
}

const db = new Dexie('solo-dm') as Dexie & {
  campaigns: EntityTable<Campaign, 'id'>
  characters: EntityTable<Character, 'id'>
  inventoryItems: EntityTable<InventoryItem, 'id'>
  quests: EntityTable<Quest, 'id'>
  loreEntries: EntityTable<LoreEntry, 'id'>
  storyLog: EntityTable<StoryLogEntry, 'id'>
  narrativeState: EntityTable<NarrativeState, 'id'>
}

/**
 * Compound indexes beyond the spec's minimum are included so per-campaign reads
 * stay index-backed rather than table scans as a save grows.
 */
db.version(1).stores({
  campaigns: '++id, name, lastPlayedAt',
  characters: '++id, campaignId, name',
  inventoryItems: '++id, campaignId, characterId, name, [campaignId+name]',
  quests: '++id, campaignId, status, title, [campaignId+status], [campaignId+title]',
  loreEntries: '++id, campaignId, category, name, *tags, [campaignId+category], [campaignId+name]',
  storyLog: '++id, campaignId, turnIndex, [campaignId+turnIndex]',
  narrativeState: '++id, campaignId',
})

export { db }
