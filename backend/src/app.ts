import compression from "compression"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import crypto from "node:crypto"
import swaggerUi from "swagger-ui-express"
import { API_PREFIX } from "./config/constants.js"
import { env, isTest } from "./config/env.js"
import { logger } from "./config/logger.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { notFound } from "./middleware/notFound.js"
import { apiLimiter } from "./middleware/rateLimit.js"
import { openApiDocument } from "./openapi.js"
import { routes } from "./routes.js"

// App factory: builds the Express app WITHOUT listening, so tests can import it.
export function createApp() {
  const app = express()
  app.set("trust proxy", 1) // correct client IPs behind a reverse proxy / load balancer

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })) // allow the SPA to show API-hosted images
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(compression())
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers["x-request-id"] as string) ?? crypto.randomUUID()
        res.setHeader("x-request-id", id)
        return id
      },
      autoLogging: !isTest,
    })
  )
  app.use(express.json({ limit: "1mb" }))
  app.use(cookieParser())
  app.use(API_PREFIX, apiLimiter)

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument))
  app.use(API_PREFIX, routes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
