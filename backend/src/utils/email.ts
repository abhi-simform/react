import nodemailer from "nodemailer"
import { env, isTest } from "../config/env.js"
import { logger } from "../config/logger.js"
import { enqueue, registerJob } from "../jobs/queue.js"

const transport = isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } }
        : {}),
    })

type EmailJob = { to: string; subject: string; html: string }

// The job handler THROWS on failure so the queue retries with backoff (3 attempts).
registerJob<EmailJob>("email.send", async ({ to, subject, html }) => {
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html })
})

/**
 * Queue an email. The request that caused it (signup, order update) returns immediately; delivery
 * and retries happen in the background. Never throws. Dev inbox: http://localhost:8025
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await enqueue("email.send", { to, subject, html } satisfies EmailJob)
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to queue email")
  }
}
