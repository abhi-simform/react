// Mock serviceability data. A real build would call a logistics provider; this deterministic
// table keeps the API runnable offline and testable.
const METRO_PREFIXES = ["110", "400", "560", "600", "700", "500", "411", "380"] // Delhi, Mumbai, Blr, Chennai, Kol, Hyd, Pune, Ahmedabad
const REMOTE_PREFIXES = ["79", "78", "18", "19"] // North-east, J&K
const UNSERVICEABLE_PREFIXES = ["193", "194", "744"] // sensitive border zones, Andaman
const STATES: Record<string, string> = {
  "11": "Delhi",
  "40": "Maharashtra",
  "41": "Maharashtra",
  "56": "Karnataka",
  "60": "Tamil Nadu",
  "70": "West Bengal",
  "50": "Telangana",
  "38": "Gujarat",
}

export type Zone = "metro" | "standard" | "remote"

function zoneOf(pincode: string): Zone {
  if (METRO_PREFIXES.some((p) => pincode.startsWith(p))) return "metro"
  if (REMOTE_PREFIXES.some((p) => pincode.startsWith(p))) return "remote"
  return "standard"
}
const DAYS: Record<Zone, [number, number]> = {
  metro: [1, 2],
  standard: [3, 5],
  remote: [6, 9],
}

/** Add business days (Sundays are skipped; carriers do not deliver). */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from)
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() !== 0) left--
  }
  return d
}

export function checkPincode(pincode: string, now = new Date()) {
  if (UNSERVICEABLE_PREFIXES.some((p) => pincode.startsWith(p)))
    return { pincode, serviceable: false as const }
  const zone = zoneOf(pincode)
  const [min, max] = DAYS[zone]
  return {
    pincode,
    serviceable: true as const,
    zone,
    state: STATES[pincode.slice(0, 2)] ?? null,
    codAvailable: zone !== "remote",
    deliveryDays: { min, max },
    estimatedDelivery: {
      from: addBusinessDays(now, min).toISOString(),
      to: addBusinessDays(now, max).toISOString(),
    },
  }
}
export const isServiceable = (pincode: string) => checkPincode(pincode).serviceable
