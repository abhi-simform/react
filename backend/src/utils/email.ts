import nodemailer from "nodemailer"
import { env, isTest } from "../config/env.js"
import { logger } from "../config/logger.js"

const transport = isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
    })

/** Fire-and-forget safe: a mail outage must never fail a signup. Dev inbox: http://localhost:8025 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html })
  } catch (err) {
    logger.warn({ err, to, subject }, "Failed to send email")
  }
}
