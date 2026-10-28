import type { APIRequestContext } from "@playwright/test"

const MAILPIT = "http://localhost:8025/api/v1"

/** Poll Mailpit until a message to `to` arrives; returns its text body. */
export async function waitForMail(
  request: APIRequestContext,
  to: string,
  { subject }: { subject?: RegExp } = {}
): Promise<string> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const list = await request.get(
      `${MAILPIT}/search?query=${encodeURIComponent(`to:${to}`)}`
    )
    const { messages = [] } = (await list.json()) as {
      messages?: { ID: string; Subject: string }[]
    }
    const hit = messages.find((m) => !subject || subject.test(m.Subject))
    if (hit) {
      const full = await request.get(`${MAILPIT}/message/${hit.ID}`)
      const body = (await full.json()) as { Text?: string; HTML?: string }
      return body.Text ?? body.HTML ?? ""
    }
    await new Promise((r) => setTimeout(r, 300)) // polling an external mailbox: no UI to wait on
  }
  throw new Error(`No mail for ${to} within 15 s`)
}

/** The first URL in the mail that contains `fragment` (e.g. "/verify-email?token="). */
export function linkIn(body: string, fragment: string): string {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = body.match(
    new RegExp(`https?://[^\\s"'<>]*${escaped}[^\\s"'<>]*`)
  )
  if (!match) throw new Error(`No link containing ${fragment} in the mail`)
  return match[0].replace(/&amp;/g, "&")
}
