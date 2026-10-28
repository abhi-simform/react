/** Express costs Rs 99 (paise). Standard shipping follows `computeTotals`. */
export const EXPRESS_FEE = 99_00

export const SLOT_WINDOWS = [
  { id: "9-12", label: "9 am - 12 pm" },
  { id: "12-16", label: "12 pm - 4 pm" },
  { id: "16-20", label: "4 pm - 8 pm" },
] as const

const pad = (n: number) => String(n).padStart(2, "0")
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** `YYYY-MM-DD|9-12`: what the form stores for the chosen slot. */
export const slotValue = (day: string, windowId: string) => `${day}|${windowId}`

/**
 * The next `count` delivery days from `start` (Sundays skipped: carriers do not deliver).
 * Local time on purpose: slots are what the customer sees on their own calendar.
 */
export function slotDays(start: Date, count = 4): Date[] {
  const days: Date[] = []
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (days.length < count) {
    if (d.getDay() !== 0) days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export { isoDay }

/** "2026-10-30|16-20" -> "Fri 30 Oct, 4 pm - 8 pm" (the form stores the compact value). */
export function describeSlot(value: string | undefined): string {
  if (!value) return "no slot chosen"
  const [day, windowId] = value.split("|")
  const win = SLOT_WINDOWS.find((w) => w.id === windowId)
  const date = day ? new Date(`${day}T00:00:00`) : undefined
  if (!date || Number.isNaN(date.getTime()) || !win) return value
  const label = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date)
  return `${label}, ${win.label}`
}
