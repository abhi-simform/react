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
import { toApiError, type ApiError } from "@/lib/api/errors"
import { isAbortError } from "@/lib/async"

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

type Loaded = { userId: string; ids: ReadonlySet<string> }

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const userId = authStatus === "authenticated" ? (user?.id ?? null) : null

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState<{
    userId: string
    error: ApiError
  } | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const busy = useRef(new Set<string>()) // synchronous guard (see useAddresses)

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    getWishlistIds(controller.signal)
      .then((ids) => setLoaded({ userId, ids: new Set(ids) }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return
        setFailed({ userId, error: toApiError(err) })
      })
    return () => controller.abort()
  }, [userId])

  // Derived, not stored: a different (or no) user means "nothing loaded for you yet".
  const ids = loaded?.userId === userId ? loaded.ids : undefined
  const error = failed?.userId === userId ? failed.error : null
  const status: WishlistStatus = !userId
    ? "anonymous"
    : ids
      ? "ready"
      : error
        ? "error"
        : "loading"

  const toggle = useCallback(
    async (productId: string) => {
      if (!userId || !ids || busy.current.has(productId)) return
      const wasWishlisted = ids.has(productId)
      busy.current.add(productId)
      setPending((p) => new Set(p).add(productId))

      const setMember = (member: boolean) =>
        setLoaded((current) => {
          if (!current || current.userId !== userId) return current
          const next = new Set(current.ids)
          if (member) next.add(productId)
          else next.delete(productId)
          return { userId, ids: next }
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
    [userId, ids]
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
