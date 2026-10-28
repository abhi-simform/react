// Run: node scratch/circular-broken/run.ts   -> ReferenceError (TDZ)
// Bundlers that compile to `var` (or CommonJS) give `undefined` instead:
//   "cart for undefined". Same bug, different symptom.
import { catalogSummary } from "./catalog.ts"

console.log(catalogSummary())
