import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  // A.0 smoke test of the whole chain: typed api() client -> Query -> CORS -> the real API.
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ status: string; db: string }>("/health"),
  })
  return (
    <main className="p-6">
      <h1 className="text-lg font-medium">ShopSphere Admin</h1>
      <p>
        API:{" "}
        {health.isPending
          ? "checking..."
          : health.error
            ? health.error.message
            : `${health.data.status} (db ${health.data.db})`}
      </p>
    </main>
  )
}
