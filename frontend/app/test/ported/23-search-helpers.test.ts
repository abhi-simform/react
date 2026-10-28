import { buildGroups, flatten } from "@/features/search/options"
import { splitMatches } from "@/features/search/highlight"
import { addRecent, MAX_RECENT } from "@/features/search/recentSearches"
import { normalizeTerm } from "@/features/search/term"

describe("23-search-helpers", () => {
  it("holds every assertion of the Stage 1-11 scratch check", async () => {
    let failures = 0
    const check = (ok: boolean, message: string) => {
      if (!ok) {
        failures++
        console.error("FAIL:", message)
      }
    }

    // highlight: parts always rebuild the text, regex characters are literal, case is kept
    const segs = splitMatches("Samsung Galaxy S24", "sam gal")
    check(
      segs.map((s) => s.text).join("") === "Samsung Galaxy S24",
      "round trip"
    )
    check(
      segs
        .filter((s) => s.match)
        .map((s) => s.text)
        .join("|") === "Sam|Gal",
      "matches both words, keeps the original case"
    )
    check(
      splitMatches("C++ Primer (2nd)", "c++").some(
        (s) => s.match && s.text === "C++"
      ),
      "regex characters are literal"
    )
    check(
      splitMatches("<img onerror=x>", "img")
        .map((s) => s.text)
        .join("") === "<img onerror=x>",
      "markup stays text"
    )
    check(
      splitMatches("abc", "   ").length === 1,
      "blank query: one plain segment"
    )

    // recent searches: newest first, case-insensitive dedupe keeps the latest spelling, cap 8
    let r: string[] = []
    for (const t of ["a", "b", "A", "c"]) r = addRecent(r, t)
    check(r.join() === "c,A,b", `dedupe (got ${r.join()})`)
    for (let i = 0; i < 12; i++) r = addRecent(r, `t${i}`)
    check(
      r.length === MAX_RECENT && r[0] === "t11",
      "capped at 8, newest first"
    )
    check(addRecent(["x"], "   ").join() === "x", "blank is ignored")

    // term normalisation = cache key
    check(normalizeTerm("  Sams  Ung ") === "sams ung", "normalised")

    // groups
    const empty = buildGroups({ term: "", recent: ["iphone", "tv"] })
    check(
      flatten(empty)
        .map((o) => o.kind)
        .join() === "recent,recent,clear-recent",
      "empty input shows recent searches + clear action"
    )
    check(
      buildGroups({ term: "", recent: [] }).length === 0,
      "nothing recent: no popup"
    )
    const data = {
      query: "sam",
      products: [
        {
          id: "1",
          slug: "s1",
          name: "Samsung S1",
          brand: "Samsung",
          price: 1,
          image: null,
          category: { name: "Mobiles", slug: "mobiles" },
        },
      ],
      categories: [{ id: "c", name: "Samsung Store", slug: "ss" }],
      brands: [{ name: "Samsung", count: 3 }],
      correction: null,
    }
    const g = buildGroups({ term: "sam", data, recent: [] })
    check(
      g.map((x) => x.id).join() === "products,categories,brands,search",
      "group order"
    )
    check(
      flatten(g).at(-1)?.href === "/products?search=sam",
      "the search-for row is always last"
    )
    check(
      flatten(g).find((o) => o.kind === "brand")?.href ===
        "/products?brand=Samsung",
      "brand goes to the filtered listing"
    )
    check(
      buildGroups({
        term: "samsng",
        data: {
          ...data,
          products: [],
          categories: [],
          brands: [],
          correction: "samsung",
        },
        recent: [],
      })[0]?.id === "correction",
      "did-you-mean comes first"
    )
    check(
      new Set(flatten(g).map((o) => o.id)).size === flatten(g).length,
      "option ids are unique"
    )
    console.log(
      failures === 0
        ? "23-search-helpers: ok"
        : `23-search-helpers: ${failures} failures`
    )
    if (failures) process.exit(1)
  })
})
