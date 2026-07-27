const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp
  if (delta < MINUTE) return 'Just now'
  if (delta < HOUR) {
    const minutes = Math.floor(delta / MINUTE)
    return `${minutes}m ago`
  }
  if (delta < DAY) {
    const hours = Math.floor(delta / HOUR)
    return `${hours}h ago`
  }
  if (delta < 7 * DAY) {
    const days = Math.floor(delta / DAY)
    return days === 1 ? 'Yesterday' : `${days}d ago`
  }
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** D&D-style ability modifier, e.g. 17 -> "+3". */
export function abilityModifier(score: number): string {
  const modifier = Math.floor((score - 10) / 2)
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}
