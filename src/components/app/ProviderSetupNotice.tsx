import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Shown when the Story agent has no target it could actually reach, so the
 * first turn fails with a clear next step instead of a provider 401.
 */
export function ProviderSetupNotice() {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-primary" /> No AI provider configured
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        The Story agent's providers all need a key that isn't set yet. Add an OpenRouter key, or
        point the agent at Pollinations — it works anonymously, just more slowly.
      </p>
      <Button asChild size="sm" className="mt-3">
        <Link to="/settings">Open settings</Link>
      </Button>
    </div>
  )
}
