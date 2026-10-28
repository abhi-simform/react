import { api } from "@/lib/api/client"

import { pincodeCheckSchema, type PincodeCheck } from "./schemas"

/**
 * Public endpoint (no token). The plan allows a local stub until a real endpoint exists;
 * B2 already ships one (mock zone table on the server), so this calls the real thing.
 * The server is the authority: `POST /addresses` re-checks serviceability on submit.
 */
export const checkPincode = (
  pincode: string,
  signal?: AbortSignal
): Promise<PincodeCheck> =>
  api(`/pincodes/${encodeURIComponent(pincode)}`, {
    schema: pincodeCheckSchema,
    signal,
  })
