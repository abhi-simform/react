// The API sends integer rupees; the cart layer works in integer paise so that
// percentages never produce float artefacts until the very last rounding.
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
