import { Router } from "express"
import { isDbReady } from "../../config/db.js"

export const healthRoutes = Router()

healthRoutes.get("/", (_req, res) => {
  const db = isDbReady()
  res.status(db ? 200 : 503).json({
    success: db,
    data: {
      status: db ? "ok" : "degraded",
      db: db ? "up" : "down",
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
  })
})
