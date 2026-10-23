/**
 * lib/grounding.ts
 *
 * Deterministic hallucination guard for AI drafts.
 *
 * Every number the draft states (price, date, time, duration, percentage,
 * quantity) must also appear in the context the model was given: business
 * knowledge, active order data, retrieved examples, or the conversation
 * itself. A number that appears nowhere in the sources was invented by the
 * model — the draft must not be auto-sent.
 *
 * Numbers are compared by value, so "750rb", "Rp 750.000" and "750 ribu"
 * all match each other, and "1,5jt" matches "1.500.000".
 *
 * Limitation: numbers written as words ("dua minggu") are not detected.
 */

const UNIT_MULTIPLIER: Record<string, number> = {
  ribu: 1_000,
  rb: 1_000,
  k: 1_000,
  juta: 1_000_000,
  jt: 1_000_000,
}

// Number with optional id-ID/en grouping, optional unit suffix ("750rb", "1,5 jt").
const NUMBER_RE = /(\d+(?:[.,]\d+)*)(?:\s*(ribu|rb|juta|jt|k)\b)?/gi

const URL_RE = /https?:\/\/\S+/gi

function parseNumber(token: string): number {
  // "1.500.000" / "1.500.000,50" → id-ID thousands grouping
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) {
    return Number.parseFloat(token.replace(/\./g, "").replace(",", "."))
  }
  // "1,500,000" / "1,500,000.50" → en thousands grouping
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(token)) {
    return Number.parseFloat(token.replace(/,/g, ""))
  }
  // "1,5" / "1.5" / "09.00" → decimal (or time; "09.00" → 9, same as "09:00")
  return Number.parseFloat(token.replace(",", "."))
}

interface NumberMention {
  text: string
  value: number
}

function mentions(text: string): NumberMention[] {
  const found: NumberMention[] = []
  for (const match of text.replace(URL_RE, " ").matchAll(NUMBER_RE)) {
    const base = parseNumber(match[1])
    if (Number.isNaN(base)) continue
    const unit = match[2]?.toLowerCase()
    found.push({ text: match[0].trim(), value: unit ? base * UNIT_MULTIPLIER[unit] : base })
  }
  return found
}

/** All numeric values mentioned in a text, unit-normalised. */
export function extractNumbers(text: string): number[] {
  return mentions(text).map((m) => m.value)
}

/**
 * Values at or above this are money (prices, bills, DP). They must come from
 * business/order data — a customer writing "katanya 300rb kan?" must not be
 * able to ground the model agreeing to that price.
 */
export const MONEY_THRESHOLD = 1_000

/**
 * Return the numeric claims in `draft` not backed by any source.
 * - `trusted`: business knowledge, order data, owner hint.
 * - `conversation`: customer message + history — may ground small numbers
 *   only (quantities, sizes, dates the customer mentioned).
 * Empty array → every number in the draft is grounded.
 */
export function findUngroundedNumbers(
  draft: string,
  trusted: string[],
  conversation: string[] = [],
): string[] {
  const key = (n: number) => Math.round(n * 100)
  const trustedSet = new Set(trusted.flatMap(extractNumbers).map(key))
  const conversationSet = new Set(conversation.flatMap(extractNumbers).map(key))
  const ungrounded = mentions(draft)
    .filter((m) => {
      if (trustedSet.has(key(m.value))) return false
      return m.value >= MONEY_THRESHOLD || !conversationSet.has(key(m.value))
    })
    .map((m) => m.text)
  return [...new Set(ungrounded)]
}
