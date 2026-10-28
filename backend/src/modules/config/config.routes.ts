import { Router } from "express"
import { ok } from "../../utils/response.js"
import { publicCache } from "../../middleware/httpCache.js"

/**
 * Display-only settings the SPA needs before it can format a price. Prices are stored and CHARGED
 * in INR; `rates` convert for display only. Static table here (a real system would refresh it
 * daily from a rates provider); `asOf` tells the UI how fresh it is.
 */
export const configRoutes = Router()
configRoutes.get("/public", publicCache(3600, 86_400), (_req, res) => {
  ok(res, {
    baseCurrency: "INR",
    currencies: {
      INR: { rate: 1, symbol: "₹" },
      USD: { rate: 0.0119, symbol: "$" },
      EUR: { rate: 0.0102, symbol: "€" },
      GBP: { rate: 0.0089, symbol: "£" },
      AED: { rate: 0.0437, symbol: "AED" },
    },
    asOf: "2026-10-01",
    locales: ["en", "hi"],
    chargedCurrency: "INR",
  })
})
