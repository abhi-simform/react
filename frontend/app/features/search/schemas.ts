import { z } from "zod"

/** `GET /search/suggest` (B8). Only what the dropdown needs: no full product rows. */
export const suggestionsSchema = z.object({
  query: z.string(),
  products: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      brand: z.string(),
      price: z.number(),
      image: z.string().nullable(),
      category: z.object({ name: z.string(), slug: z.string() }).nullable(),
    })
  ),
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string() })
  ),
  brands: z.array(z.object({ name: z.string(), count: z.number().int() })),
  /** "Did you mean": only set when nothing matched and the corrected term has results. */
  correction: z.string().nullable(),
})
export type Suggestions = z.infer<typeof suggestionsSchema>
