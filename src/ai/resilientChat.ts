import {
  AIProviderError,
  AllProvidersFailedError,
  type AgentConfig,
  type AgentId,
  type ChatMessage,
  type ChatOptions,
  type ProviderId,
  type ProviderTarget,
} from '@/ai/types'
import { createProvider, providerInterval, type ProviderCredentials } from '@/ai/providers'

/**
 * Every player turn fires three agents at once, and both free tiers rate-limit
 * by time. Requests to a provider are serialised through a promise chain with a
 * minimum gap so the app paces itself instead of collecting 429s.
 */
const providerQueues: Record<ProviderId, Promise<unknown>> = {
  openrouter: Promise.resolve(),
  pollinations: Promise.resolve(),
}
const lastRequestAt: Record<ProviderId, number> = {
  openrouter: 0,
  pollinations: 0,
}

function schedule<T>(provider: ProviderId, minIntervalMs: number, task: () => Promise<T>): Promise<T> {
  const run = providerQueues[provider].then(async () => {
    const wait = lastRequestAt[provider] + minIntervalMs - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt[provider] = Date.now()
    return task()
  })
  // Keep the chain alive even when this call rejects.
  providerQueues[provider] = run.catch(() => undefined)
  return run
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface CallAgentOptions extends ChatOptions {
  /** Fired when a target fails, before the next one is tried. */
  onFallback?: (info: { failed: ProviderTarget; next: ProviderTarget; reason: string }) => void
  /** Fired once a target succeeds; `attempt` is 0 for the primary. */
  onSuccess?: (info: { target: ProviderTarget; attempt: number }) => void
}

/**
 * Spec §5: retry once with backoff, then fall back to the next configured
 * provider, then surface a clear error rather than hanging.
 */
export async function callAgent(
  agent: AgentId,
  config: AgentConfig,
  credentials: ProviderCredentials,
  messages: ChatMessage[],
  options: CallAgentOptions = {},
): Promise<{ content: string; target: ProviderTarget; usedFallback: boolean }> {
  const { onFallback, onSuccess, ...chatOptions } = options
  const chain = [config.primary, ...config.fallbacks].filter(
    (target) => target && target.model.trim().length > 0,
  )

  if (chain.length === 0) {
    throw new AllProvidersFailedError(agent, [
      {
        target: { provider: 'openrouter', model: '(unset)' },
        error: 'No model configured for this agent — set one in Settings.',
      },
    ])
  }

  const attempts: Array<{ target: ProviderTarget; error: string }> = []

  for (let index = 0; index < chain.length; index += 1) {
    const target = chain[index]
    const provider = createProvider(target, credentials)
    const interval = providerInterval(target.provider, credentials)

    // One retry per target, per the spec's "retry once with backoff".
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const content = await schedule(target.provider, interval, () =>
          provider.chat(messages, chatOptions),
        )
        onSuccess?.({ target, attempt: index })
        return { content, target, usedFallback: index > 0 }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const retryable = !(error instanceof AIProviderError) || error.retryable
        const cancelled = error instanceof DOMException && error.name === 'AbortError'

        if (cancelled) throw error

        const willRetrySameTarget = attempt === 0 && retryable
        if (willRetrySameTarget) {
          // A 429 usually means the rate window has not rolled over yet, so
          // wait at least one full provider interval before trying again.
          const backoff =
            error instanceof AIProviderError && error.status === 429 ? interval : 1_500
          await sleep(backoff)
          continue
        }

        attempts.push({ target, error: reason })
        const next = chain[index + 1]
        if (next) onFallback?.({ failed: target, next, reason })
        break
      }
    }
  }

  throw new AllProvidersFailedError(agent, attempts)
}

/** Test hook: clears pacing state so a fresh session does not inherit delays. */
export function resetRateLimiterState(): void {
  lastRequestAt.openrouter = 0
  lastRequestAt.pollinations = 0
}
