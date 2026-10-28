/**
 * Put in the `default` branch of a switch over a union. If a member is not
 * handled, `x` is not `never` any more and the call fails to COMPILE; if bad
 * data sneaks in at runtime, it throws.
 */
export function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`)
}
