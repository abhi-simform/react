export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run an abortable operation with a deadline. After `ms` the signal aborts
 * (a fetch then rejects with an AbortError). The race makes sure we also
 * reject when `run` ignores the signal.
 */
export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  ms: number
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () =>
      reject(controller.signal.reason)
    )
  })
  try {
    return await Promise.race([run(controller.signal), aborted])
  } finally {
    clearTimeout(timer)
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}
