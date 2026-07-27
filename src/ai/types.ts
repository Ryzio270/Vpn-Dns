export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
  signal?: AbortSignal
}

export interface AIProvider {
  name: string
  model: string
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>
}

export type ProviderId = 'openrouter' | 'pollinations'

export interface ProviderTarget {
  provider: ProviderId
  model: string
}

export type AgentId = 'story' | 'bookkeeper' | 'director'

export interface AgentConfig {
  primary: ProviderTarget
  /** Tried in order after the primary exhausts its retry. */
  fallbacks: ProviderTarget[]
}

export class AIProviderError extends Error {
  constructor(
    public providerName: string,
    public status: number,
    message?: string,
    public retryable = true,
  ) {
    super(message ?? `${providerName} request failed (${status})`)
    this.name = 'AIProviderError'
  }
}

/** Thrown when the primary and every configured fallback have failed. */
export class AllProvidersFailedError extends Error {
  constructor(
    public agent: AgentId,
    public attempts: Array<{ target: ProviderTarget; error: string }>,
  ) {
    const detail = attempts.map((a) => `${a.target.provider}/${a.target.model}: ${a.error}`).join(' · ')
    super(`All providers failed for the ${agent} agent — ${detail}`)
    this.name = 'AllProvidersFailedError'
  }
}
