import type { StateUpdates } from '@/ai/agents/bookkeeperAgent'
import {
  addOrStackItem,
  applyCharacterDeltas,
  getCharacter,
  removeItemQuantity,
  upsertLoreEntry,
  upsertQuest,
} from './repository'
import type { LoreCategory, QuestStatus } from './schema'

const LORE_CATEGORIES: LoreCategory[] = ['npc', 'location', 'faction', 'history', 'item', 'monster']
const QUEST_STATUSES: QuestStatus[] = ['active', 'completed', 'failed']

/**
 * Writes Bookkeeper output to the database and returns one human-readable line
 * per change, which the Story screen surfaces as toasts (spec §4d).
 *
 * Everything here is defensive: the input is model output, so names are
 * trimmed, quantities floored, categories validated, and anything unrecognised
 * is dropped rather than written.
 */
export async function applyStateUpdates(
  campaignId: number,
  updates: StateUpdates,
  turnIndex: number,
): Promise<string[]> {
  const messages: string[] = []
  const character = await getCharacter(campaignId)
  const characterId = character?.id ?? 0

  for (const item of updates.new_items ?? []) {
    const name = cleanName(item?.name)
    if (!name) continue
    const quantity = clampQuantity(item.quantity)
    const outcome = await addOrStackItem(campaignId, characterId, {
      name,
      description: String(item.description ?? '').trim(),
      quantity,
      itemType: String(item.item_type ?? 'misc').trim().toLowerCase() || 'misc',
    })
    messages.push(
      outcome === 'stacked'
        ? `+${quantity} ${name} (now stacked)`
        : `+ ${name}${quantity > 1 ? ` ×${quantity}` : ''} added to inventory`,
    )
  }

  for (const item of updates.removed_items ?? []) {
    const name = cleanName(item?.name)
    if (!name) continue
    const quantity = clampQuantity(item.quantity)
    const removed = await removeItemQuantity(campaignId, name, quantity)
    if (removed) messages.push(`− ${name}${quantity > 1 ? ` ×${quantity}` : ''} removed`)
  }

  for (const quest of updates.quest_updates ?? []) {
    const title = cleanName(quest?.title)
    if (!title) continue
    const status = QUEST_STATUSES.includes(quest.status) ? quest.status : 'active'
    const outcome = await upsertQuest(campaignId, {
      title,
      status,
      logEntry: String(quest.log_entry ?? '').trim() || undefined,
      turn: turnIndex,
    })
    if (outcome === 'created') messages.push(`New quest: ${title}`)
    else if (outcome === 'updated') {
      messages.push(status === 'active' ? `Quest updated: ${title}` : `Quest ${status}: ${title}`)
    }
  }

  for (const entry of updates.new_lore_entries ?? []) {
    const name = cleanName(entry?.name)
    if (!name) continue
    const category = LORE_CATEGORIES.includes(entry.category) ? entry.category : 'history'
    const outcome = await upsertLoreEntry(campaignId, {
      category,
      name,
      description: String(entry.description ?? '').trim(),
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
      turn: turnIndex,
    })
    if (outcome === 'created') messages.push(`Compendium: ${name} (${category})`)
  }

  const characterUpdates = updates.character_updates
  if (characterUpdates) {
    const hpDelta = clampDelta(characterUpdates.hp_delta, 200)
    const xpDelta = clampDelta(characterUpdates.xp_delta, 10_000)
    const level = typeof characterUpdates.level === 'number' ? Math.round(characterUpdates.level) : null

    if (hpDelta || xpDelta || level) {
      const updated = await applyCharacterDeltas(campaignId, { hpDelta, xpDelta, level })
      if (updated) {
        if (hpDelta) {
          messages.push(
            hpDelta < 0
              ? `${hpDelta} HP (${updated.hpCurrent}/${updated.hpMax})`
              : `+${hpDelta} HP (${updated.hpCurrent}/${updated.hpMax})`,
          )
        }
        if (xpDelta) messages.push(`+${xpDelta} XP`)
        if (level && character && level !== character.level) {
          messages.push(`Level ${updated.level}!`)
        }
      }
    }
  }

  return messages
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  // Guard against the model echoing placeholders or empty schema fields.
  if (!trimmed || trimmed.length > 120 || /^(none|n\/a|null|unknown)$/i.test(trimmed)) return null
  return trimmed
}

function clampQuantity(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(999, Math.round(parsed)))
}

function clampDelta(value: unknown, limit: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return null
  return Math.max(-limit, Math.min(limit, Math.round(value)))
}
