import { zodResolver } from "@hookform/resolvers/zod"
import { ThumbsUp } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorState } from "@/components/common/ErrorState"
import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth"
import { toApiError } from "@/lib/api/errors"
import { formatRelative } from "@/lib/format"
import { paths } from "@/lib/paths"

import {
  useAnswer,
  useAnswers,
  useAsk,
  useDeleteQa,
  useQuestions,
  useUpvote,
} from "../hooks/useQa"
import {
  answerFormSchema,
  questionFormSchema,
  type Answer,
  type Question,
} from "../reviews.schemas"

/** Product Q&A (11.6): ask, answer, upvote, seller badge, delete your own. Plain text only. */
export function QaSection({ productId }: { productId: string }) {
  const [sort, setSort] = useState<"helpful" | "newest">("helpful")
  const { query: q, items, total } = useQuestions(productId, sort)
  const { status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const upvote = useUpvote(productId)
  const toLogin = () =>
    void navigate(paths.login(location.pathname + location.search))
  const guard = (fn: () => void) => () =>
    status === "authenticated" ? fn() : toLogin()

  return (
    <div className="text-sm">
      <AskForm
        productId={productId}
        onLogin={toLogin}
        authed={status === "authenticated"}
      />
      <label className="my-2 flex items-center gap-1">
        Sort
        <select
          className="rounded border p-1"
          value={sort}
          onChange={(e) => setSort(e.target.value as "helpful" | "newest")}
        >
          <option value="helpful">Most helpful</option>
          <option value="newest">Newest</option>
        </select>
      </label>
      <div className="min-h-32">
        {q.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : q.isError && !q.data ? (
          <ErrorState
            error={toApiError(q.error)}
            onRetry={() => void q.refetch()}
          />
        ) : items.length === 0 ? (
          <p role="status">No questions yet. Ask the first one.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              {total} question{total === 1 ? "" : "s"}
            </p>
            <ul className="flex flex-col gap-4">
              {items.map((qn) => (
                <QuestionItem
                  key={qn.id}
                  question={qn}
                  productId={productId}
                  authed={status === "authenticated"}
                  onUpvote={(kind, id, on) =>
                    guard(() => upvote.mutate({ kind, id, on }))()
                  }
                />
              ))}
            </ul>
            {q.hasNextPage && (
              <Button
                variant="outline"
                className="mt-3"
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Loading..." : "Load more questions"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AskForm({
  productId,
  authed,
  onLogin,
}: {
  productId: string
  authed: boolean
  onLogin: () => void
}) {
  const ask = useAsk(productId)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<{ text: string }>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: { text: "" },
  })
  if (!authed)
    return (
      <Button variant="outline" onClick={onLogin}>
        Log in to ask a question
      </Button>
    )
  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={handleSubmit(async (v) => {
        try {
          await ask.mutateAsync(v.text)
          reset()
          toast.success("Question posted")
        } catch (err) {
          const e = toApiError(err)
          setError("text", {
            message: e.isValidation
              ? (e.fieldErrors.text ?? "Invalid question")
              : "We could not post your question. Try again.",
          })
        }
      })}
    >
      <FormField label="Ask a question" error={errors.text?.message}>
        {(c) => (
          <textarea
            rows={2}
            className="rounded border p-1"
            {...c}
            {...register("text")}
          />
        )}
      </FormField>
      <Button type="submit" className="self-start" disabled={ask.isPending}>
        {ask.isPending ? "Posting..." : "Post question"}
      </Button>
    </form>
  )
}

function Badge({ a }: { a: Answer }) {
  return (
    <>
      {a.badge && (
        <span className="ml-1 rounded bg-sky-100 px-1 py-0.5 text-xs text-sky-900">
          {a.badge === "seller" ? "Seller" : "ShopSphere"}
        </span>
      )}
      {a.verifiedBuyer && (
        <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-xs text-emerald-900">
          Verified buyer
        </span>
      )}
    </>
  )
}

function QuestionItem({
  question: qn,
  productId,
  authed,
  onUpvote,
}: {
  question: Question
  productId: string
  authed: boolean
  onUpvote: (kind: "question" | "answer", id: string, on: boolean) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [answering, setAnswering] = useState(false)
  const all = useAnswers(qn.id, showAll)
  const del = useDeleteQa()
  const answers = showAll && all.data ? all.data : qn.answers
  const hidden = qn.answerCount - qn.answers.length
  return (
    <li>
      <p className="font-medium">Q: {qn.text}</p>
      <p className="text-xs text-muted-foreground">
        {qn.author}, {formatRelative(qn.createdAt)}
      </p>
      <div className="my-1 flex flex-wrap gap-2">
        {!qn.isMine && (
          <Button
            variant="outline"
            size="xs"
            aria-pressed={qn.myVote}
            onClick={() => onUpvote("question", qn.id, !qn.myVote)}
          >
            <ThumbsUp
              aria-hidden
              className={qn.myVote ? "fill-current" : undefined}
            />
            Helpful ({qn.upvotes})
          </Button>
        )}
        {authed && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setAnswering((a) => !a)}
          >
            Answer
          </Button>
        )}
        {qn.isMine && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => del.mutate({ kind: "question", id: qn.id })}
          >
            Delete
          </Button>
        )}
      </div>
      {answers.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not answered yet.</p>
      ) : (
        <ul className="ml-3 flex flex-col gap-2 border-l pl-3">
          {answers.map((a) => (
            <li key={a.id}>
              <p>A: {a.text}</p>
              <p className="text-xs text-muted-foreground">
                {a.author}
                <Badge a={a} />, {formatRelative(a.createdAt)}
              </p>
              <div className="flex gap-2">
                {!a.isMine && (
                  <Button
                    variant="outline"
                    size="xs"
                    aria-pressed={a.myVote}
                    onClick={() => onUpvote("answer", a.id, !a.myVote)}
                  >
                    <ThumbsUp
                      aria-hidden
                      className={a.myVote ? "fill-current" : undefined}
                    />
                    Helpful ({a.upvotes})
                  </Button>
                )}
                {a.isMine && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => del.mutate({ kind: "answer", id: a.id })}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!showAll && hidden > 0 && (
        <Button variant="link" size="xs" onClick={() => setShowAll(true)}>
          Show all {qn.answerCount} answers
        </Button>
      )}
      {showAll && all.hasNextPage && (
        <Button
          variant="link"
          size="xs"
          disabled={all.isFetchingNextPage}
          onClick={() => void all.fetchNextPage()}
        >
          Load more answers
        </Button>
      )}
      {answering && (
        <AnswerForm
          productId={productId}
          questionId={qn.id}
          onDone={() => setAnswering(false)}
        />
      )}
    </li>
  )
}

function AnswerForm({
  productId,
  questionId,
  onDone,
}: {
  productId: string
  questionId: string
  onDone: () => void
}) {
  const answer = useAnswer(productId, questionId)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ text: string }>({
    resolver: zodResolver(answerFormSchema),
    defaultValues: { text: "" },
  })
  return (
    <form
      noValidate
      className="mt-1 ml-3 flex flex-col gap-1"
      onSubmit={handleSubmit(async (v) => {
        try {
          await answer.mutateAsync(v.text)
          toast.success("Answer posted")
          onDone()
        } catch {
          setError("text", {
            message: "We could not post your answer. Try again.",
          })
        }
      })}
    >
      <FormField label="Your answer" error={errors.text?.message}>
        {(c) => (
          <textarea
            rows={2}
            className="rounded border p-1"
            {...c}
            {...register("text")}
          />
        )}
      </FormField>
      <Button
        type="submit"
        size="sm"
        className="self-start"
        disabled={answer.isPending}
      >
        Post answer
      </Button>
    </form>
  )
}
