import { createRouter } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { makeQueryClient } from "@/lib/query-client"
import * as auth from "@/lib/auth/session"

export function getRouter() {
  const queryClient = makeQueryClient()
  const router = createRouter({
    routeTree,
    // Router context: every beforeLoad/loader receives `queryClient` and `auth`.
    context: { queryClient, auth },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Query owns freshness (staleTime); the router should not cache loaders on top of it.
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  // Switching accounts WITHOUT signing out first (logging in as someone else, a role change picked up on
  // refresh) must not show the previous account's cached data: the cache is dropped whenever the user id
  // changes. (Query keys also start with the user id: two independent lines of defence.)
  if (typeof window !== "undefined") {
    let lastUserId = auth.getUser()?.id ?? null
    auth.subscribe(() => {
      const id = auth.getUser()?.id ?? null
      if (id !== lastUserId) {
        lastUserId = id
        queryClient.clear()
      }
    })
  }
  // A refresh that fails mid-session (revoked/expired) re-runs the guards -> redirect to /login.
  auth.setSessionLostHandler(() => {
    queryClient.clear()
    void router.invalidate()
  })
  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
