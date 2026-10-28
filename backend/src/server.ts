import { createServer } from "node:http"
import { createApp } from "./app.js"
import { connectDb, disconnectDb } from "./config/db.js"
import { env } from "./config/env.js"
import { logger } from "./config/logger.js"
import { closeRedis } from "./config/redis.js"
import { startJobs, stopJobs } from "./jobs/index.js"
import { closeRealtime, initRealtime } from "./realtime/socket.js"

async function main() {
  await connectDb()
  // Express and Socket.io share ONE http server (and port): /api/v1 and /socket.io.
  const server = createServer(createApp())
  initRealtime(server)
  await startJobs() // BullMQ workers (REDIS_URL) or the in-process runner; repeating jobs included
  server.listen(env.PORT, () => {
    logger.info(
      `API ready at http://localhost:${env.PORT}/api/v1  (docs: /api/docs, realtime: /socket.io)`
    )
  })

  // Graceful shutdown: stop accepting requests, finish in-flight ones, close the DB.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`)
    void closeRealtime() // also closes the http server (ends open sockets)
    server.close(async () => {
      await stopJobs()
      await closeRedis()
      await disconnectDb()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}

process.on("unhandledRejection", (err) => logger.fatal({ err }, "Unhandled rejection"))
main().catch((err) => {
  logger.fatal({ err }, "Failed to start")
  process.exit(1)
})
