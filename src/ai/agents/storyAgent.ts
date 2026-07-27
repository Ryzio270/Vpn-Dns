import { callAgent, type CallAgentOptions } from '@/ai/resilientChat'
import type { AgentConfig, ChatMessage } from '@/ai/types'
import type { ProviderCredentials } from '@/ai/providers'
import {
  renderCharacterSummary,
  renderLoreSnippets,
  renderQuestSummaries,
  renderRecentLog,
  type TurnContext,
} from '@/db/contextBuilder'

const SYSTEM_PROMPT = `You are the Dungeon Master for a solo tabletop RPG campaign. Narrate in
second person, present tense. Respond to the player's action in
120-280 words: vivid scene description, NPC dialogue, and consequences.
When an outcome is uncertain, prompt a specific roll (e.g. "Roll a
Perception check"). Never decide actions for the player character.
End at a natural decision point — don't chain multiple player turns
together in one response.`

export function buildStoryPrompt(context: TurnContext, playerInput: string, recentExchanges: number) {
  const user = `CAMPAIGN SETTING:
${context.campaign.settingSummary || 'Not yet described.'}
Tone: ${context.campaign.tone || 'Classic fantasy adventure.'}

DIRECTOR'S BRIEF (weave this in naturally, don't force it):
${context.directorBrief || 'No brief yet — establish the scene and give the player something to react to.'}

RELEVANT COMPENDIUM ENTRIES:
${renderLoreSnippets(context.relevantLore)}

CHARACTER:
${renderCharacterSummary(context.character)}

ACTIVE QUESTS:
${renderQuestSummaries(context.activeQuests)}

RECENT SCENE (last ${recentExchanges} exchanges):
${renderRecentLog(context.recentLog)}

PLAYER'S ACTION:
${playerInput}`

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ]
  return messages
}

export async function generateStory(
  config: AgentConfig,
  credentials: ProviderCredentials,
  context: TurnContext,
  playerInput: string,
  recentExchanges: number,
  options: CallAgentOptions = {},
) {
  const messages = buildStoryPrompt(context, playerInput, recentExchanges)
  const result = await callAgent('story', config, credentials, messages, {
    temperature: 0.85,
    maxTokens: 700,
    ...options,
  })
  return { ...result, content: result.content.trim() }
}
