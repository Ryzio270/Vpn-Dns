import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Dices, Loader2, RotateCcw, Send, Swords } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/app/EmptyState'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import { StoryBubble, TypingBubble } from '@/components/app/StoryBubble'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { handlePlayerTurn } from '@/ai/orchestrator'
import { AGENT_LABELS, useSettingsStore } from '@/store/settingsStore'
import { useCampaignStore } from '@/store/campaignStore'
import { getCampaign, getNarrativeState, listStoryLog } from '@/db/repository'
import { QUICK_DICE, describeRoll, rollDice } from '@/lib/dice'
import { useCampaignId } from './CampaignLayout'

export function Play() {
  const campaignId = useCampaignId()
  const settings = useSettingsStore()
  const campaign = useLiveQuery(() => getCampaign(campaignId), [campaignId])
  const storyLog = useLiveQuery(() => listStoryLog(campaignId), [campaignId], undefined)
  const narrativeState = useLiveQuery(() => getNarrativeState(campaignId), [campaignId])

  const {
    pendingPlayerMessage,
    isStoryGenerating,
    storyError,
    lastFailedInput,
    backgroundAgents,
    beginTurn,
    endTurn,
    failTurn,
    clearStoryError,
    setBackgroundAgent,
  } = useCampaignStore()

  const [input, setInput] = useState('')
  const [diceOpen, setDiceOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousCount = useRef(0)

  // Keep the newest message in view, but only when the log actually grew —
  // otherwise every unrelated re-render would yank the user back down.
  useLayoutEffect(() => {
    const count = (storyLog?.length ?? 0) + (pendingPlayerMessage ? 1 : 0)
    if (count === previousCount.current) return
    previousCount.current = count
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [storyLog, pendingPlayerMessage, isStoryGenerating])

  useEffect(() => {
    previousCount.current = 0
  }, [campaignId])

  async function send(rawInput: string) {
    const trimmed = rawInput.trim()
    if (!trimmed || isStoryGenerating) return

    setInput('')
    beginTurn(trimmed)

    try {
      const result = await handlePlayerTurn(campaignId, trimmed, settings, {
        onFallback: (agent, info) =>
          toast.warning(`${AGENT_LABELS[agent].title}: ${info.failed.provider} failed`, {
            description: `Falling back to ${info.next.provider} · ${info.next.model}`,
          }),
        onBackgroundAgent: setBackgroundAgent,
        onBackgroundError: (agent, error) =>
          toast.error(`${AGENT_LABELS[agent].title} agent failed`, {
            description: error instanceof Error ? error.message : String(error),
          }),
        onStateChange: (message) => toast(message),
      })

      if (result.usedFallback) {
        toast.info('Story written by the fallback provider', {
          description: `${result.target.provider} · ${result.target.model}`,
        })
      }
      endTurn()
    } catch (error) {
      failTurn(error instanceof Error ? error.message : String(error), trimmed)
    }
  }

  function handleRoll(notation: string) {
    const roll = rollDice(notation)
    if (!roll) return
    setDiceOpen(false)
    void send(describeRoll(roll))
  }

  const isEmpty = storyLog !== undefined && storyLog.length === 0 && !pendingPlayerMessage

  return (
    <>
      <ScreenHeader
        title={campaign?.name ?? 'Story'}
        subtitle={
          backgroundAgents.length > 0
            ? `${backgroundAgents.map((agent) => AGENT_LABELS[agent].title).join(' · ')} working…`
            : campaign?.tone
        }
        backTo="/"
        showSettings
      />

      {settings.showDirectorBrief && narrativeState?.directorBrief && (
        <div className="shrink-0 border-b border-border bg-accent/5 px-4 py-2">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Badge variant="accent">Director</Badge>
            <span className="text-[11px] text-muted-foreground">
              steering turn {narrativeState.lastUpdatedTurn + 1}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {narrativeState.directorBrief}
          </p>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <EmptyState
            Icon={Swords}
            title="The story starts with you"
            description="Describe what your character does, or ask the DM to set the opening scene. Everything else — inventory, quests, lore — fills itself in as you play."
            action={
              <Button variant="outline" onClick={() => void send('Set the opening scene.')}>
                Set the opening scene
              </Button>
            }
          />
        ) : (
          storyLog?.map((entry) => (
            <StoryBubble
              key={entry.id}
              role={entry.role}
              content={entry.content}
              animate={entry.turnIndex >= (storyLog.length ?? 0) - 2}
            />
          ))
        )}

        <AnimatePresence>
          {pendingPlayerMessage && (
            <StoryBubble key="pending" role="player" content={pendingPlayerMessage} />
          )}
          {isStoryGenerating && <TypingBubble key="typing" />}
        </AnimatePresence>

        {storyError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-3"
          >
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> The DM could not answer
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{storyError}</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const retry = lastFailedInput
                  clearStoryError()
                  if (retry) void send(retry)
                }}
              >
                <RotateCcw /> Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={clearStoryError}>
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="safe-bottom shrink-0 border-t border-border bg-card/80 p-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Roll dice"
            className="shrink-0"
            onClick={() => setDiceOpen(true)}
          >
            <Dices />
          </Button>
          <Textarea
            value={input}
            rows={1}
            placeholder="What do you do?"
            className="max-h-32 min-h-10 resize-none py-2.5"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send(input)
              }
            }}
          />
          <Button
            size="icon"
            aria-label="Send"
            className="shrink-0"
            disabled={!input.trim() || isStoryGenerating}
            onClick={() => void send(input)}
          >
            {isStoryGenerating ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>

      <Sheet open={diceOpen} onOpenChange={setDiceOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Roll dice</SheetTitle>
            <SheetDescription>
              The result is sent to the DM as your action, so the narration reacts to what you
              actually rolled.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {QUICK_DICE.map((notation) => (
              <Button key={notation} variant="outline" onClick={() => handleRoll(notation)}>
                {notation}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
