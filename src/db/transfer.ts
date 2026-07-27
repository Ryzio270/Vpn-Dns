import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

import {
  db,
  type Campaign,
  type Character,
  type InventoryItem,
  type LoreEntry,
  type NarrativeState,
  type Quest,
  type StoryLogEntry,
} from './schema'

export const EXPORT_FORMAT = 'solo-dm-campaign'
export const EXPORT_VERSION = 1

export interface CampaignExport {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  campaign: Omit<Campaign, 'id'>
  characters: Array<Omit<Character, 'id' | 'campaignId'>>
  inventoryItems: Array<Omit<InventoryItem, 'id' | 'campaignId' | 'characterId'>>
  quests: Array<Omit<Quest, 'id' | 'campaignId'>>
  loreEntries: Array<Omit<LoreEntry, 'id' | 'campaignId' | 'relatedEntryIds'> & {
    relatedEntryNames: string[]
  }>
  storyLog: Array<Omit<StoryLogEntry, 'id' | 'campaignId'>>
  narrativeState: Omit<NarrativeState, 'id' | 'campaignId'> | null
}

/**
 * Serializes a campaign with all row ids stripped. Lore cross-links are carried
 * as names rather than ids so they survive the re-keying on import.
 */
export async function buildCampaignExport(campaignId: number): Promise<CampaignExport> {
  const campaign = await db.campaigns.get(campaignId)
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const [characters, inventoryItems, quests, loreEntries, storyLog, narrativeState] = await Promise.all([
    db.characters.where('campaignId').equals(campaignId).toArray(),
    db.inventoryItems.where('campaignId').equals(campaignId).toArray(),
    db.quests.where('campaignId').equals(campaignId).toArray(),
    db.loreEntries.where('campaignId').equals(campaignId).toArray(),
    db.storyLog.where('campaignId').equals(campaignId).sortBy('turnIndex'),
    db.narrativeState.where('campaignId').equals(campaignId).first(),
  ])

  const loreNameById = new Map<number, string>()
  for (const entry of loreEntries) {
    loreNameById.set(entry.id, entry.name)
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    campaign: stripKeys(campaign, ['id']),
    characters: characters.map((row) => stripKeys(row, ['id', 'campaignId'])),
    inventoryItems: inventoryItems.map((row) => stripKeys(row, ['id', 'campaignId', 'characterId'])),
    quests: quests.map((row) => stripKeys(row, ['id', 'campaignId'])),
    loreEntries: loreEntries.map((row) => ({
      ...stripKeys(row, ['id', 'campaignId', 'relatedEntryIds']),
      relatedEntryNames: row.relatedEntryIds
        .map((id) => loreNameById.get(id))
        .filter((name): name is string => Boolean(name)),
    })),
    storyLog: storyLog.map((row) => stripKeys(row, ['id', 'campaignId'])),
    narrativeState: narrativeState ? stripKeys(narrativeState, ['id', 'campaignId']) : null,
  }
}

export function exportFileName(campaignName: string): string {
  const slug =
    campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'campaign'
  const stamp = new Date().toISOString().slice(0, 10)
  return `solo-dm-${slug}-${stamp}.json`
}

export interface ExportResult {
  fileName: string
  /** Where the file landed, for display. Null on web (browser download). */
  location: string | null
}

/**
 * Writes the save file. On Android this goes to the shared Documents directory
 * so the user can find it in a file manager; on web it falls back to a download.
 */
export async function exportCampaignToFile(campaignId: number): Promise<ExportResult> {
  const payload = await buildCampaignExport(campaignId)
  const json = JSON.stringify(payload, null, 2)
  const fileName = exportFileName(payload.campaign.name)

  if (Capacitor.isNativePlatform()) {
    await ensureFilesystemPermission()
    const result = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return { fileName, location: result.uri }
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
  return { fileName, location: null }
}

/**
 * Writing to shared Documents needs the storage permission on Android 10 and
 * below; from API 30 scoped storage covers it and the check is a no-op.
 */
async function ensureFilesystemPermission(): Promise<void> {
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage === 'granted') return
    const requested = await Filesystem.requestPermissions()
    if (requested.publicStorage !== 'granted') {
      throw new Error('Storage permission is required to write the save file.')
    }
  } catch (error) {
    // On API 30+ the plugin may not implement the check at all — that is fine,
    // the write itself will succeed. Only a real denial should stop the export.
    if (error instanceof Error && error.message.includes('Storage permission')) throw error
  }
}

function isCampaignExport(value: unknown): value is CampaignExport {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CampaignExport>
  return (
    candidate.format === EXPORT_FORMAT &&
    typeof candidate.version === 'number' &&
    typeof candidate.campaign === 'object' &&
    Array.isArray(candidate.storyLog)
  )
}

/**
 * Imports a save as a brand-new campaign — never overwrites an existing one, so
 * importing the same file twice yields two independent saves.
 */
export async function importCampaignFromJson(text: string): Promise<number> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!isCampaignExport(parsed)) {
    throw new Error('That file is not a Solo DM campaign export.')
  }
  if (parsed.version > EXPORT_VERSION) {
    throw new Error(
      `That save was made by a newer version of the app (format v${parsed.version}). Update first.`,
    )
  }

  const data = parsed

  return db.transaction(
    'rw',
    [db.campaigns, db.characters, db.inventoryItems, db.quests, db.loreEntries, db.storyLog, db.narrativeState],
    async () => {
      const existingNames = new Set((await db.campaigns.toArray()).map((row) => row.name))
      const campaignId = await db.campaigns.add({
        ...data.campaign,
        name: uniqueName(data.campaign.name, existingNames),
        lastPlayedAt: Date.now(),
      })

      const characterIds: number[] = []
      for (const character of data.characters) {
        characterIds.push(await db.characters.add({ ...character, campaignId }))
      }
      const primaryCharacterId = characterIds[0] ?? 0

      if (data.inventoryItems.length) {
        await db.inventoryItems.bulkAdd(
          data.inventoryItems.map((item) => ({ ...item, campaignId, characterId: primaryCharacterId })),
        )
      }

      if (data.quests.length) {
        await db.quests.bulkAdd(data.quests.map((quest) => ({ ...quest, campaignId })))
      }

      // Two passes: insert lore first to mint ids, then resolve name cross-links.
      const loreIdByName = new Map<string, number>()
      for (const entry of data.loreEntries) {
        const { relatedEntryNames: _ignored, ...rest } = entry
        const id = await db.loreEntries.add({ ...rest, campaignId, relatedEntryIds: [] })
        loreIdByName.set(entry.name, id)
      }
      for (const entry of data.loreEntries) {
        const id = loreIdByName.get(entry.name)
        if (!id || !entry.relatedEntryNames?.length) continue
        const relatedEntryIds = entry.relatedEntryNames
          .map((name) => loreIdByName.get(name))
          .filter((related): related is number => typeof related === 'number')
        if (relatedEntryIds.length) await db.loreEntries.update(id, { relatedEntryIds })
      }

      if (data.storyLog.length) {
        await db.storyLog.bulkAdd(data.storyLog.map((entry) => ({ ...entry, campaignId })))
      }

      await db.narrativeState.add({
        campaignId,
        arcSummary: '',
        unresolvedThreadsJson: [],
        toneNotes: '',
        pacingNotes: '',
        directorBrief: '',
        lastUpdatedTurn: -1,
        ...(data.narrativeState ?? {}),
      })

      return campaignId
    },
  )
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name
  let counter = 2
  while (taken.has(`${name} (${counter})`)) counter += 1
  return `${name} (${counter})`
}

function stripKeys<T extends object, K extends keyof T>(row: T, keys: K[]): Omit<T, K> {
  const copy = { ...row }
  for (const key of keys) delete copy[key]
  return copy
}
