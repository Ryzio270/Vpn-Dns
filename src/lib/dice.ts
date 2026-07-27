export interface DiceRoll {
  notation: string
  rolls: number[]
  modifier: number
  total: number
}

/** Parses standard dice notation: `d20`, `2d6`, `1d8+3`, `4d6-1`. */
export function rollDice(notation: string): DiceRoll | null {
  const match = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(notation)
  if (!match) return null

  const count = Math.min(20, Math.max(1, Number(match[1] || 1)))
  const sides = Math.min(1000, Math.max(2, Number(match[2])))
  const modifier = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0

  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier

  return { notation: `${count}d${sides}${modifier ? formatModifier(modifier) : ''}`, rolls, modifier, total }
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

/** Human-readable roll result, sent to the DM as part of the player's turn. */
export function describeRoll(roll: DiceRoll): string {
  const detail =
    roll.rolls.length > 1 || roll.modifier
      ? ` (${roll.rolls.join(' + ')}${roll.modifier ? ` ${formatModifier(roll.modifier)}` : ''})`
      : ''
  return `I roll ${roll.notation}: **${roll.total}**${detail}.`
}

export const QUICK_DICE = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4', '2d6'] as const
