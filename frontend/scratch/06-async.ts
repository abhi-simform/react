// Run: node --import ./scratch/register-alias.mjs scratch/06-async.ts
// Needs the backend on :4000.
import assert from "node:assert/strict"

import { loadHomeData } from "@/features/catalog/homeData"
import { sleep, isAbortError, withTimeout } from "@/lib/async"
import { getJson, HttpError } from "@/lib/api/getJson"

const base = "http://localhost:4000/api/v1"

// fetch alone does NOT throw on 404...
const raw = await fetch(`${base}/nope`)
assert.equal(raw.ok, false)
assert.equal(raw.status, 404)
// ...getJson does
await assert.rejects(getJson(`${base}/nope`), (e: unknown) => {
  assert.ok(e instanceof HttpError)
  assert.equal(e.status, 404)
  assert.match(e.message, /^HTTP 404: /)
  return true
})

// allSettled: the broken request does not block the other two
const home = await loadHomeData(base)
assert.equal(home.newest?.length, 8)
assert.equal(home.topRated?.length, 8)
assert.equal(home.errors.length, 1)
assert.match(home.errors[0]!, /404/)

// abort: distinguishable from real failures
await assert.rejects(
  withTimeout((signal) => getJson(`${base}/products?limit=60`, { signal }), 1),
  (e: unknown) => {
    assert.ok(isAbortError(e), String(e))
    assert.equal((e as Error).name, "AbortError")
    return true
  }
)
// a real failure is NOT an AbortError
await assert.rejects(getJson(`${base}/nope`), (e: unknown) => !isAbortError(e))
// a fast request inside a generous timeout succeeds
assert.equal(
  (
    (await withTimeout(
      (s) => getJson(`${base}/health`, { signal: s }),
      3000
    )) as { success: boolean }
  ).success,
  true
)
// ignoring the signal still rejects (race)
await assert.rejects(
  withTimeout(() => sleep(200), 10),
  isAbortError
)

// sequential vs parallel timing (each call ~simulated by a real request)
const call = () => getJson(`${base}/products?limit=60`)
let t = performance.now()
await call()
await call()
await call()
const sequential = performance.now() - t
t = performance.now()
await Promise.all([call(), call(), call()])
const parallel = performance.now() - t
console.log(
  `sequential ${sequential.toFixed(0)}ms vs parallel ${parallel.toFixed(0)}ms`
)
const sleepSeq = performance.now()
await sleep(100)
await sleep(100)
const s1 = performance.now() - sleepSeq
const sleepPar = performance.now()
await Promise.all([sleep(100), sleep(100)])
const s2 = performance.now() - sleepPar
assert.ok(s1 >= 195 && s2 < 150, `sleep seq=${s1} par=${s2}`)

console.log("1.6 ok")
