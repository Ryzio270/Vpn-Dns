import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  Icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

/**
 * A brand-new campaign has no quests, items or lore yet — these screens must
 * read as "not started" rather than "broken" (spec §7).
 */
export function EmptyState({ Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-8 py-16 text-center', className)}>
      <div className="mb-4 rounded-2xl border border-dashed border-border p-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold">{title}</h3>
      <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
