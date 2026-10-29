// eslint-disable-next-line no-restricted-imports -- the one allowed import of "zod" (see below)
import { z } from "zod"

/**
 * The app imports Zod from HERE, never from "zod" (an ESLint rule enforces it). 14.1: Zod 4 probes for `eval`
 * support (`new Function("")`) when a schema is created, to compile fast parsers. Our production CSP has no
 * `'unsafe-eval'`, so the probe is BLOCKED: harmless (Zod falls back) but every page load logged a `script-src eval`
 * CSP violation, which would also bury real reports. `jitless` skips the probe and always uses the interpreted
 * parser; the cost is small (in production most responses are not parsed at all, see `VALIDATE` in lib/api/client.ts).
 * It must run BEFORE the first schema is created, and a module that every schema file imports is the one place
 * that guarantees the order (a side-effect import in `root.tsx` ran too late: the bundler put schemas first).
 */
z.config({ jitless: true })

export { z }
