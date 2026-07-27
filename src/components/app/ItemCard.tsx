import { motion } from 'framer-motion'
import { Shield, Sparkles, Sword, Package, FlaskConical, Wrench, KeyRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { InventoryItem } from '@/db/schema'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, LucideIcon> = {
  weapon: Sword,
  armor: Shield,
  consumable: FlaskConical,
  potion: FlaskConical,
  tool: Wrench,
  quest: KeyRound,
  treasure: Sparkles,
}

export function itemIcon(itemType: string): LucideIcon {
  return TYPE_ICONS[itemType.toLowerCase()] ?? Package
}

const RARITY_STYLES: Record<string, string> = {
  common: 'text-muted-foreground',
  uncommon: 'text-emerald-400',
  rare: 'text-sky-400',
  epic: 'text-violet-400',
  legendary: 'text-amber-400',
}

export function rarityClass(rarity: string): string {
  return RARITY_STYLES[rarity.toLowerCase()] ?? RARITY_STYLES.common
}

interface ItemCardProps {
  item: InventoryItem
  view: 'grid' | 'list'
  index: number
  onOpen: (item: InventoryItem) => void
}

export function ItemCard({ item, view, index, onOpen }: ItemCardProps) {
  const Icon = itemIcon(item.itemType)

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(item)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.2 }}
      className="text-left"
    >
      <Card
        className={cn(
          'h-full transition-colors active:bg-secondary/60',
          item.equipped && 'border-primary/50',
          view === 'grid' ? 'p-3' : 'flex items-center gap-3 p-3',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-secondary',
            view === 'grid' ? 'mb-2 h-10 w-10' : 'h-10 w-10 shrink-0',
          )}
        >
          <Icon className={cn('h-5 w-5', rarityClass(item.rarity))} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{item.name}</span>
            {item.quantity > 1 && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                ×{item.quantity}
              </span>
            )}
          </div>
          <p
            className={cn(
              'text-xs text-muted-foreground',
              view === 'grid' ? 'line-clamp-2 mt-1' : 'truncate',
            )}
          >
            {item.description || item.itemType}
          </p>
        </div>

        {item.equipped && (
          <Badge variant="default" className={view === 'grid' ? 'mt-2' : 'shrink-0'}>
            Equipped
          </Badge>
        )}
      </Card>
    </motion.button>
  )
}
