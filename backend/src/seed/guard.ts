/**
 * 14.5: the seed script must not be able to hurt a real database by accident.
 *  - `--reset` DROPS the database: against a non-local URI it needs the long explicit flag.
 *  - the seeded accounts' password is the well-known development one only for a local database;
 *    anywhere else `SEED_PASSWORD` (12+ characters, not the dev one) is required.
 * Pure, so it is unit tested. Throws an Error with the reason; the caller prints it and exits.
 */
export const DEV_PASSWORD = "Password123"
export const WIPE_FLAG = "--i-know-this-wipes-the-database"

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "mongo",
  "host.docker.internal",
])

export function isLocalMongoUri(uri: string): boolean {
  const m = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri)
  const hosts = m?.[1]
  if (!hosts) return false
  return hosts
    .split(",")
    .every((hostPort) => LOCAL_HOSTS.has(hostPort.replace(/:\d+$/, "")))
}

export function resolveSeedSafety(input: {
  uri: string
  argv: string[]
  seedPassword?: string
}): { password: string; local: boolean } {
  const local = isLocalMongoUri(input.uri)
  if (local) return { password: input.seedPassword || DEV_PASSWORD, local }
  if (input.argv.includes("--reset") && !input.argv.includes(WIPE_FLAG))
    throw new Error(
      `Refusing to DROP a non-local database (${redact(input.uri)}). If you really mean it, add ${WIPE_FLAG}.`
    )
  const pw = input.seedPassword ?? ""
  if (pw.length < 12 || pw === DEV_PASSWORD)
    throw new Error(
      "Seeding a non-local database needs SEED_PASSWORD (12+ characters, not the development password): the seeded admin account would otherwise have a public password."
    )
  return { password: pw, local }
}

/** Never print credentials from a connection string. */
const redact = (uri: string) => uri.replace(/\/\/[^@/]*@/, "//***@")
