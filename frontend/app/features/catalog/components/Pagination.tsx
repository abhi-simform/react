import { Button } from "@/components/ui/button"

/** 1 ... 4 [5] 6 ... 20: first, last and a window around the current page. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const wanted = new Set(
    [1, page - 1, page, page + 1, totalPages].filter(
      (p) => p >= 1 && p <= totalPages
    )
  )
  const sorted = [...wanted].toSorted((a, b) => a - b)
  return sorted.flatMap((p, i) => {
    const previous = sorted[i - 1]
    return previous !== undefined && p - previous > 1
      ? ["gap" as const, p]
      : [p]
  })
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center gap-1"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden>
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  )
}
