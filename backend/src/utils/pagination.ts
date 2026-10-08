import type { PageMeta } from "./response.js"

export function pageMeta(page: number, limit: number, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
}
