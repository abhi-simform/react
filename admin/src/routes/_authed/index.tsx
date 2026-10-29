import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/")({
  staticData: { crumb: "Dashboard" },
  component: () => (
    <section>
      <h1 className="text-lg font-medium">Dashboard</h1>
      <p className="text-muted-foreground">
        Screens arrive topic by topic (A.2 tables, A.3 catalog, A.6 charts).
      </p>
    </section>
  ),
})
