import crypto from "node:crypto"

/** A random opaque token (sent to the client) and its sha256 hash (stored in the DB). */
export function generateToken(bytes = 32) {
  const token = crypto.randomBytes(bytes).toString("hex")
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex")
