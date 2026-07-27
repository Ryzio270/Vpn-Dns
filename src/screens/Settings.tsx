import { useRef, useState } from 'react'
import { Eye, EyeOff, ExternalLink, PlugZap, RotateCcw, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AgentProviderCard } from '@/components/app/AgentProviderCard'
import { ScreenHeader } from '@/components/app/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { PROVIDERS } from '@/ai/providers'
import { callAgent } from '@/ai/resilientChat'
import type { AgentId, ProviderId } from '@/ai/types'
import { importCampaignFromJson } from '@/db/transfer'
import { AGENT_LABELS, selectCredentials, useSettingsStore } from '@/store/settingsStore'

const AGENT_ORDER: AgentId[] = ['story', 'bookkeeper', 'director']

export function Settings() {
  const navigate = useNavigate()
  const settings = useSettingsStore()
  const [showKeys, setShowKeys] = useState(false)
  const [testing, setTesting] = useState<AgentId | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const credentials = selectCredentials(settings)

  async function testAgent(agent: AgentId) {
    setTesting(agent)
    try {
      const result = await callAgent(
        agent,
        settings.agents[agent],
        credentials,
        [
          { role: 'system', content: 'Reply with the single word: ready' },
          { role: 'user', content: 'Connection test.' },
        ],
        {
          temperature: 0,
          maxTokens: 16,
          onFallback: ({ failed, next, reason }) =>
            toast.warning(`${failed.provider} failed — trying ${next.provider}`, {
              description: reason,
            }),
        },
      )
      toast.success(`${AGENT_LABELS[agent].title} agent is reachable`, {
        description: `${result.target.provider} · ${result.target.model}${
          result.usedFallback ? ' (via fallback)' : ''
        }`,
      })
    } catch (error) {
      toast.error(`${AGENT_LABELS[agent].title} agent could not connect`, {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setTesting(null)
    }
  }

  async function handleImportFile(file: File) {
    try {
      const campaignId = await importCampaignFromJson(await file.text())
      toast.success('Save imported')
      navigate(`/c/${campaignId}/story`)
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Settings" backTo="/" />

      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-16">
        <section className="space-y-3">
          <SectionTitle>API keys</SectionTitle>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Keys are stored on this device only, via Capacitor Preferences. They are never
                  bundled into the app or sent anywhere except the provider itself.
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={showKeys ? 'Hide keys' : 'Show keys'}
                  onClick={() => setShowKeys((value) => !value)}
                >
                  {showKeys ? <EyeOff /> : <Eye />}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>OpenRouter key</Label>
                <Input
                  type={showKeys ? 'text' : 'password'}
                  value={settings.openRouterKey}
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="sk-or-v1-…"
                  onChange={(event) => settings.update({ openRouterKey: event.target.value })}
                />
                <ProviderHint providerId="openrouter" />
              </div>

              <div className="space-y-1.5">
                <Label>Pollinations key (optional)</Label>
                <Input
                  type={showKeys ? 'text' : 'password'}
                  value={settings.pollinationsKey}
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="Leave blank for anonymous use"
                  onChange={(event) => settings.update({ pollinationsKey: event.target.value })}
                />
                <ProviderHint providerId="pollinations" />
              </div>

              <div className="space-y-1.5">
                <Label>Pollinations tier</Label>
                <Select
                  value={settings.pollinationsTier}
                  onValueChange={(value) =>
                    settings.update({ pollinationsTier: value as 'anonymous' | 'seed' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anonymous">Anonymous — 1 request / 15s</SelectItem>
                    <SelectItem value="seed">Seed account — 1 request / 5s</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sets how far apart the app spaces its Pollinations calls, so it paces itself
                  instead of collecting rate-limit errors.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>Agents</SectionTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                settings.resetAgentsToDefaults()
                toast.success('Agent providers reset to defaults')
              }}
            >
              <RotateCcw /> Defaults
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each agent picks its own provider and model, and falls through the chain in order when a
            call fails. To verify the fallback works, point a primary at a made-up model id and run
            the connection test — it should recover on the next entry.
          </p>

          {AGENT_ORDER.map((agent) => (
            <div key={agent} className="space-y-2">
              <AgentProviderCard
                agent={agent}
                config={settings.agents[agent]}
                credentials={credentials}
                onChange={(config) => settings.setAgentConfig(agent, config)}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={testing !== null}
                onClick={() => testAgent(agent)}
              >
                <PlugZap />
                {testing === agent ? 'Testing…' : `Test ${AGENT_LABELS[agent].title} connection`}
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <SectionTitle>Play</SectionTitle>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-1.5">
                <Label>Context window</Label>
                <Select
                  value={String(settings.recentExchanges)}
                  onValueChange={(value) => settings.update({ recentExchanges: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 6, 8, 12].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        Last {count} exchanges
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How much recent story the DM sees. The compendium and director brief carry
                  everything older, so raising this mostly costs tokens.
                </p>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>Director cadence</Label>
                <Select
                  value={String(settings.directorEveryNTurns)}
                  onValueChange={(value) => settings.update({ directorEveryNTurns: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every turn</SelectItem>
                    <SelectItem value="2">Every 2 turns</SelectItem>
                    <SelectItem value="3">Every 3 turns</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Running the Director less often saves free-tier requests at the cost of slightly
                  slower plot adaptation.
                </p>
              </div>

              <Separator />

              <label className="flex items-center justify-between gap-4">
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Show director brief</span>
                  <span className="block text-xs text-muted-foreground">
                    Displays the Director's current note above the story. Useful for checking that
                    it is actually steering the DM.
                  </span>
                </span>
                <Switch
                  checked={settings.showDirectorBrief}
                  onCheckedChange={(checked) => settings.update({ showDirectorBrief: checked })}
                />
              </label>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionTitle>Data</SectionTitle>
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Saves live in this app's local database. Export a campaign from its card on the
                Campaigns screen; import one here or with the upload button there.
              </p>
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload /> Import campaign save
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionTitle>About</SectionTitle>
          <Card>
            <CardContent className="space-y-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                Solo DM runs a three-agent loop over free LLM tiers: a Story agent writes prose, a
                Bookkeeper extracts state changes, and a Narrative Director maintains the arc.
              </p>
              <p>
                Free rosters on both providers rotate without notice. If a model id stops working,
                tap the refresh icon on that agent to pull the provider's current list.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

function ProviderHint({ providerId }: { providerId: ProviderId }) {
  const meta = PROVIDERS[providerId]
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {meta.keyHint}{' '}
      <a
        href={meta.signupUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
      >
        Open <ExternalLink className="h-3 w-3" />
      </a>
    </p>
  )
}
