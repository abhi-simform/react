import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { ResponsiveImage } from "@/components/common/ResponsiveImage"
import { formatRupees } from "@/lib/format"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { paths } from "@/lib/paths"

import { readCachedProducts } from "./cachedProducts"

/**
 * `/offline` (13.10): what the shopper can still do without a connection: browse the products they have
 * already opened (read from the service worker's cache), and a clear statement of what needs a network.
 */
export function OfflinePage() {
  const online = useOnlineStatus()
  const cached = useQuery({
    queryKey: ["offline", "cached-products"],
    queryFn: () => readCachedProducts(),
    // The cache is local: never "stale in the background", re-read on mount.
    staleTime: 0,
    gcTime: 0,
  })
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-medium">
        {online ? "You are back online" : "You are offline"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {online
          ? "The connection is back. Everything works again."
          : "Your cart, checkout, orders and account need a connection and will work again when you are back online. Products you have already opened are still here."}
      </p>
      {online && (
        <Link className="underline" to={paths.home()}>
          Continue shopping
        </Link>
      )}
      <section aria-labelledby="offline-viewed">
        <h2 id="offline-viewed" className="mb-2 font-medium">
          Recently viewed on this device
        </h2>
        {cached.isPending ? (
          <p role="status" className="text-sm">
            Looking in the offline cache...
          </p>
        ) : cached.data && cached.data.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cached.data.map((p) => (
              <li key={p.slug} className="rounded border p-2 text-sm">
                {p.image && (
                  <div className="mb-1 aspect-square overflow-hidden rounded bg-muted">
                    <ResponsiveImage
                      src={p.image}
                      alt=""
                      widths={[200, 300]}
                      sizes="(min-width: 640px) 200px, 45vw"
                      ratio={1}
                    />
                  </div>
                )}
                <Link
                  className="line-clamp-2 underline"
                  to={paths.product(p.slug)}
                >
                  {p.name}
                </Link>
                <p className="font-medium">{formatRupees(p.price)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Products you open while online appear here.
          </p>
        )}
      </section>
    </div>
  )
}
