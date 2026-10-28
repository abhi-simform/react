import { api } from "@/lib/api/client"

import { suggestionsSchema, type Suggestions } from "./schemas"

export const getSuggestions = (
  q: string,
  signal?: AbortSignal
): Promise<Suggestions> =>
  api("/search/suggest", {
    query: { q, limit: 5 },
    schema: suggestionsSchema,
    signal,
  })
