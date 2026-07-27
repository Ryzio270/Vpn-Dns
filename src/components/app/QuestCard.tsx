import { motion } from 'framer-motion'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Quest, QuestStatus } from '@/db/schema'

const STATUS_ICON = {
  active: Circle,
  completed: CheckCircle2,
  failed: XCircle,
} as const

const STATUS_STYLE: Record<QuestStatus, string> = {
  active: 'text-primary',
  completed: 'text-emerald-400',
  failed: 'text-destructive',
}

interface QuestCardProps {
  quest: Quest
  index: number
  onStatusChange: (quest: Quest, status: QuestStatus) => void
}

export function QuestCard({ quest, index, onStatusChange }: QuestCardProps) {
  const Icon = STATUS_ICON[quest.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.22 }}
    >
      <Card>
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value={String(quest.id)} className="border-0">
              <AccordionTrigger className="px-4">
                <div className="flex min-w-0 items-start gap-2.5 pr-2 text-left">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_STYLE[quest.status]}`} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{quest.title}</div>
                    <div className="truncate text-xs font-normal text-muted-foreground">
                      {quest.questGiver}
                      {quest.logJson.length > 0 && ` · ${quest.logJson.length} entries`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4">
                {quest.description && (
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    {quest.description}
                  </p>
                )}

                {quest.logJson.length > 0 && (
                  <ol className="mb-3 space-y-2 border-l border-border pl-3">
                    {quest.logJson.map((entry, entryIndex) => (
                      <li key={entryIndex} className="relative text-xs leading-relaxed">
                        <span className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-border" />
                        <span className="mr-1.5 text-muted-foreground/70">turn {entry.turn}</span>
                        <span className="text-muted-foreground">{entry.note}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {(['active', 'completed', 'failed'] as QuestStatus[])
                    .filter((status) => status !== quest.status)
                    .map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => onStatusChange(quest, status)}
                      >
                        Mark {status}
                      </Button>
                    ))}
                  <Badge variant="secondary" className="ml-auto self-center">
                    {quest.status}
                  </Badge>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  )
}
