import pino from "pino"
import { env, isProd } from "./env.js"

// `pino-pretty` is a devDependency: the Docker image installs `--omit=dev`, so a container started with a development
// `.env` (the compose `app` profile) crashed with "unable to determine transport target" (found in 14.3).
// Pretty output only when the package is really there; otherwise plain JSON lines, which is what hosts want anyway.
const prettyAvailable = (() => {
  try {
    import.meta.resolve("pino-pretty")
    return true
  } catch {
    return false
  }
})()

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  transport:
    isProd || env.NODE_ENV === "test" || !prettyAvailable
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
})
