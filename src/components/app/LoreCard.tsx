import { motion } from 'framer-motion'
import { Castle, Crown, Landmark, ScrollText, Skull, Sparkles, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { LoreCategory, LoreEntry } from '@/db/schema'

const CATEGORY_ICONS: Record<LoreCategory, LucideIcon> = {
  npc: Users,
  location: Castle,
  faction: Crown,
  history: ScrollText,
  item: Sparkles,
  monster: Skull,
}

export function loreIcon(category: LoreCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? Landmark
}

export const LORE_CATEGORIES: LoreCategory[] = [
  'npc',
  'location',
  'faction',
  'history',
  'item',
  'monster',
]

interface LoreCardProps {
  entry: LoreEntry
  index: number
  onOpen: (entry: LoreEntry) => void
}

export function LoreCard({ entry, index, onOpen }: LoreCardProps) {
  const Icon = loreIcon(entry.category)

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(entry)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.2 }}
      className="w-full text-left"
    >
      <Card className="flex items-start gap-3 p-3 transition-colors active:bg-secondary/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{entry.name}</span>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {entry.category}
            </Badge>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        </div>
      </Card>
    </motion.button>
  )
}
