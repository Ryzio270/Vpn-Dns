import { Link } from 'react-router-dom'
import { ChevronLeft, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  action?: React.ReactNode
  showSettings?: boolean
  className?: string
}

export function ScreenHeader({
  title,
  subtitle,
  backTo,
  action,
  showSettings,
  className,
}: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur',
        className,
      )}
    >
      {backTo && (
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back">
          <Link to={backTo}>
            <ChevronLeft />
          </Link>
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
      {showSettings && (
        <Button asChild variant="ghost" size="icon-sm" aria-label="Settings">
          <Link to="/settings">
            <Settings2 />
          </Link>
        </Button>
      )}
    </header>
  )
}
