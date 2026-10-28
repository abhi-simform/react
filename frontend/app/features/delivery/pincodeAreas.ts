import type { IndiaState } from "@/lib/indiaStates"

/**
 * STUB (7.6): a tiny prefix -> area table used to pre-fill city and state in the address form.
 * A real build would ask a postal API; the pincode endpoint of this backend returns only a
 * zone and (for some prefixes) a state, never a city. First three digits identify the sorting district.
 */
const AREAS: Record<string, { city: string; state: IndiaState }> = {
  "110": { city: "New Delhi", state: "Delhi" },
  "400": { city: "Mumbai", state: "Maharashtra" },
  "411": { city: "Pune", state: "Maharashtra" },
  "560": { city: "Bengaluru", state: "Karnataka" },
  "600": { city: "Chennai", state: "Tamil Nadu" },
  "700": { city: "Kolkata", state: "West Bengal" },
  "500": { city: "Hyderabad", state: "Telangana" },
  "380": { city: "Ahmedabad", state: "Gujarat" },
}

export function lookupArea(pincode: string) {
  return AREAS[pincode.slice(0, 3)]
}
