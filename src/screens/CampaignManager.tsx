import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { Compass, Plus, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { CampaignCard } from '@/components/app/CampaignCard'
import { EmptyState } from '@/components/app/EmptyState'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { db, type Campaign } from '@/db/schema'
import { createCampaign, deleteCampaign, listCampaigns, updateCampaign } from '@/db/repository'
import { seedExampleCampaign } from '@/db/seed'
import { exportCampaignToFile, importCampaignFromJson } from '@/db/transfer'

const BLANK_DRAFT = {
  name: '',
  settingSummary: '',
  tone: 'Heroic high fantasy with room for humour.',
  characterName: '',
  race: 'Human',
  characterClass: 'Fighter',
  backstory: '',
}

export function CampaignManager() {
  const navigate = useNavigate()
  const campaigns = useLiveQuery(() => listCampaigns(), [], undefined)
  const turnCounts = useLiveQuery(async () => {
    const rows = await db.storyLog.toArray()
    const counts = new Map<number, number>()
    for (const row of rows) counts.set(row.campaignId, (counts.get(row.campaignId) ?? 0) + 1)
    return counts
  }, [], new Map<number, number>())

  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState(BLANK_DRAFT)
  const [creating, setCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Campaign | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [seeding, setSeeding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = campaigns === undefined

  async function handleCreate() {
    if (!draft.name.trim() || !draft.characterName.trim()) return
    setCreating(true)
    try {
      const campaignId = await createCampaign({
        name: draft.name.trim(),
        settingSummary: draft.settingSummary.trim(),
        tone: draft.tone.trim(),
        character: {
          name: draft.characterName.trim(),
          race: draft.race.trim() || 'Human',
          characterClass: draft.characterClass.trim() || 'Adventurer',
          backstory: draft.backstory.trim(),
        },
      })
      setCreateOpen(false)
      setDraft(BLANK_DRAFT)
      navigate(`/c/${campaignId}/story`)
    } catch (error) {
      toast.error('Could not create campaign', { description: describeError(error) })
    } finally {
      setCreating(false)
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return
    await updateCampaign(renameTarget.id, { name: renameValue.trim() })
    setRenameTarget(null)
    toast.success('Campaign renamed')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const name = deleteTarget.name
    await deleteCampaign(deleteTarget.id)
    setDeleteTarget(null)
    toast.success(`Deleted "${name}"`)
  }

  async function handleExport(campaign: Campaign) {
    try {
      const result = await exportCampaignToFile(campaign.id)
      toast.success('Save exported', {
        description: result.location ? `Saved to ${result.location}` : result.fileName,
      })
    } catch (error) {
      toast.error('Export failed', { description: describeError(error) })
    }
  }

  async function handleImportFile(file: File) {
    try {
      const campaignId = await importCampaignFromJson(await file.text())
      toast.success('Save imported')
      navigate(`/c/${campaignId}/story`)
    } catch (error) {
      toast.error('Import failed', { description: describeError(error) })
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const campaignId = await seedExampleCampaign()
      navigate(`/c/${campaignId}/story`)
    } catch (error) {
      toast.error('Could not load the example campaign', { description: describeError(error) })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title="Campaigns"
        subtitle="Solo DM"
        showSettings
        action={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Import save"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
          </Button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void handleImportFile(file)
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {isLoading ? null : campaigns.length === 0 ? (
          <EmptyState
            Icon={Compass}
            title="No campaigns yet"
            description="Create a campaign to start a new solo adventure, or load the example setting to see how everything fits together."
            action={
              <div className="flex flex-col items-stretch gap-2">
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> New campaign
                </Button>
                <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                  <Sparkles /> Load example campaign
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                index={index}
                turnCount={turnCounts?.get(campaign.id) ?? 0}
                onRename={(target) => {
                  setRenameTarget(target)
                  setRenameValue(target.name)
                }}
                onExport={handleExport}
                onDelete={setDeleteTarget}
              />
            ))}
            <Button variant="outline" className="w-full" onClick={handleSeed} disabled={seeding}>
              <Sparkles /> Load example campaign
            </Button>
          </div>
        )}
      </div>

      {campaigns && campaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-4"
        >
          <Button
            size="lg"
            className="pointer-events-auto rounded-full shadow-lg"
            onClick={() => setCreateOpen(true)}
          >
            <Plus /> New campaign
          </Button>
        </motion.div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>
              The setting and tone are handed to the DM on every turn, so a couple of sentences go a
              long way.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Campaign name">
              <Input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="The Ashen Reaches"
              />
            </Field>
            <Field label="Setting summary">
              <Textarea
                rows={3}
                value={draft.settingSummary}
                onChange={(event) => setDraft({ ...draft, settingSummary: event.target.value })}
                placeholder="A grey expanse of ash-drowned townships beneath a sun that never fully rises…"
              />
            </Field>
            <Field label="Tone">
              <Input
                value={draft.tone}
                onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
              />
            </Field>

            <div className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your character
            </div>
            <Field label="Name">
              <Input
                value={draft.characterName}
                onChange={(event) => setDraft({ ...draft, characterName: event.target.value })}
                placeholder="Vesper Quill"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Race">
                <Input
                  value={draft.race}
                  onChange={(event) => setDraft({ ...draft, race: event.target.value })}
                />
              </Field>
              <Field label="Class">
                <Input
                  value={draft.characterClass}
                  onChange={(event) => setDraft({ ...draft, characterClass: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Backstory">
              <Textarea
                rows={3}
                value={draft.backstory}
                onChange={(event) => setDraft({ ...draft, backstory: event.target.value })}
                placeholder="Optional, but the DM will use it."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !draft.name.trim() || !draft.characterName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename campaign</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleRename()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the story log, character, inventory, quests and compendium for this save.
              Export it first if you want to keep a copy — this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
