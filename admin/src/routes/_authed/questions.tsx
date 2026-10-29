import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"

import { NativeSelect } from "@/components/native-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import * as api from "@/features/moderation/api"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

const searchSchema = z.object({
  view: z
    .enum(["unanswered", "all", "hidden"])
    .default("unanswered")
    .catch("unanswered"),
})
type View = z.infer<typeof searchSchema>["view"]

export const Route = createFileRoute("/_authed/questions")({
  staticData: { crumb: "Q&A" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "moderation:manage"),
  validateSearch: searchSchema,
  component: QuestionsPage,
})

function QuestionsPage() {
  const { view } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const params = {
    limit: 10,
    status: view === "hidden" ? "hidden" : undefined,
    unanswered: view === "unanswered" ? true : undefined,
  }
  const query = useInfiniteQuery({
    queryKey: qk.moderation.questions(params),
    queryFn: ({ pageParam, signal }) =>
      api.listQuestions({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.meta.hasNext ? l.meta.page + 1 : undefined),
  })
  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: qk.moderation.all() })

  const moderate = useMutation({
    mutationFn: (v: {
      kind: "question" | "answer"
      id: string
      status: "published" | "hidden"
    }) =>
      v.kind === "question"
        ? api.moderateQuestion(v.id, v.status)
        : api.moderateAnswer(v.id, v.status),
    onError: (e) => toast.error(e.message),
    onSettled: refresh,
  })
  const answer = useMutation({
    mutationFn: (v: { id: string; text: string }) =>
      api.answerQuestion(v.id, v.text),
    onSuccess: () => toast.success("Answer posted"),
    onError: (e) => toast.error(e.message),
    onSettled: refresh,
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Questions and answers</h1>
        <label className="flex items-center gap-2 text-sm">
          Show
          <NativeSelect
            value={view}
            onChange={(e) =>
              void navigate({ search: { view: e.target.value as View } })
            }
          >
            <option value="unanswered">Unanswered</option>
            <option value="all">All</option>
            <option value="hidden">Hidden</option>
          </NativeSelect>
        </label>
      </div>
      {query.error ? <p role="alert">{query.error.message}</p> : null}
      {query.isPending ? <p aria-busy>Loading questions...</p> : null}
      {!query.isPending && items.length === 0 ? (
        <p>Nothing in this view.</p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            busy={moderate.isPending || answer.isPending}
            onModerate={(kind, id, status) =>
              moderate.mutate({ kind, id, status })
            }
            onAnswer={(text) => answer.mutate({ id: q.id, text })}
          />
        ))}
      </ul>
      {query.hasNextPage ? (
        <div>
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function QuestionCard({
  q,
  busy,
  onModerate,
  onAnswer,
}: {
  q: api.AdminQuestion
  busy: boolean
  onModerate: (
    kind: "question" | "answer",
    id: string,
    s: "published" | "hidden"
  ) => void
  onAnswer: (text: string) => void
}) {
  const [text, setText] = useState("")
  return (
    <li className="flex flex-col gap-2 rounded border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{q.text}</p>
          <p className="text-xs text-muted-foreground">
            {q.author} on {q.product.name}, {formatDateTime(q.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={q.status === "published" ? "default" : "secondary"}>
            {q.status}
          </Badge>
          <Button
            size="xs"
            variant="outline"
            disabled={busy}
            onClick={() =>
              onModerate(
                "question",
                q.id,
                q.status === "published" ? "hidden" : "published"
              )
            }
          >
            {q.status === "published" ? "Hide" : "Restore"}
          </Button>
        </div>
      </div>
      <ul className="flex flex-col gap-1 border-l pl-3">
        {q.answers.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2">
            <span>
              {a.text}{" "}
              <span className="text-xs text-muted-foreground">
                {a.author}
                {a.badge ? ` (${a.badge})` : ""}
              </span>
            </span>
            <span className="flex items-center gap-1">
              {a.status === "hidden" ? (
                <Badge variant="secondary">hidden</Badge>
              ) : null}
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  onModerate(
                    "answer",
                    a.id,
                    a.status === "published" ? "hidden" : "published"
                  )
                }
              >
                {a.status === "published" ? "Hide" : "Restore"}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim().length >= 2) {
            onAnswer(text.trim())
            setText("")
          }
        }}
      >
        <Label htmlFor={`ans-${q.id}`}>Answer as staff</Label>
        <Textarea
          id={`ans-${q.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <Button
            size="xs"
            type="submit"
            disabled={busy || text.trim().length < 2}
          >
            Post answer
          </Button>
        </div>
      </form>
    </li>
  )
}
