import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query"
import { toast } from "sonner"

import type { Paginated } from "@/lib/api/envelope"
import { toApiError } from "@/lib/api/errors"
import { questionKeys } from "@/lib/queryKeys"

import { questionQueries } from "../queries"
import {
  answerQuestion,
  askQuestion,
  deleteQa,
  setUpvote,
} from "../reviews.api"
import type { Answer, Question } from "../reviews.schemas"

type QPages = InfiniteData<Paginated<Question>, number>

export function useQuestions(productId: string, sort: "helpful" | "newest") {
  const q = useInfiniteQuery({
    ...questionQueries.infinite(productId, sort),
    select: (d) => ({
      items: d.pages.flatMap((p) => p.items),
      total: d.pages.at(-1)!.meta.total,
    }),
  })
  return { query: q, items: q.data?.items ?? [], total: q.data?.total ?? 0 }
}

/** The answers beyond the preview, loaded on demand ("Show all 7 answers"). */
export function useAnswers(questionId: string, enabled: boolean) {
  return useInfiniteQuery({
    ...questionQueries.answers(questionId),
    enabled,
    select: (d) => d.pages.flatMap((p) => p.items),
  })
}

export function useAsk(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { silent: true },
    mutationFn: (text: string) => askQuestion(productId, text),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: questionKeys.forProduct(productId),
      }),
  })
}

export function useAnswer(productId: string, questionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { silent: true },
    mutationFn: (text: string) => answerQuestion(questionId, text),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: questionKeys.forProduct(productId),
        }),
        queryClient.invalidateQueries({
          queryKey: questionKeys.answers(questionId),
        }),
      ]),
  })
}

export function useDeleteQa() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { silent: true },
    mutationFn: ({ kind, id }: { kind: "question" | "answer"; id: string }) =>
      deleteQa(kind, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: questionKeys.all }),
    onError: () => toast.error("We could not delete that. Please try again."),
  })
}

/** Optimistic upvote for a question or an answer inside the cached question lists. */
export function useUpvote(productId: string) {
  const queryClient = useQueryClient()
  const key = questionKeys.forProduct(productId)
  const patch = (
    kind: "question" | "answer",
    id: string,
    change: (x: { upvotes: number; myVote: boolean }) => {
      upvotes: number
      myVote: boolean
    }
  ) => {
    queryClient.setQueriesData<QPages>(
      { queryKey: key },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.map((q) =>
              kind === "question" && q.id === id
                ? { ...q, ...change(q) }
                : {
                    ...q,
                    answers: q.answers.map((a) =>
                      kind === "answer" && a.id === id
                        ? { ...a, ...change(a) }
                        : a
                    ),
                  }
            ),
          })),
        }
    )
    if (kind === "answer")
      queryClient.setQueriesData<InfiniteData<Paginated<Answer>, number>>(
        { queryKey: questionKeys.all },
        (data) =>
          data &&
          "pages" in data &&
          data.pages[0]?.items[0] &&
          "questionId" in data.pages[0].items[0]
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  items: p.items.map((a) =>
                    a.id === id ? { ...a, ...change(a) } : a
                  ),
                })),
              }
            : data
      )
  }
  return useMutation({
    meta: { silent: true },
    mutationFn: ({
      kind,
      id,
      on,
    }: {
      kind: "question" | "answer"
      id: string
      on: boolean
    }) => setUpvote(kind, id, on),
    onMutate: ({ kind, id, on }) => {
      patch(kind, id, (x) => ({
        myVote: on,
        upvotes: Math.max(0, x.upvotes + (on === x.myVote ? 0 : on ? 1 : -1)),
      }))
      return { kind, id, on }
    },
    onError: (err, vars) => {
      patch(vars.kind, vars.id, (x) => ({
        myVote: !vars.on,
        upvotes: Math.max(0, x.upvotes + (vars.on ? -1 : 1)),
      }))
      toast.error(
        toApiError(err).code === "OWN_CONTENT"
          ? "You cannot upvote your own post."
          : "We could not save your vote."
      )
    },
    onSuccess: (r, { kind, id }) =>
      patch(kind, id, () => ({ upvotes: r.upvotes, myVote: r.myVote })),
  })
}
