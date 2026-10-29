import { createRouter } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { makeQueryClient } from "@/lib/query-client"

export function getRouter() {
  const queryClient = makeQueryClient()
  return createRouter({
    routeTree,
    // Router context: every beforeLoad/loader receives `queryClient` (the auth session joins it in A.1).
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Query owns freshness (staleTime); the router should not cache loaders on top of it.
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
