import { addMinutes, isBefore, parseISO } from "date-fns"

// The shop runs on India time (UTC+5:30, no DST). Admins pick calendar days / wall-clock times;
// the API stores instants. These helpers convert between the two WITHOUT depending on the
// browser's own time zone (an admin travelling or a CI machine in UTC must get the same result).
const IST_OFFSET_MIN = 330

/** "2026-11-01" -> the instant that day starts in India. */
export const istDayStart = (ymd: string) => parseISO(`${ymd}T00:00:00+05:30`)
/** "2026-11-01" -> the last millisecond of that day in India. */
export const istDayEnd = (ymd: string) => parseISO(`${ymd}T23:59:59.999+05:30`)

/** An instant -> "YYYY-MM-DD" as seen in India. */
export const toIstDay = (iso: string | Date) =>
  addMinutes(new Date(iso), IST_OFFSET_MIN).toISOString().slice(0, 10)
/** An instant -> "YYYY-MM-DDTHH:mm" (what <input type="datetime-local"> wants) as seen in India. */
export const toIstLocal = (iso: string | Date) =>
  addMinutes(new Date(iso), IST_OFFSET_MIN).toISOString().slice(0, 16)
/** "YYYY-MM-DDTHH:mm" typed as India wall-clock time -> the instant. */
export const fromIstLocal = (local: string) => parseISO(`${local}:00+05:30`)

export type Window = { startsAt: Date; endsAt: Date }
/** Half-open windows [start, end) overlap when each starts before the other ends. */
export const overlaps = (a: Window, b: Window) =>
  isBefore(a.startsAt, b.endsAt) && isBefore(b.startsAt, a.endsAt)

export type DealWindow = {
  id: string
  productId: string
  startsAt: string
  endsAt: string
  isActive: boolean
}
/** The first ACTIVE deal on the same product whose window overlaps `w` (ignoring `excludeId`). */
export function findDealOverlap(
  deals: DealWindow[],
  productId: string,
  w: Window,
  excludeId?: string
) {
  return deals.find(
    (d) =>
      d.isActive &&
      d.id !== excludeId &&
      d.productId === productId &&
      overlaps(w, {
        startsAt: new Date(d.startsAt),
        endsAt: new Date(d.endsAt),
      })
  )
}
