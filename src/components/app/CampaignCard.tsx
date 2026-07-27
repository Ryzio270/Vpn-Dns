import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Campaign } from '@/db/schema'
import { relativeTime } from '@/lib/format'

interface CampaignCardProps {
  campaign: Campaign
  turnCount: number
  index: number
  onRename: (campaign: Campaign) => void
  onExport: (campaign: Campaign) => void
  onDelete: (campaign: Campaign) => void
}

export function CampaignCard({
  campaign,
  turnCount,
  index,
  onRename,
  onExport,
  onDelete,
}: CampaignCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.25, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden">
        <Link to={`/c/${campaign.id}/story`} className="block p-4 pr-12">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{campaign.name}</h2>
            {turnCount === 0 && (
              <Badge variant="accent" className="shrink-0">
                New
              </Badge>
            )}
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {campaign.settingSummary || 'No setting summary yet.'}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{relativeTime(campaign.lastPlayedAt)}</span>
            <span aria-hidden>·</span>
            <span>
              {turnCount} {turnCount === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2"
              aria-label={`Actions for ${campaign.name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(campaign)}>
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport(campaign)}>
              <Download /> Export save
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onDelete(campaign)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    </motion.div>
  )
}
