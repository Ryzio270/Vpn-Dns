import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Placeholder rows while a Dexie live query resolves on first mount. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Card key={index} className="flex items-center gap-3 p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function StorySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-24 w-[86%] rounded-2xl" />
      <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
      <Skeleton className="h-28 w-[86%] rounded-2xl" />
    </div>
  )
}
