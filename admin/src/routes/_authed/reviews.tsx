import { useEffect, useRef, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/native-select"
import * as api from "@/features/moderation/api"
import { useQueueHotkeys } from "@/hooks/useQueueHotkeys"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import type { Paginated } from "@/lib/api/client"
import { qk } from "@/lib/queryKeys"

const searchSchema = z.object({
  view: z
    .enum(["reported", "published", "hidden", "all"])
    .default("reported")
    .catch("reported"),
})
type View = z.infer<typeof searchSchema>["view"]
const LIMIT = 20

const paramsOf = (view: View): api.ReviewParams => ({
  limit: LIMIT,
  status: view === "published" || view === "hidden" ? view : undefined,
  reported: view === "reported" ? true : undefined,
})

export const Route = createFileRoute("/_authed/reviews")({
  staticData: { crumb: "Reviews" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "moderation:manage"),
  validateSearch: searchSchema,
  component: ReviewsPage,
})

type Cache = InfiniteData<Paginated<api.AdminReview>, number>

function ReviewsPage() {
  const { view } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const params = paramsOf(view)
  const key = qk.moderation.reviews(params)
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) =>
      api.listReviews({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.hasNext ? last.meta.page + 1 : undefined,
  })
  const reviews = query.data?.pages.flatMap((p) => p.items) ?? []

  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const current = reviews.at(Math.min(cursor, reviews.length - 1))

  useEffect(() => {
    setCursor(0)
    setSelected(new Set())
  }, [view])
  useEffect(() => {
    if (current)
      rowRefs.current[current.id]?.scrollIntoView({ block: "nearest" })
  }, [current?.id])

  // Optimistic: the row's status flips at once and rolls back if the API refuses.
  const moderate = useMutation({
    mutationFn: (v: { id: string; status: "published" | "hidden" }) =>
      api.moderateReview(
        v.id,
        v.status,
        v.status === "hidden" ? "Hidden by a moderator" : undefined
      ),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<Cache>(key)
      queryClient.setQueryData<Cache>(
        key,
        (d) =>
          d && {
            ...d,
            pages: d.pages.map((p) => ({
              ...p,
              items: p.items.map((r) =>
                r.id === v.id ? { ...r, status: v.status } : r
              ),
            })),
          }
      )
      return { before }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) queryClient.setQueryData(key, ctx.before)
      toast.error(`Could not moderate: ${e.message}`)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.moderation.all() }),
  })

  const act = (id: string, status: "published" | "hidden") =>
    moderate.mutate({ id, status })
  const bulk = (status: "published" | "hidden") => {
    for (const id of selected) act(id, status)
    toast.success(
      `${selected.size} review(s) ${status === "published" ? "approved" : "hidden"}`
    )
    setSelected(new Set())
  }

  // Keyboard-only moderation: j/k move, a approve (publish), r reject (hide), x select, Shift+A/R bulk.
  useQueueHotkeys({
    j: () => setCursor((c) => Math.min(c + 1, Math.max(0, reviews.length - 1))),
    k: () => setCursor((c) => Math.max(0, c - 1)),
    a: () => current && act(current.id, "published"),
    r: () => current && act(current.id, "hidden"),
    x: () =>
      current &&
      setSelected((s) => {
        const n = new Set(s)
        if (n.has(current.id)) n.delete(current.id)
        else n.add(current.id)
        return n
      }),
    n: () => query.hasNextPage && void query.fetchNextPage(),
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Review moderation</h1>
        <label className="flex items-center gap-2 text-sm">
          Show
          <NativeSelect
            value={view}
            onChange={(e) =>
              void navigate({ search: { view: e.target.value as View } })
            }
          >
            <option value="reported">Reported</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
            <option value="all">All</option>
          </NativeSelect>
        </label>
      </div>
      <p className="text-sm text-muted-foreground" id="hotkeys">
        Keyboard: <kbd>j</kbd>/<kbd>k</kbd> next/previous, <kbd>a</kbd> approve
        (publish), <kbd>r</kbd> reject (hide), <kbd>x</kbd> select for bulk,{" "}
        <kbd>n</kbd> load more.
      </p>

      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex items-center gap-2 rounded border bg-muted px-3 py-2 text-sm"
        >
          {selected.size} selected
          <Button size="xs" onClick={() => bulk("published")}>
            Approve selected
          </Button>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => bulk("hidden")}
          >
            Hide selected
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      ) : null}

      {query.error ? (
        <div role="alert">
          {query.error.message}{" "}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {query.isPending ? <p aria-busy>Loading reviews...</p> : null}
      {!query.isPending && reviews.length === 0 ? (
        <p>Nothing in this view.</p>
      ) : null}

      <ul
        aria-label="Reviews"
        aria-describedby="hotkeys"
        className="flex flex-col gap-2"
      >
        {reviews.map((r, i) => (
          <li
            key={r.id}
            ref={(el) => void (rowRefs.current[r.id] = el)}
            aria-current={i === cursor ? "true" : undefined}
            className={`flex gap-3 rounded border p-3 ${i === cursor ? "ring-2 ring-ring" : ""}`}
          >
            <Checkbox
              aria-label={`Select review by ${r.author}`}
              checked={selected.has(r.id)}
              onCheckedChange={(v) =>
                setSelected((s) => {
                  const n = new Set(s)
                  if (v) n.add(r.id)
                  else n.delete(r.id)
                  return n
                })
              }
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <p>
                <strong>{r.rating}/5</strong> {r.title ? `"${r.title}"` : ""} by{" "}
                {r.author}
                {r.verifiedPurchase ? " (verified buyer)" : ""} on{" "}
                {r.product.name}
              </p>
              <p>{r.body}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(r.createdAt)}
                {r.reportCount > 0 ? `, reported ${r.reportCount}x` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={r.status === "published" ? "default" : "secondary"}
              >
                {r.status}
              </Badge>
              <div className="flex gap-1">
                <Button
                  size="xs"
                  disabled={r.status === "published"}
                  onClick={() => act(r.id, "published")}
                >
                  Approve
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={r.status === "hidden"}
                  onClick={() => act(r.id, "hidden")}
                >
                  Reject
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <div>
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
