import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'

import { BottomNav } from '@/components/app/BottomNav'
import { getCampaign } from '@/db/repository'
import { useCampaignStore } from '@/store/campaignStore'

export function CampaignLayout() {
  const { campaignId } = useParams()
  const location = useLocation()
  const reset = useCampaignStore((state) => state.reset)
  const numericId = Number(campaignId)
  const valid = Number.isFinite(numericId) && numericId > 0

  const campaign = useLiveQuery(
    () => (valid ? getCampaign(numericId) : Promise.resolve(undefined)),
    [numericId, valid],
    undefined,
  )

  // Switching saves must not carry the previous campaign's turn state across.
  useEffect(() => reset, [numericId, reset])

  if (!valid) return <Navigate to="/" replace />
  // `undefined` is "still loading"; `null` would be a miss, but Dexie returns
  // undefined for both, so wait one tick before deciding the save is gone.
  if (campaign === undefined) return <div className="h-full bg-background" />

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}

/** Parses the route param once so screens can work in numbers. */
export function useCampaignId(): number {
  const { campaignId } = useParams()
  return Number(campaignId)
}
