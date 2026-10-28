export type Duration = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Split milliseconds into display parts. Seconds round UP: "00:00:01" lasts until the end, 00:00:00 only means "over". */
export function splitDuration(ms: number): Duration {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "02:14:09", or "3d 02:14:09" when days remain. */
export function formatCountdown({
  days,
  hours,
  minutes,
  seconds,
}: Duration): string {
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return days > 0 ? `${days}d ${clock}` : clock
}
