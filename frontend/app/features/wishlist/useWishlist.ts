import {
  MutationObserver,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { undoableToast } from "@/features/toast"
import type { Paginated } from "@/lib/api/envelope"
import { toApiError, type ApiError } from "@/lib/api/errors"
import { wishlistKeys } from "@/lib/queryKeys"

import { addToWishlist, removeFromWishlist } from "./api"
import { wishlistQueries } from "./queries"
import type { WishlistProduct } from "./schemas"

type SetMembership = { productId: string; member: boolean; name?: string }
type Lists = [readonly unknown[], Paginated<WishlistProduct> | undefined][]

/**
 * The CACHE-BASED optimistic update (9.5), in the order Query runs it:
 * 1. `onMutate` (before the request): `cancelQueries` so an in-flight refetch of the ids cannot
 *    land AFTER our optimistic write and overwrite it with the old server answer; snapshot what
 *    we are about to change; write the new value with `setQueryData` (a NEW array, never an
 *    in-place push); return the snapshot as the mutation's `context`.
 * 2. the request runs (`mutationFn`).
 * 3. `onError(err, vars, context)`: undo exactly THIS product's change (the inverse write, not a
 *    whole-list snapshot restore, which would also revert other hearts toggled meanwhile) and
 *    restore the open lists; one error toast.
 * 4. `onSettled` (success OR failure): invalidate the family so the client re-syncs with the
 *    server; without it a rule the client does not know (e.g. an archived product) could leave
 *    the cache drifting.
 * The wishlist ids feed every heart and the header count; the open /wishlist list (a second
 * query over the same data) is patched too, so all of them move together.
 */
function setMembershipOptions(queryClient: QueryClient) {
  const patchIds = (productId: string, member: boolean) =>
    queryClient.setQueryData<string[]>(wishlistKeys.ids(), (old = []) =>
      member
        ? [productId, ...old.filter((id) => id !== productId)]
        : old.filter((id) => id !== productId)
    )
  return {
    mutationKey: [...wishlistKeys.all, "membership"] as const,
    // Hearts toast their own failure (with the product name), so the global handler stays out.
    meta: { silent: true },
    mutationFn: ({ productId, member }: SetMembership) =>
      member ? addToWishlist(productId) : removeFromWishlist(productId),
    onMutate: async ({ productId, member }: SetMembership) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all })
      const lists: Lists = queryClient.getQueriesData<
        Paginated<WishlistProduct>
      >({ queryKey: wishlistKeys.lists() })
      patchIds(productId, member)
      if (!member)
        queryClient.setQueriesData<Paginated<WishlistProduct>>(
          { queryKey: wishlistKeys.lists() },
          (old) =>
            old && {
              ...old,
              items: old.items.filter((p) => p._id !== productId),
            }
        )
      return { lists }
    },
    onError: (
      error: Error,
      { productId, member }: SetMembership,
      context: { lists: Lists } | undefined
    ) => {
      patchIds(productId, !member)
      for (const [key, data] of context?.lists ?? [])
        queryClient.setQueryData(key, data)
      toast.error(
        member
          ? "Could not save it to your wishlist"
          : "Could not remove it from your wishlist",
        { description: toApiError(error).message }
      )
    },
    onSuccess: (_data: unknown, { productId, member, name }: SetMembership) => {
      if (!member)
        // No confirm dialog for a reversible action (8.5): Undo re-adds through the same mutation.
        undoableToast(
          `Removed ${name ?? "the product"} from your wishlist`,
          () =>
            void new MutationObserver(
              queryClient,
              setMembershipOptions(queryClient)
            ).mutate({ productId, member: true, name })
        )
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  }
}

export type WishlistStatus = "anonymous" | "loading" | "ready" | "error"

/**
 * Every heart, the header count and /wishlist read the SAME query cache entries
 * (`wishlistKeys.ids()`); the old `WishlistContext` is gone. Concurrency rule (kept from 8.x):
 * while a product has a request in flight, more toggles for THAT product are ignored (the
 * heart shows `aria-busy`), so a rollback only ever undoes ONE change. Other products stay
 * togglable. `useMutationState` reads the in-flight mutations' `variables` for that.
 */
export function useWishlist() {
  const { status: authStatus } = useAuth()
  const queryClient = useQueryClient()
  const enabled = authStatus === "authenticated"
  const ids = useQuery({
    ...wishlistQueries.ids(),
    enabled,
    select: (list) => new Set(list),
  })
  const mutation = useMutation(setMembershipOptions(queryClient))
  const pendingIds = useMutationState({
    filters: { mutationKey: [...wishlistKeys.all, "membership"], status: "pending" },
    select: (m) => (m.state.variables as SetMembership).productId,
  })

  const status: WishlistStatus = !enabled
    ? "anonymous"
    : ids.status === "success"
      ? "ready"
      : ids.status === "error"
        ? "error"
        : "loading"
  const error: ApiError | null =
    ids.status === "error" ? toApiError(ids.error) : null

  const isWishlisted = (id: string) => ids.data?.has(id) ?? false
  const isPending = (id: string) => pendingIds.includes(id)

  return {
    status,
    error,
    count: ids.data?.size ?? 0,
    isWishlisted,
    isPending,
    toggle: (productId: string, productName?: string) => {
      if (!enabled || !ids.data || isPending(productId)) return
      mutation.mutate({
        productId,
        member: !isWishlisted(productId),
        name: productName,
      })
    },
  }
}
