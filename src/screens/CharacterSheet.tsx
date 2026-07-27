import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Heart, Pencil, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

import { ScreenHeader } from '@/components/app/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { getCampaign, getCharacter, updateCharacter } from '@/db/repository'
import type { Character, CharacterStats } from '@/db/schema'
import { abilityModifier } from '@/lib/format'
import { useCampaignId } from './CampaignLayout'

const STAT_LABELS: Array<[keyof CharacterStats, string]> = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
]

/**
 * Deliberately simple progression: going from level L to L+1 costs L * 300 XP,
 * so the bar shows progress within the current level rather than lifetime XP.
 */
function xpBandForLevel(level: number): { start: number; span: number } {
  const start = 300 * ((level - 1) * level) / 2
  return { start, span: level * 300 }
}

export function CharacterSheet() {
  const campaignId = useCampaignId()
  const campaign = useLiveQuery(() => getCampaign(campaignId), [campaignId])
  const character = useLiveQuery(() => getCharacter(campaignId), [campaignId])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Character | null>(null)

  useEffect(() => {
    if (!editing && character) setDraft(character)
  }, [character, editing])

  if (!character || !draft) {
    return (
      <>
        <ScreenHeader title="Character" subtitle={campaign?.name} showSettings />
        <div className="flex-1" />
      </>
    )
  }

  const active = editing ? draft : character
  const characterId = character.id
  const hpPercent = active.hpMax > 0 ? (active.hpCurrent / active.hpMax) * 100 : 0
  const { start: xpStart, span: xpSpan } = xpBandForLevel(active.level)
  const xpPercent = Math.max(0, Math.min(100, ((active.xp - xpStart) / xpSpan) * 100))

  async function save() {
    if (!draft) return
    const { id: _id, campaignId: _campaignId, ...changes } = draft
    await updateCharacter(characterId, changes)
    setEditing(false)
    toast.success('Character sheet saved')
  }

  return (
    <>
      <ScreenHeader
        title="Character"
        subtitle={campaign?.name}
        showSettings
        action={
          editing ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Discard changes"
                onClick={() => {
                  setDraft(character)
                  setEditing(false)
                }}
              >
                <X />
              </Button>
              <Button size="icon-sm" aria-label="Save changes" onClick={save}>
                <Check />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit character"
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
          )
        }
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            {editing ? (
              <div className="space-y-3">
                <Labelled label="Name">
                  <Input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </Labelled>
                <div className="grid grid-cols-2 gap-3">
                  <Labelled label="Race">
                    <Input
                      value={draft.race}
                      onChange={(event) => setDraft({ ...draft, race: event.target.value })}
                    />
                  </Labelled>
                  <Labelled label="Class">
                    <Input
                      value={draft.characterClass}
                      onChange={(event) =>
                        setDraft({ ...draft, characterClass: event.target.value })
                      }
                    />
                  </Labelled>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold">{active.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Level {active.level} {active.race} {active.characterClass}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Heart className="h-3.5 w-3.5 text-destructive" /> Hit points
                  </span>
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <NumberInput
                        value={draft.hpCurrent}
                        onChange={(hpCurrent) => setDraft({ ...draft, hpCurrent })}
                      />
                      <span className="text-muted-foreground">/</span>
                      <NumberInput
                        value={draft.hpMax}
                        onChange={(hpMax) => setDraft({ ...draft, hpMax })}
                      />
                    </div>
                  ) : (
                    <span className="tabular-nums text-muted-foreground">
                      {active.hpCurrent} / {active.hpMax}
                    </span>
                  )}
                </div>
                <Progress
                  value={hpPercent}
                  indicatorClassName={
                    hpPercent <= 25 ? 'bg-destructive' : hpPercent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Experience
                  </span>
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <NumberInput
                        value={draft.xp}
                        onChange={(xp) => setDraft({ ...draft, xp })}
                      />
                      <span className="text-muted-foreground">xp · lvl</span>
                      <NumberInput
                        value={draft.level}
                        onChange={(level) => setDraft({ ...draft, level: Math.max(1, level) })}
                      />
                    </div>
                  ) : (
                    <span className="tabular-nums text-muted-foreground">{active.xp} XP</span>
                  )}
                </div>
                <Progress value={xpPercent} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ability scores
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {STAT_LABELS.map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-background/50 p-2 text-center"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  {editing ? (
                    <Input
                      className="mt-1 h-8 text-center text-base"
                      inputMode="numeric"
                      value={String(draft.statsJson[key])}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          statsJson: {
                            ...draft.statsJson,
                            [key]: clampInt(event.target.value, 1, 30),
                          },
                        })
                      }
                    />
                  ) : (
                    <>
                      <div className="text-xl font-semibold tabular-nums">{active.statsJson[key]}</div>
                      <div className="text-xs text-muted-foreground">
                        {abilityModifier(active.statsJson[key])}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Backstory
            </h3>
            {editing ? (
              <Textarea
                rows={6}
                value={draft.backstory}
                onChange={(event) => setDraft({ ...draft, backstory: event.target.value })}
              />
            ) : active.backstory ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {active.backstory}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Nothing written yet. Tap the pencil to add a backstory — the DM reads it.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Input
      className="h-7 w-14 px-1.5 text-center text-sm"
      inputMode="numeric"
      value={String(value)}
      onChange={(event) => onChange(clampInt(event.target.value, 0, 99_999))}
    />
  )
}

function clampInt(raw: string, min: number, max: number): number {
  const parsed = Number.parseInt(raw.replace(/[^0-9-]/g, ''), 10)
  if (Number.isNaN(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}
