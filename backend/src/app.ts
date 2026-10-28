import compression from "compression"
import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import crypto from "node:crypto"
import swaggerUi from "swagger-ui-express"
import { API_PREFIX } from "./config/constants.js"
import { env, isProd, isTest } from "./config/env.js"
import { logger } from "./config/logger.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { defaultCachePolicy } from "./middleware/httpCache.js"
import { notFound } from "./middleware/notFound.js"
import { apiLimiter } from "./middleware/rateLimit.js"
import { openApiDocument } from "./openapi.js"
import { mountUploadFiles } from "./modules/uploads/upload.routes.js"
import { routes } from "./routes.js"

// App factory: builds the Express app WITHOUT listening, so tests can import it.
export function createApp() {
  const app = express()
  app.set("trust proxy", 1) // correct client IPs behind a reverse proxy / load balancer

  // Security headers. This server returns JSON and images, never pages, so its CSP can be the
  // strictest possible: nothing may load or run from an API response, and it cannot be framed.
  // Only the Swagger UI page (which needs inline scripts/styles) gets the relaxed default policy.
  const apiCsp = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow the SPA to show API-hosted images
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    strictTransportSecurity: isProd
      ? { maxAge: 15_552_000, includeSubDomains: true }
      : false,
  })
  const docsCsp = helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })
  app.use((req, res, next) =>
    (req.path.startsWith("/api/docs") ? docsCsp : apiCsp)(req, res, next)
  )
  app.use((_req, res, next) => {
    // Helmet has no Permissions-Policy: switch off browser features an API never needs.
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    )
    next()
  })
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      // Without this the browser hides these from fetch(): the invoice filename and the replay marker.
      exposedHeaders: ["Content-Disposition", "Idempotent-Replayed", "x-request-id"],
    })
  )
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
  // The payment webhook signature covers the RAW bytes, so keep them for that one route.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: express.Request, _res, buf) => {
        if (req.url.startsWith("/api/v1/payments/webhook")) req.rawBody = buf
      },
    })
  )
  app.use(cookieParser())
  app.use(API_PREFIX, apiLimiter, defaultCachePolicy)

  mountUploadFiles(app) // GET /uploads/<file> (local-disk adapter), outside the /api/v1 prefix
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument))
  app.use(API_PREFIX, routes)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
