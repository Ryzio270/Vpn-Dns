import { useLiveQuery } from 'dexie-react-hooks'
import { ScrollText } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/app/EmptyState'
import { ListSkeleton } from '@/components/app/ListSkeleton'
import { QuestCard } from '@/components/app/QuestCard'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCampaign, listQuests, updateQuest } from '@/db/repository'
import type { Quest, QuestStatus } from '@/db/schema'
import { useCampaignId } from './CampaignLayout'

export function QuestJournal() {
  const campaignId = useCampaignId()
  const campaign = useLiveQuery(() => getCampaign(campaignId), [campaignId])
  const quests = useLiveQuery(() => listQuests(campaignId), [campaignId], undefined)

  const active = quests?.filter((quest) => quest.status === 'active') ?? []
  // Failed quests live alongside completed ones — both are "done with", and a
  // third tab for a rare status would be mostly empty.
  const closed = quests?.filter((quest) => quest.status !== 'active') ?? []

  async function changeStatus(quest: Quest, status: QuestStatus) {
    await updateQuest(quest.id, { status })
    toast.success(`${quest.title} marked ${status}`)
  }

  return (
    <>
      <ScreenHeader title="Quests" subtitle={campaign?.name} showSettings />

      <Tabs defaultValue="active" className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="active">
              Active
              {active.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {active.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">
              Completed
              {closed.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {closed.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="mt-0 flex-1 overflow-y-auto p-4">
          {quests === undefined ? (
            <ListSkeleton rows={3} />
          ) : active.length === 0 ? (
            <EmptyState
              Icon={ScrollText}
              title="No active quests"
              description="Quests are logged automatically when an NPC asks you for something. Take a job in the story and it will show up here."
            />
          ) : (
            <div className="space-y-2">
              {active.map((quest, index) => (
                <QuestCard key={quest.id} quest={quest} index={index} onStatusChange={changeStatus} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-0 flex-1 overflow-y-auto p-4">
          {quests === undefined ? (
            <ListSkeleton rows={2} />
          ) : closed.length === 0 ? (
            <EmptyState
              Icon={ScrollText}
              title="Nothing finished yet"
              description="Completed and failed quests are archived here with their full log history."
            />
          ) : (
            <div className="space-y-2">
              {closed.map((quest, index) => (
                <QuestCard key={quest.id} quest={quest} index={index} onStatusChange={changeStatus} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
