import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { undoableToast } from "@/features/toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toApiError, type ApiError } from "@/lib/api/errors"

import { wishlistKeys } from "@/lib/queryKeys"

import { addToWishlist, removeFromWishlist } from "./api"
import { wishlistQueries } from "./queries"

/**
 * The shared source for every heart (card, PDP, header count, /wishlist page).
 * TEMPORARY hand-rolled store (Stage 9 replaces it with TanStack Query). Decisions:
 * - The ids are loaded ONCE per signed-in user; every consumer reads the same Set,
 *   so toggling anywhere updates everywhere with no refetch.
 * - Toggle is OPTIMISTIC: the Set changes first, the request follows, a failure puts
 *   that one id back and shows a toast.
 * - Concurrency rule: while a product has a request in flight, further toggles for
 *   THAT product are ignored (hearts show aria-busy). Why not queue or last-write-wins:
 *   with idempotent POST/DELETE both would work, but "ignore" means the client never
 *   has two opposite requests racing, so the server order can never differ from the UI,
 *   and a rollback only ever has to undo ONE change. Other products stay togglable.
 */
export type WishlistStatus = "anonymous" | "loading" | "ready" | "error"

type WishlistValue = {
  status: WishlistStatus
  error: ApiError | null
  count: number
  isWishlisted: (productId: string) => boolean
  isPending: (productId: string) => boolean
  toggle: (productId: string, productName?: string) => Promise<void>
}

const WishlistContext = createContext<WishlistValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const userId = authStatus === "authenticated" ? (user?.id ?? null) : null

  // The READ part is the generic `useFetch` (6.8). Its dependency is the user id: a
  // different user is a different request, so the previous user's hearts are never shown.
  const queryClient = useQueryClient()
  const fetched = useQuery({
    ...wishlistQueries.ids(),
    select: (list) => new Set(list),
    enabled: userId !== null,
  })
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const busy = useRef(new Set<string>()) // synchronous guard (see useAddresses)

  const ids = fetched.status === "success" ? fetched.data : undefined
  const error = fetched.status === "error" ? toApiError(fetched.error) : null
  const status: WishlistStatus = !userId
    ? "anonymous"
    : fetched.status === "success"
      ? "ready"
      : fetched.status === "error"
        ? "error"
        : "loading"
  const setIds = (update: (previous: Set<string>) => Set<string>) =>
    queryClient.setQueryData<string[]>(wishlistKeys.ids(), (list = []) => [
      ...update(new Set(list)),
    ])

  // Undo needs to call `setMembership` again, which it cannot reference while defining it:
  // the latest version is kept in a ref (written in an effect, read in the toast's click).
  const reAdd = useRef<(id: string, name?: string) => void>(() => {})

  /**
   * Set ONE product's membership (optimistic, with rollback). `toggle` and the Undo action
   * both go through here, so Undo is just "set it back" with the same concurrency guard.
   */
  const setMembership = useCallback(
    async (productId: string, member: boolean, productName?: string) => {
      if (!userId || !ids || busy.current.has(productId)) return
      if (ids.has(productId) === member) return
      busy.current.add(productId)
      setPending((p) => new Set(p).add(productId))

      const apply = (value: boolean) =>
        setIds((current) => {
          const next = new Set(current)
          if (value) next.add(productId)
          else next.delete(productId)
          return next
        })

      apply(member) // optimistic
      try {
        await (member
          ? addToWishlist(productId)
          : removeFromWishlist(productId))
        if (!member) {
          // Removed: no confirm dialog, an Undo toast instead (8.5). Undo re-adds it.
          undoableToast(
            `Removed ${productName ?? "the product"} from your wishlist`,
            () => reAdd.current(productId, productName)
          )
        }
      } catch (err) {
        apply(!member) // roll back exactly this id
        toast.error(
          member
            ? "Could not save it to your wishlist"
            : "Could not remove it from your wishlist",
          { description: toApiError(err).message }
        )
      } finally {
        busy.current.delete(productId)
        setPending((p) => {
          const next = new Set(p)
          next.delete(productId)
          return next
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setIds only uses the stable queryClient
    [userId, ids]
  )

  useEffect(() => {
    reAdd.current = (id, name) => void setMembership(id, true, name)
  })

  const toggle = useCallback(
    (productId: string, productName?: string) =>
      setMembership(productId, !(ids?.has(productId) ?? false), productName),
    [setMembership, ids]
  )

  const value = useMemo<WishlistValue>(
    () => ({
      status,
      error,
      count: ids?.size ?? 0,
      isWishlisted: (id) => ids?.has(id) ?? false,
      isPending: (id) => pending.has(id),
      toggle,
    }),
    [status, error, ids, pending, toggle]
  )
  return <WishlistContext value={value}>{children}</WishlistContext>
}

export function useWishlist(): WishlistValue {
  const value = useContext(WishlistContext)
  if (!value)
    throw new Error("useWishlist must be used inside <WishlistProvider>")
  return value
}
