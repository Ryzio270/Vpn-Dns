import { useState } from 'react'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import {
  PROVIDERS,
  SUGGESTED_MODELS,
  fetchModels,
  type DiscoveredModel,
  type ProviderCredentials,
} from '@/ai/providers'
import type { AgentConfig, AgentId, ProviderId, ProviderTarget } from '@/ai/types'
import { AGENT_LABELS } from '@/store/settingsStore'

interface AgentProviderCardProps {
  agent: AgentId
  config: AgentConfig
  credentials: ProviderCredentials
  onChange: (config: AgentConfig) => void
}

export function AgentProviderCard({ agent, config, credentials, onChange }: AgentProviderCardProps) {
  const [models, setModels] = useState<Partial<Record<ProviderId, DiscoveredModel[]>>>({})
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null)
  const label = AGENT_LABELS[agent]

  async function loadModels(provider: ProviderId) {
    setLoadingProvider(provider)
    try {
      const discovered = await fetchModels(provider, credentials)
      setModels((previous) => ({ ...previous, [provider]: discovered }))
      const freeCount = discovered.filter((model) => model.free).length
      toast.success(`${PROVIDERS[provider].label}: ${discovered.length} models`, {
        description: `${freeCount} currently look free.`,
      })
    } catch (error) {
      toast.error('Could not fetch model list', {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoadingProvider(null)
    }
  }

  function updateTarget(index: number, patch: Partial<ProviderTarget>) {
    if (index === 0) {
      onChange({ ...config, primary: { ...config.primary, ...patch } })
      return
    }
    const fallbacks = config.fallbacks.map((target, position) =>
      position === index - 1 ? { ...target, ...patch } : target,
    )
    onChange({ ...config, fallbacks })
  }

  const chain = [config.primary, ...config.fallbacks]

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{label.title}</h3>
            <Badge variant="secondary">{chain.length} in chain</Badge>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{label.blurb}</p>
        </div>

        <div className="space-y-3">
          {chain.map((target, index) => {
            const listId = `${agent}-${index}-models`
            const options = models[target.provider] ?? []
            return (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {index === 0 ? 'Primary' : `Fallback ${index}`}
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Fetch ${PROVIDERS[target.provider].label} models`}
                      onClick={() => loadModels(target.provider)}
                      disabled={loadingProvider === target.provider}
                    >
                      {loadingProvider === target.provider ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RefreshCw />
                      )}
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove fallback"
                        onClick={() =>
                          onChange({
                            ...config,
                            fallbacks: config.fallbacks.filter((_, position) => position !== index - 1),
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Select
                    value={target.provider}
                    onValueChange={(provider) =>
                      updateTarget(index, {
                        provider: provider as ProviderId,
                        model: SUGGESTED_MODELS[provider as ProviderId][0],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PROVIDERS).map((meta) => (
                        <SelectItem key={meta.id} value={meta.id}>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    list={listId}
                    value={target.model}
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(event) => updateTarget(index, { model: event.target.value })}
                    placeholder="model id"
                  />
                  <datalist id={listId}>
                    {(options.length
                      ? options.filter((model) => model.free).map((model) => model.id)
                      : SUGGESTED_MODELS[target.provider]
                    ).map((modelId) => (
                      <option key={modelId} value={modelId} />
                    ))}
                  </datalist>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            onChange({
              ...config,
              fallbacks: [
                ...config.fallbacks,
                { provider: 'pollinations', model: SUGGESTED_MODELS.pollinations[0] },
              ],
            })
          }
        >
          <Plus /> Add fallback
        </Button>
      </CardContent>
    </Card>
  )
}
