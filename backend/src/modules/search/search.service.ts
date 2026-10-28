import { Category } from "../categories/category.model.js"
import { Product } from "../products/product.model.js"

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Classic two-row Levenshtein distance; vocabularies are small so this is plenty fast. */
export function editDistance(a: string, b: string) {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]!
}

// Words the "did you mean" check compares against: brands, category names, product-name words.
// Rebuilt at most every 5 minutes (a new brand showing up 5 minutes late is fine).
let vocab: { at: number; words: string[] } | null = null
async function vocabulary() {
  if (vocab && Date.now() - vocab.at < 5 * 60_000) return vocab.words
  const [brands, cats, names] = await Promise.all([
    Product.distinct("brand", { status: "active" }),
    Category.find({ isActive: true }).select("name").lean(),
    Product.find({ status: "active" }).select("name").lean(),
  ])
  const set = new Set<string>()
  for (const w of [
    ...brands,
    ...cats.map((c) => c.name),
    ...names.flatMap((n) => n.name.split(/\s+/)),
  ]) {
    const word = String(w)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
    if (word.length >= 3) set.add(word)
  }
  vocab = { at: Date.now(), words: [...set] }
  return vocab.words
}
/** Test hook: forget the cached vocabulary. */
export const resetVocabulary = () => {
  vocab = null
}

/** "samsng phone" -> "samsung phone", or null when no word is close enough to anything we sell. */
export async function didYouMean(q: string) {
  const words = await vocabulary()
  let changed = false
  const fixed = q
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      const clean = w.replace(/[^a-z0-9]/g, "")
      if (clean.length < 3 || words.includes(clean)) return w
      const max = clean.length < 5 ? 1 : 2
      let best: { word: string; d: number } | null = null
      for (const cand of words) {
        if (Math.abs(cand.length - clean.length) > max) continue
        const d = editDistance(clean, cand)
        if (d <= max && (!best || d < best.d)) best = { word: cand, d }
      }
      if (!best) return w
      changed = true
      return best.word
    })
    .join(" ")
  return changed ? fixed : null
}

/**
 * Autocomplete. Prefix match on word starts ("sam" finds "Samsung Galaxy" and "Galaxy by Sam"),
 * most popular first, in one round trip for all groups. Only when NOTHING matches do we look for a
 * spelling correction, and we never return a correction that itself has no results.
 */
export async function suggest(q: string, limit: number) {
  const re = new RegExp(`(^|[\\s\\-])${escapeRegex(q)}`, "i")
  const [products, categories, brands] = await Promise.all([
    Product.find({ status: "active", $or: [{ name: re }, { brand: re }] })
      .sort({ soldCount: -1, _id: 1 })
      .limit(limit)
      .select("name slug brand price images category")
      .populate("category", "name slug")
      .lean(),
    Category.find({ isActive: true, name: re }).sort({ name: 1 }).limit(4).lean(),
    Product.aggregate<{ _id: string; count: number }>([
      { $match: { status: "active", brand: re } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 4 },
    ]),
  ])

  let correction: string | null = null
  if (!products.length && !categories.length && !brands.length) {
    const guess = await didYouMean(q)
    if (guess) {
      const hit = await Product.exists({ status: "active", $text: { $search: guess } })
      const hit2 =
        hit ??
        (await Product.exists({
          status: "active",
          $or: [
            { name: new RegExp(escapeRegex(guess), "i") },
            { brand: new RegExp(escapeRegex(guess), "i") },
          ],
        }))
      if (hit2) correction = guess
    }
  }

  return {
    query: q,
    products: products.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.price,
      image: p.images[0]?.url ?? null,
      category: p.category
        ? {
            name: (p.category as unknown as { name: string }).name,
            slug: (p.category as unknown as { slug: string }).slug,
          }
        : null,
    })),
    categories: categories.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
    })),
    brands: brands.map((b) => ({ name: b._id, count: b.count })),
    correction,
  }
}
