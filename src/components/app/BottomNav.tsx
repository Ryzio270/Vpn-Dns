import { NavLink, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Backpack, ScrollText, Swords, User } from 'lucide-react'

import { cn } from '@/lib/utils'

const TABS = [
  { to: 'story', label: 'Story', Icon: Swords },
  { to: 'character', label: 'Character', Icon: User },
  { to: 'inventory', label: 'Inventory', Icon: Backpack },
  { to: 'quests', label: 'Quests', Icon: ScrollText },
  { to: 'compendium', label: 'Lore', Icon: BookOpen },
] as const

export function BottomNav() {
  const { campaignId } = useParams()

  return (
    <nav className="safe-bottom shrink-0 border-t border-border bg-card/95 backdrop-blur">
      <div className="flex items-stretch">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={`/c/${campaignId}/${to}`}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <span className={cn(isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
