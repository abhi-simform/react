import type { CartLine } from "./types.ts"

/** Set a line's quantity. qty <= 0 removes the line. Unknown sku: unchanged copy. */
export function updateQty(
  lines: readonly CartLine[],
  sku: string,
  qty: number
): CartLine[] {
  if (qty <= 0) return removeLine(lines, sku)
  return lines.map((line) => (line.sku === sku ? { ...line, qty } : line))
}

export function removeLine(lines: readonly CartLine[], sku: string): CartLine[] {
  return lines.filter((line) => line.sku !== sku)
}
