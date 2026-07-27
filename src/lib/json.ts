/**
 * Free-tier models honour JSON mode inconsistently, so never hand raw output
 * straight to JSON.parse. This strips markdown fences, drops any preamble, and
 * falls back to slicing the outermost balanced object.
 */
export function parseJsonLoose<T>(raw: string): T {
  const cleaned = stripFences(raw).trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    // fall through to extraction
  }

  const candidate = extractOutermostObject(cleaned)
  if (candidate) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // fall through to the repair pass
    }
    try {
      return JSON.parse(repairCommonBreakage(candidate)) as T
    } catch {
      // fall through to the error below
    }
  }

  throw new Error(`Model did not return parseable JSON: ${cleaned.slice(0, 160)}`)
}

function stripFences(raw: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  return fenced ? fenced[1] : raw
}

/** Scans for the first `{` and its matching `}`, ignoring braces inside strings. */
function extractOutermostObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }

  return null
}

/** Handles the two mistakes small models actually make: trailing commas and smart quotes. */
function repairCommonBreakage(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, '$1')
}
