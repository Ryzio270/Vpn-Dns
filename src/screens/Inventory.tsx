import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Backpack, LayoutGrid, List, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/app/EmptyState'
import { ItemCard, itemIcon, rarityClass } from '@/components/app/ItemCard'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { deleteItem, getCampaign, listInventory, updateItem } from '@/db/repository'
import type { InventoryItem } from '@/db/schema'
import { titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { useCampaignId } from './CampaignLayout'

export function Inventory() {
  const campaignId = useCampaignId()
  const campaign = useLiveQuery(() => getCampaign(campaignId), [campaignId])
  const items = useLiveQuery(() => listInventory(campaignId), [campaignId], undefined)
  const { inventoryView, setInventoryView } = useUIStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected = items?.find((item) => item.id === selectedId) ?? null
  const equipped = items?.filter((item) => item.equipped) ?? []
  const carried = items?.filter((item) => !item.equipped) ?? []

  async function adjustQuantity(item: InventoryItem, delta: number) {
    const next = item.quantity + delta
    if (next <= 0) {
      await deleteItem(item.id)
      setSelectedId(null)
      toast.success(`${item.name} removed`)
      return
    }
    await updateItem(item.id, { quantity: next })
  }

  return (
    <>
      <ScreenHeader
        title="Inventory"
        subtitle={campaign?.name}
        showSettings
        action={
          <ToggleGroup
            type="single"
            value={inventoryView}
            onValueChange={(value) => value && setInventoryView(value as 'grid' | 'list')}
          >
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        {items === undefined ? null : items.length === 0 ? (
          <EmptyState
            Icon={Backpack}
            title="Nothing in your pack"
            description="Items appear here automatically as the story gives them to you — the Bookkeeper reads every DM response and files what you pick up."
          />
        ) : (
          <div className="space-y-5">
            {equipped.length > 0 && (
              <Section title="Equipped" count={equipped.length}>
                <ItemGrid
                  items={equipped}
                  view={inventoryView}
                  onOpen={(item) => setSelectedId(item.id)}
                />
              </Section>
            )}
            {carried.length > 0 && (
              <Section title="Carried" count={carried.length}>
                <ItemGrid
                  items={carried}
                  view={inventoryView}
                  onOpen={(item) => setSelectedId(item.id)}
                />
              </Section>
            )}
          </div>
        )}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="bottom">
          {selected && <ItemDetail item={selected} onAdjust={adjustQuantity} onClose={() => setSelectedId(null)} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {children}
    </section>
  )
}

function ItemGrid({
  items,
  view,
  onOpen,
}: {
  items: InventoryItem[]
  view: 'grid' | 'list'
  onOpen: (item: InventoryItem) => void
}) {
  return (
    <div className={cn(view === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2')}>
      {items.map((item, index) => (
        <ItemCard key={item.id} item={item} view={view} index={index} onOpen={onOpen} />
      ))}
    </div>
  )
}

function ItemDetail({
  item,
  onAdjust,
  onClose,
}: {
  item: InventoryItem
  onAdjust: (item: InventoryItem, delta: number) => Promise<void>
  onClose: () => void
}) {
  const Icon = itemIcon(item.itemType)

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
            <Icon className={cn('h-5 w-5', rarityClass(item.rarity))} />
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate">{item.name}</SheetTitle>
            <SheetDescription>
              {titleCase(item.itemType)} · {titleCase(item.rarity)}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      {item.description && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      )}

      <Separator className="my-4" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Decrease quantity"
              onClick={() => void onAdjust(item, -1)}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center text-base tabular-nums">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Increase quantity"
              onClick={() => void onAdjust(item, 1)}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <label className="flex items-center justify-between">
          <span className="text-sm font-medium">Equipped</span>
          <Switch
            checked={item.equipped}
            onCheckedChange={(checked) => void updateItem(item.id, { equipped: checked })}
          />
        </label>

        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={async () => {
            await deleteItem(item.id)
            onClose()
            toast.success(`${item.name} discarded`)
          }}
        >
          <Trash2 /> Discard item
        </Button>
      </div>
    </>
  )
}
