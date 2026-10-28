import type { RequestHandler } from "express"

/**
 * HTTP caching policy for the API. Two layers with the SAME goal (do less work), different owners:
 *   - Cache-Control tells browsers/CDNs how long they may reuse a response without asking.
 *   - ETag (Express computes a weak one from the body for every res.json) lets them ASK cheaply:
 *     `If-None-Match` -> `304 Not Modified`, no body.
 * Default for every API response: `private, no-cache` = "you may store it, but revalidate first"
 * (safe for anything user-specific: cart, orders, me). Public catalog routes opt in to a real
 * max-age with `publicCache`. Mutations are `no-store`.
 */
export const defaultCachePolicy: RequestHandler = (req, res, next) => {
  const safe = req.method === "GET" || req.method === "HEAD"
  res.setHeader("Cache-Control", safe ? "private, no-cache" : "no-store")
  next()
}

/**
 * Shareable catalog data (identical for every visitor, so `public` is correct). After `maxAge` the
 * browser may keep SERVING the stale copy for `swr` more seconds while it revalidates in the
 * background (stale-while-revalidate), so the user never waits for the refresh.
 * Never mount this on a route that reads the Authorization header or cart token.
 */
export const publicCache =
  (maxAge: number, swr = maxAge * 5): RequestHandler =>
  (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD")
      res.setHeader(
        "Cache-Control",
        `public, max-age=${maxAge}, stale-while-revalidate=${swr}`
      )
    next()
  }
