import {
  db,
  type Campaign,
  type Character,
  type CharacterStats,
  type InventoryItem,
  type LoreCategory,
  type LoreEntry,
  type NarrativeState,
  type Quest,
  type QuestStatus,
  type StoryLogEntry,
  type StoryRole,
} from './schema'

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_STATS: CharacterStats = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
}

export interface NewCampaignInput {
  name: string
  settingSummary: string
  tone: string
  character: {
    name: string
    race: string
    characterClass: string
    backstory: string
  }
}

/**
 * Creating a campaign always creates its character and narrative-state rows in
 * the same transaction, so no screen ever has to cope with a half-built save.
 */
export async function createCampaign(input: NewCampaignInput): Promise<number> {
  const now = Date.now()
  return db.transaction('rw', db.campaigns, db.characters, db.narrativeState, async () => {
    const campaignId = await db.campaigns.add({
      name: input.name,
      settingSummary: input.settingSummary,
      tone: input.tone,
      createdAt: now,
      lastPlayedAt: now,
    })

    await db.characters.add({
      campaignId,
      name: input.character.name,
      race: input.character.race,
      characterClass: input.character.characterClass,
      level: 1,
      statsJson: { ...DEFAULT_STATS },
      hpCurrent: 10,
      hpMax: 10,
      xp: 0,
      backstory: input.character.backstory,
    })

    await db.narrativeState.add({
      campaignId,
      arcSummary: '',
      unresolvedThreadsJson: [],
      toneNotes: input.tone,
      pacingNotes: '',
      directorBrief: '',
      lastUpdatedTurn: -1,
    })

    return campaignId
  })
}

export function listCampaigns(): Promise<Campaign[]> {
  return db.campaigns.orderBy('lastPlayedAt').reverse().toArray()
}

export function getCampaign(campaignId: number): Promise<Campaign | undefined> {
  return db.campaigns.get(campaignId)
}

export async function updateCampaign(
  campaignId: number,
  changes: Partial<Omit<Campaign, 'id'>>,
): Promise<void> {
  await db.campaigns.update(campaignId, changes)
}

export async function touchCampaign(campaignId: number): Promise<void> {
  await db.campaigns.update(campaignId, { lastPlayedAt: Date.now() })
}

/** Deletes the campaign and every row that belongs to it. */
export async function deleteCampaign(campaignId: number): Promise<void> {
  await db.transaction(
    'rw',
    [db.campaigns, db.characters, db.inventoryItems, db.quests, db.loreEntries, db.storyLog, db.narrativeState],
    async () => {
      await Promise.all([
        db.characters.where('campaignId').equals(campaignId).delete(),
        db.inventoryItems.where('campaignId').equals(campaignId).delete(),
        db.quests.where('campaignId').equals(campaignId).delete(),
        db.loreEntries.where('campaignId').equals(campaignId).delete(),
        db.storyLog.where('campaignId').equals(campaignId).delete(),
        db.narrativeState.where('campaignId').equals(campaignId).delete(),
      ])
      await db.campaigns.delete(campaignId)
    },
  )
}

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

export function getCharacter(campaignId: number): Promise<Character | undefined> {
  return db.characters.where('campaignId').equals(campaignId).first()
}

export async function updateCharacter(
  characterId: number,
  changes: Partial<Omit<Character, 'id' | 'campaignId'>>,
): Promise<void> {
  await db.characters.update(characterId, changes)
}

/**
 * Applies HP/XP/level deltas from the Bookkeeper. HP is clamped to [0, hpMax]
 * so a hostile or confused extraction can't push the sheet into nonsense.
 */
export async function applyCharacterDeltas(
  campaignId: number,
  deltas: { hpDelta?: number | null; xpDelta?: number | null; level?: number | null },
): Promise<Character | undefined> {
  return db.transaction('rw', db.characters, async () => {
    const character = await db.characters.where('campaignId').equals(campaignId).first()
    if (!character) return undefined

    const changes: Partial<Character> = {}
    if (typeof deltas.hpDelta === 'number' && deltas.hpDelta !== 0) {
      changes.hpCurrent = Math.max(0, Math.min(character.hpMax, character.hpCurrent + deltas.hpDelta))
    }
    if (typeof deltas.xpDelta === 'number' && deltas.xpDelta !== 0) {
      changes.xp = Math.max(0, character.xp + deltas.xpDelta)
    }
    if (typeof deltas.level === 'number' && deltas.level !== character.level) {
      changes.level = Math.max(1, deltas.level)
      // Levelling raises the ceiling; keep current HP proportionally sane.
      const levelsGained = changes.level - character.level
      if (levelsGained > 0) {
        changes.hpMax = character.hpMax + levelsGained * 6
        changes.hpCurrent = (changes.hpCurrent ?? character.hpCurrent) + levelsGained * 6
      }
    }

    if (Object.keys(changes).length === 0) return character
    await db.characters.update(character.id, changes)
    return { ...character, ...changes }
  })
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export function listInventory(campaignId: number): Promise<InventoryItem[]> {
  return db.inventoryItems.where('campaignId').equals(campaignId).toArray()
}

/** Adds quantity to a same-named stack when one exists, otherwise inserts. */
export async function addOrStackItem(
  campaignId: number,
  characterId: number,
  item: { name: string; description: string; quantity: number; itemType: string; rarity?: string },
): Promise<'added' | 'stacked'> {
  return db.transaction('rw', db.inventoryItems, async () => {
    const existing = await db.inventoryItems
      .where('[campaignId+name]')
      .equals([campaignId, item.name])
      .first()

    if (existing) {
      await db.inventoryItems.update(existing.id, {
        quantity: existing.quantity + Math.max(1, item.quantity),
      })
      return 'stacked' as const
    }

    await db.inventoryItems.add({
      campaignId,
      characterId,
      name: item.name,
      description: item.description,
      quantity: Math.max(1, item.quantity),
      equipped: false,
      itemType: item.itemType || 'misc',
      rarity: item.rarity || 'common',
    })
    return 'added' as const
  })
}

/** Removes quantity from a stack, deleting the row when it empties. */
export async function removeItemQuantity(
  campaignId: number,
  name: string,
  quantity: number,
): Promise<boolean> {
  return db.transaction('rw', db.inventoryItems, async () => {
    const existing = await db.inventoryItems.where('[campaignId+name]').equals([campaignId, name]).first()
    if (!existing) return false

    const remaining = existing.quantity - Math.max(1, quantity)
    if (remaining <= 0) {
      await db.inventoryItems.delete(existing.id)
    } else {
      await db.inventoryItems.update(existing.id, { quantity: remaining })
    }
    return true
  })
}

export async function updateItem(
  itemId: number,
  changes: Partial<Omit<InventoryItem, 'id' | 'campaignId'>>,
): Promise<void> {
  await db.inventoryItems.update(itemId, changes)
}

export async function deleteItem(itemId: number): Promise<void> {
  await db.inventoryItems.delete(itemId)
}

/* ------------------------------------------------------------------ */
/* Quests                                                              */
/* ------------------------------------------------------------------ */

export function listQuests(campaignId: number): Promise<Quest[]> {
  return db.quests.where('campaignId').equals(campaignId).toArray()
}

export function listQuestsByStatus(campaignId: number, status: QuestStatus): Promise<Quest[]> {
  return db.quests.where('[campaignId+status]').equals([campaignId, status]).toArray()
}

/**
 * Upserts by title: the Bookkeeper refers to quests by name, not id, so a
 * repeated title is treated as an update to the existing quest.
 */
export async function upsertQuest(
  campaignId: number,
  update: {
    title: string
    status: QuestStatus
    logEntry?: string
    turn: number
    description?: string
    questGiver?: string
  },
): Promise<'created' | 'updated' | 'unchanged'> {
  return db.transaction('rw', db.quests, async () => {
    const existing = await db.quests.where('[campaignId+title]').equals([campaignId, update.title]).first()

    if (!existing) {
      await db.quests.add({
        campaignId,
        title: update.title,
        description: update.description ?? update.logEntry ?? '',
        status: update.status,
        questGiver: update.questGiver ?? 'Unknown',
        logJson: update.logEntry ? [{ turn: update.turn, note: update.logEntry }] : [],
      })
      return 'created' as const
    }

    const logJson = [...existing.logJson]
    const isNewNote = update.logEntry && !logJson.some((entry) => entry.note === update.logEntry)
    if (update.logEntry && isNewNote) {
      logJson.push({ turn: update.turn, note: update.logEntry })
    }

    const statusChanged = existing.status !== update.status
    if (!statusChanged && !isNewNote) return 'unchanged' as const

    await db.quests.update(existing.id, { status: update.status, logJson })
    return 'updated' as const
  })
}

export async function updateQuest(
  questId: number,
  changes: Partial<Omit<Quest, 'id' | 'campaignId'>>,
): Promise<void> {
  await db.quests.update(questId, changes)
}

export async function deleteQuest(questId: number): Promise<void> {
  await db.quests.delete(questId)
}

/* ------------------------------------------------------------------ */
/* Lore / Compendium                                                   */
/* ------------------------------------------------------------------ */

export function listLore(campaignId: number): Promise<LoreEntry[]> {
  return db.loreEntries.where('campaignId').equals(campaignId).toArray()
}

export function getLoreEntry(entryId: number): Promise<LoreEntry | undefined> {
  return db.loreEntries.get(entryId)
}

/** Upserts by name; a repeat sighting enriches the existing entry's tags. */
export async function upsertLoreEntry(
  campaignId: number,
  entry: {
    category: LoreCategory
    name: string
    description: string
    tags: string[]
    turn: number
  },
): Promise<'created' | 'updated' | 'unchanged'> {
  return db.transaction('rw', db.loreEntries, async () => {
    const existing = await db.loreEntries.where('[campaignId+name]').equals([campaignId, entry.name]).first()

    if (!existing) {
      await db.loreEntries.add({
        campaignId,
        category: entry.category,
        name: entry.name,
        description: entry.description,
        tags: normalizeTags(entry.tags),
        relatedEntryIds: [],
        firstEncounteredTurn: entry.turn,
      })
      return 'created' as const
    }

    const mergedTags = normalizeTags([...existing.tags, ...entry.tags])
    const gainedTags = mergedTags.length !== existing.tags.length
    // Only replace the description when the newer one is meaningfully richer.
    const betterDescription =
      entry.description.length > existing.description.length + 40 ? entry.description : null

    if (!gainedTags && !betterDescription) return 'unchanged' as const

    await db.loreEntries.update(existing.id, {
      tags: mergedTags,
      ...(betterDescription ? { description: betterDescription } : {}),
    })
    return 'updated' as const
  })
}

export async function updateLoreEntry(
  entryId: number,
  changes: Partial<Omit<LoreEntry, 'id' | 'campaignId'>>,
): Promise<void> {
  await db.loreEntries.update(entryId, changes)
}

export async function deleteLoreEntry(entryId: number): Promise<void> {
  await db.loreEntries.delete(entryId)
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase()
    if (clean) seen.add(clean)
  }
  return [...seen]
}

/* ------------------------------------------------------------------ */
/* Story log                                                           */
/* ------------------------------------------------------------------ */

export function listStoryLog(campaignId: number): Promise<StoryLogEntry[]> {
  return db.storyLog.where('campaignId').equals(campaignId).sortBy('turnIndex')
}

export async function getNextTurnIndex(campaignId: number): Promise<number> {
  const last = await db.storyLog.where('campaignId').equals(campaignId).last()
  return (last?.turnIndex ?? -1) + 1
}

export async function appendStoryEntry(
  campaignId: number,
  role: StoryRole,
  content: string,
): Promise<StoryLogEntry> {
  return db.transaction('rw', db.storyLog, db.campaigns, async () => {
    const turnIndex = await getNextTurnIndex(campaignId)
    const entry = {
      campaignId,
      turnIndex,
      role,
      content,
      timestamp: Date.now(),
    }
    const id = await db.storyLog.add(entry)
    await db.campaigns.update(campaignId, { lastPlayedAt: Date.now() })
    return { ...entry, id }
  })
}

/** Returns the tail of the log — the Story Agent never sees full history. */
export async function getRecentStoryLog(
  campaignId: number,
  exchanges: number,
): Promise<StoryLogEntry[]> {
  const messages = exchanges * 2
  const tail = await db.storyLog.where('campaignId').equals(campaignId).reverse().limit(messages).toArray()
  return tail.sort((a, b) => a.turnIndex - b.turnIndex)
}

/* ------------------------------------------------------------------ */
/* Narrative state                                                     */
/* ------------------------------------------------------------------ */

export function getNarrativeState(campaignId: number): Promise<NarrativeState | undefined> {
  return db.narrativeState.where('campaignId').equals(campaignId).first()
}

export async function saveNarrativeState(
  campaignId: number,
  changes: Partial<Omit<NarrativeState, 'id' | 'campaignId'>>,
): Promise<void> {
  await db.transaction('rw', db.narrativeState, async () => {
    const existing = await db.narrativeState.where('campaignId').equals(campaignId).first()
    if (existing) {
      await db.narrativeState.update(existing.id, changes)
      return
    }
    await db.narrativeState.add({
      campaignId,
      arcSummary: '',
      unresolvedThreadsJson: [],
      toneNotes: '',
      pacingNotes: '',
      directorBrief: '',
      lastUpdatedTurn: -1,
      ...changes,
    })
  })
}
