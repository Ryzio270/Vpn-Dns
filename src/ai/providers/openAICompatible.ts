import { AIProviderError, type AIProvider, type ChatMessage, type ChatOptions } from '@/ai/types'

/**
 * OpenRouter and Pollinations both speak the OpenAI chat-completions schema,
 * so one class covers both (spec §5). Only the base URL, key and model differ.
 */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public name: string,
    private baseUrl: string,
    private apiKey: string,
    public model: string,
    private extraHeaders: Record<string, string> = {},
  ) {}

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          ...this.extraHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts?.temperature ?? 0.8,
          ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
          ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: opts?.signal,
      })
    } catch (error) {
      // Network-level failure (offline, DNS, TLS). Worth retrying.
      throw new AIProviderError(this.name, 0, describeNetworkError(error), true)
    }

    if (!res.ok) {
      const body = await safeText(res)
      throw new AIProviderError(
        this.name,
        res.status,
        `${this.name} ${res.status}: ${extractApiMessage(body) ?? res.statusText}`,
        // 4xx other than 408/429 means the request itself is wrong — a retry
        // against the same target would fail identically, so move on instead.
        res.status >= 500 || res.status === 429 || res.status === 408,
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string }
    }

    // Some free endpoints answer 200 with an error body rather than an HTTP error.
    if (data.error?.message) {
      throw new AIProviderError(this.name, 200, `${this.name}: ${data.error.message}`, true)
    }

    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIProviderError(this.name, 200, `${this.name} returned an empty completion`, true)
    }
    return content
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

function extractApiMessage(body: string): string | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string }
    return parsed.error?.message ?? parsed.message ?? null
  } catch {
    return body.slice(0, 160)
  }
}

function describeNetworkError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Request cancelled'
  return error instanceof Error ? `Network error: ${error.message}` : 'Network error'
}
