import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Search, X } from 'lucide-react'

import { EmptyState } from '@/components/app/EmptyState'
import { LORE_CATEGORIES, LoreCard, loreIcon } from '@/components/app/LoreCard'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getCampaign, listLore } from '@/db/repository'
import type { LoreEntry } from '@/db/schema'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { useCampaignId } from './CampaignLayout'

export function Compendium() {
  const campaignId = useCampaignId()
  const campaign = useLiveQuery(() => getCampaign(campaignId), [campaignId])
  const entries = useLiveQuery(() => listLore(campaignId), [campaignId], undefined)
  const { compendiumQuery, setCompendiumQuery, compendiumCategory, setCompendiumCategory } =
    useUIStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (!entries) return []
    const query = compendiumQuery.trim().toLowerCase()
    return entries
      .filter((entry) => compendiumCategory === 'all' || entry.category === compendiumCategory)
      .filter((entry) => {
        if (!query) return true
        return (
          entry.name.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query) ||
          entry.tags.some((tag) => tag.includes(query))
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, compendiumQuery, compendiumCategory])

  const selected = entries?.find((entry) => entry.id === selectedId) ?? null

  /** Related = explicit links plus anything sharing a tag. */
  const related = useMemo(() => {
    if (!selected || !entries) return []
    const tags = new Set(selected.tags)
    return entries.filter(
      (entry) =>
        entry.id !== selected.id &&
        (selected.relatedEntryIds.includes(entry.id) || entry.tags.some((tag) => tags.has(tag))),
    )
  }, [selected, entries])

  const availableCategories = useMemo(() => {
    const present = new Set(entries?.map((entry) => entry.category) ?? [])
    return LORE_CATEGORIES.filter((category) => present.has(category))
  }, [entries])

  return (
    <>
      <ScreenHeader title="Compendium" subtitle={campaign?.name} showSettings />

      {entries !== undefined && entries.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={compendiumQuery}
              onChange={(event) => setCompendiumQuery(event.target.value)}
              placeholder="Search names, descriptions, tags"
              className="pl-9 pr-9"
            />
            {compendiumQuery && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setCompendiumQuery('')}
              >
                <X />
              </Button>
            )}
          </div>

          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            <CategoryChip
              label="All"
              active={compendiumCategory === 'all'}
              onClick={() => setCompendiumCategory('all')}
            />
            {availableCategories.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                active={compendiumCategory === category}
                onClick={() => setCompendiumCategory(category)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {entries === undefined ? null : entries.length === 0 ? (
          <EmptyState
            Icon={BookOpen}
            title="Your compendium is empty"
            description="Every NPC, place, faction and monster the DM introduces gets filed here automatically as you play. Nothing to do but start the story."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={Search}
            title="No matches"
            description="Nothing in this campaign's compendium matches that search yet."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setCompendiumQuery('')
                  setCompendiumCategory('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((entry, index) => (
              <LoreCard
                key={entry.id}
                entry={entry}
                index={index}
                onOpen={(target) => setSelectedId(target.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="bottom">
          {selected && (
            <LoreDetail entry={selected} related={related} onOpenRelated={setSelectedId} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border text-muted-foreground',
      )}
    >
      {label}
    </button>
  )
}

function LoreDetail({
  entry,
  related,
  onOpenRelated,
}: {
  entry: LoreEntry
  related: LoreEntry[]
  onOpenRelated: (id: number) => void
}) {
  const Icon = loreIcon(entry.category)

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate">{entry.name}</SheetTitle>
            <SheetDescription className="capitalize">
              {entry.category} · first seen turn {entry.firstEncounteredTurn}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{entry.description}</p>

      {entry.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <>
          <Separator className="my-4" />
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related entries
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {related.map((other) => (
              <Button
                key={other.id}
                variant="outline"
                size="sm"
                onClick={() => onOpenRelated(other.id)}
              >
                {other.name}
              </Button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
