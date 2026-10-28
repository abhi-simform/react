// Run: node --import ./scratch/register-alias.mjs scratch/13-duration.ts
import { formatCountdown, splitDuration } from "../app/lib/duration.ts"

let failures = 0
const check = (ok: boolean, message: string) => {
  if (!ok) {
    failures++
    console.error("FAIL:", message)
  }
}

check(formatCountdown(splitDuration(0)) === "00:00:00", "zero")
check(
  formatCountdown(splitDuration(-5000)) === "00:00:00",
  "negative clamps to zero"
)
check(formatCountdown(splitDuration(1)) === "00:00:01", "sub-second rounds up")
check(formatCountdown(splitDuration(90 * 60_000)) === "01:30:00", "90 minutes")
check(
  formatCountdown(splitDuration((2 * 3600 + 14 * 60 + 9) * 1000)) ===
    "02:14:09",
  "2:14:09"
)
check(
  formatCountdown(splitDuration((86_400 + 3661) * 1000)) === "1d 01:01:01",
  "days"
)
console.log(
  failures === 0 ? "13-duration: ok" : `13-duration: ${failures} failures`
)
process.exitCode = failures ? 1 : 0
