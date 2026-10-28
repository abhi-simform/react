import type {
  CartLine,
  CartLineInput,
  GuestCartLine,
  RemovedLine,
} from "./types.ts"

/** Set a line's quantity. qty <= 0 removes the line. Unknown sku: unchanged copy. */
export function updateQty<T extends CartLine>(
  lines: readonly T[],
  sku: string,
  qty: number
): T[] {
  if (qty <= 0) return removeLine(lines, sku)
  return lines.map((line) => (line.sku === sku ? { ...line, qty } : line))
}

export function removeLine<T extends CartLine>(
  lines: readonly T[],
  sku: string
): T[] {
  return lines.filter((line) => line.sku !== sku)
}

export type QtyResult = {
  lines: GuestCartLine[]
  /** The quantity the line ended up with (0 = no such line). */
  qty: number
  /** The request was cut down to the stock. */
  clamped: boolean
}

/** Pure clamp: at most the stock. (A min of 1 is the caller's business: 0 means remove.) */
export function clampToStock(qty: number, stock: number): number {
  return Math.min(Math.max(0, Math.floor(qty)), Math.max(0, stock))
}

/**
 * Add `qty` of a product. An sku already in the cart is INCREMENTED (and its stock snapshot
 * refreshed), not duplicated. The total is clamped to the stock; nothing is added when the
 * stock is 0 or `qty` is not a positive whole number.
 */
export function addLine(
  lines: readonly GuestCartLine[],
  input: CartLineInput,
  qty: number
): QtyResult {
  const existing = lines.find((l) => l.sku === input.sku)
  if (!Number.isInteger(qty) || qty < 1) {
    return { lines: [...lines], qty: existing?.qty ?? 0, clamped: false }
  }
  const wanted = (existing?.qty ?? 0) + qty
  const next = clampToStock(wanted, input.stock)
  const clamped = next < wanted
  if (next === 0) return { lines: [...lines], qty: 0, clamped }
  if (existing) {
    return {
      lines: lines.map((l) =>
        l.sku === input.sku ? { ...l, ...input, qty: next } : l
      ),
      qty: next,
      clamped,
    }
  }
  return { lines: [...lines, { ...input, qty: next }], qty: next, clamped }
}

/** Set a quantity with the stock clamp. `qty <= 0` removes the line. Unknown sku: unchanged. */
export function setLineQty(
  lines: readonly GuestCartLine[],
  sku: string,
  qty: number
): QtyResult {
  const line = lines.find((l) => l.sku === sku)
  if (!line) return { lines: [...lines], qty: 0, clamped: false }
  if (qty <= 0) return { lines: removeLine(lines, sku), qty: 0, clamped: false }
  const next = clampToStock(qty, line.stock)
  return {
    lines: updateQty(lines, sku, next),
    qty: next,
    clamped: next < qty,
  }
}

/** Snapshot for undo: the line and the full sku order at this moment. */
export function snapshotLine(
  lines: readonly GuestCartLine[],
  sku: string
): RemovedLine | undefined {
  const line = lines.find((l) => l.sku === sku)
  return line ? { line, order: lines.map((l) => l.sku) } : undefined
}

/**
 * Undo a removal: put the line back at ITS place in the original order, relative to whatever
 * is still there. Counting how many of the remaining lines came before it originally (instead
 * of remembering an index) keeps several overlapping undos consistent: remove B, remove A,
 * undo A, undo B gives A, B again. If the sku was added again meanwhile, that line is kept
 * and only its quantity is restored.
 */
export function restoreLine(
  lines: readonly GuestCartLine[],
  removed: RemovedLine
): GuestCartLine[] {
  const { line, order } = removed
  if (lines.some((l) => l.sku === line.sku)) {
    return lines.map((l) => (l.sku === line.sku ? { ...l, qty: line.qty } : l))
  }
  const rank = (sku: string) => order.indexOf(sku)
  // Right after the last remaining line that originally came before it (or first if none).
  // Lines added AFTER the removal have rank -1 and are never "before" anything.
  let index = 0
  lines.forEach((l, i) => {
    const r = rank(l.sku)
    if (r !== -1 && r < rank(line.sku)) index = i + 1
  })
  return [...lines.slice(0, index), line, ...lines.slice(index)]
}
