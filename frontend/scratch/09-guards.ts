// Run: node scratch/09-guards.ts
import { isApiError } from "../app/lib/api/envelope.ts"

let failures = 0
function check(ok: boolean, message: string) {
  if (!ok) {
    failures++
    console.assert(false, message)
  }
}

// well-formed
check(
  isApiError({ success: false, error: { code: "NOT_FOUND", message: "nope" } }),
  "minimal"
)
check(
  isApiError({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "bad",
      details: [{ path: "email" }],
    },
  }),
  "with details"
)

// malformed: all must be false
const malformed: unknown[] = [
  null,
  undefined,
  "error",
  42,
  [],
  {},
  { success: true, data: [] },
  { success: false },
  { success: false, error: null },
  { success: false, error: "boom" },
  { success: false, error: { code: "X" } },
  { success: false, error: { message: "m" } },
  { success: false, error: { code: 500, message: "m" } },
  { success: false, error: { code: "X", message: 7 } },
  { success: "false", error: { code: "X", message: "m" } },
]
for (const [i, value] of malformed.entries()) {
  check(isApiError(value) === false, `malformed #${i} should be false`)
}

if (failures) process.exit(1)
console.log("2.3 ok")
