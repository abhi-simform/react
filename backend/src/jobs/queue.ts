import { Queue, Worker, type ConnectionOptions } from "bullmq"
import { env, isTest, redisEnabled } from "../config/env.js"
import { logger } from "../config/logger.js"

/**
 * Background jobs behind ONE small interface with two drivers:
 *   - BullMQ on Redis when REDIS_URL is set: durable, retried with backoff, shared by instances.
 *   - an in-process runner otherwise: same handlers, same retry/backoff, but jobs die with the
 *     process (fine for local dev; say so in the docs, never pretend it is durable).
 * A module registers its handler once (`registerJob`); producers call `enqueue(name, data)`.
 */
export type JobHandler<T = unknown> = (data: T) => Promise<void>
type Registered = { handler: JobHandler<never>; repeatEveryMs?: number }

const registry = new Map<string, Registered>()
const ATTEMPTS = 3
const BACKOFF_MS = isTest ? 1 : 1000

export function registerJob<T>(
  name: string,
  handler: JobHandler<T>,
  opts: { repeatEveryMs?: number } = {}
) {
  registry.set(name, { handler: handler as JobHandler<never>, ...opts })
}

// ---- in-process driver ---------------------------------------------------------------------------
const timers = new Set<NodeJS.Timeout>()
const inflight = new Set<Promise<void>>()
export const memoryStats = { completed: 0, failed: 0 }

async function runWithRetry(name: string, data: unknown, attempt = 1): Promise<void> {
  const job = registry.get(name)
  if (!job) return logger.error({ name }, "No handler registered for job")
  try {
    await job.handler(data as never)
    memoryStats.completed++
  } catch (err) {
    if (attempt >= ATTEMPTS) {
      memoryStats.failed++
      logger.error({ err, name, attempt }, "Job failed permanently")
      return
    }
    logger.warn({ err, name, attempt }, "Job failed, will retry")
    await new Promise<void>((r) => {
      const t = setTimeout(r, BACKOFF_MS * 2 ** (attempt - 1))
      t.unref()
    })
    return runWithRetry(name, data, attempt + 1)
  }
}

// ---- BullMQ driver -------------------------------------------------------------------------------
let queue: Queue | null = null
let workers: Worker[] = []
const bullConnection = (): ConnectionOptions =>
  ({
    url: env.REDIS_URL!,
    maxRetriesPerRequest: null, // required by BullMQ for blocking connections
  }) as unknown as ConnectionOptions

const QUEUE_NAME = "shopsphere"
const getQueue = () =>
  (queue ??= new Queue(QUEUE_NAME, {
    connection: bullConnection(),
    defaultJobOptions: {
      attempts: ATTEMPTS,
      backoff: { type: "exponential", delay: BACKOFF_MS },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  }))

export const jobDriver = () => (redisEnabled ? "bullmq" : "memory")

/** Fire-and-forget (JOBS_ENABLED only gates the workers/schedulers, not producing). Never throws: a failed enqueue must not fail the request that caused it. */
export async function enqueue(name: string, data: unknown): Promise<void> {
  try {
    if (redisEnabled) {
      await getQueue().add(name, data)
      return
    }
    const p = runWithRetry(name, data).finally(() => inflight.delete(p))
    inflight.add(p)
  } catch (err) {
    logger.error({ err, name }, "Failed to enqueue job")
  }
}

/** Starts workers and repeating jobs. Call once at boot (server.ts), after all modules registered. */
export async function startJobs() {
  if (!env.JOBS_ENABLED)
    return logger.info("Background jobs disabled (JOBS_ENABLED=false)")
  if (redisEnabled) {
    const q = getQueue()
    workers = [
      new Worker(
        QUEUE_NAME,
        async (job) => {
          const r = registry.get(job.name)
          if (!r) throw new Error(`No handler for job ${job.name}`)
          await r.handler(job.data as never)
        },
        { connection: bullConnection(), concurrency: 5 }
      ),
    ]
    workers[0]!.on("failed", (job, err) =>
      logger.error({ err, name: job?.name }, "Job failed")
    )
    for (const [name, r] of registry)
      if (r.repeatEveryMs)
        // One scheduler per job name, upserted: several instances do not multiply it.
        await q.upsertJobScheduler(name, { every: r.repeatEveryMs }, { name, data: {} })
  } else {
    for (const [name, r] of registry)
      if (r.repeatEveryMs) {
        const t = setInterval(() => void enqueue(name, {}), r.repeatEveryMs)
        t.unref()
        timers.add(t)
      }
  }
  logger.info(`Jobs started (${jobDriver()}): ${[...registry.keys()].join(", ")}`)
}

export async function stopJobs() {
  for (const t of timers) clearInterval(t)
  timers.clear()
  await Promise.allSettled([...inflight])
  await Promise.allSettled(workers.map((w) => w.close()))
  workers = []
  await queue?.close()
  queue = null
}

/** Test helper: wait until the in-process runner is idle. */
export const drainJobs = () => Promise.allSettled([...inflight]).then(() => undefined)
