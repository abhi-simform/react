import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { useAuth } from "@/features/auth"
import { useFetch } from "@/hooks/useFetch"
import { toApiError, type ApiError } from "@/lib/api/errors"

import { addToWishlist, getWishlistIds, removeFromWishlist } from "./api"

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
  toggle: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const userId = authStatus === "authenticated" ? (user?.id ?? null) : null

  // The READ part is the generic `useFetch` (6.8). Its dependency is the user id: a
  // different user is a different request, so the previous user's hearts are never shown.
  const fetched = useFetch(
    async (signal) => new Set(await getWishlistIds(signal)),
    [userId],
    { enabled: userId !== null }
  )
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const busy = useRef(new Set<string>()) // synchronous guard (see useAddresses)

  const ids = fetched.status === "success" ? fetched.data : undefined
  const error = fetched.status === "error" ? fetched.error : null
  const status: WishlistStatus = !userId
    ? "anonymous"
    : fetched.status === "success"
      ? "ready"
      : fetched.status === "error"
        ? "error"
        : "loading"
  const setIds = fetched.setData

  const toggle = useCallback(
    async (productId: string) => {
      if (!userId || !ids || busy.current.has(productId)) return
      const wasWishlisted = ids.has(productId)
      busy.current.add(productId)
      setPending((p) => new Set(p).add(productId))

      const setMember = (member: boolean) =>
        setIds((current) => {
          const next = new Set(current)
          if (member) next.add(productId)
          else next.delete(productId)
          return next
        })

      setMember(!wasWishlisted) // optimistic
      try {
        await (wasWishlisted
          ? removeFromWishlist(productId)
          : addToWishlist(productId))
      } catch (err) {
        setMember(wasWishlisted) // roll back exactly this id
        toast.error(
          wasWishlisted
            ? "Could not remove it from your wishlist"
            : "Could not save it to your wishlist",
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
    [userId, ids, setIds]
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
