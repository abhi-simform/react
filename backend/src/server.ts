import { createApp } from "./app.js"
import { connectDb, disconnectDb } from "./config/db.js"
import { env } from "./config/env.js"
import { logger } from "./config/logger.js"

async function main() {
  await connectDb()
  const server = createApp().listen(env.PORT, () => {
    logger.info(`API ready at http://localhost:${env.PORT}/api/v1  (docs: /api/docs)`)
  })

  // Graceful shutdown: stop accepting requests, finish in-flight ones, close the DB.
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`)
    server.close(async () => {
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
