import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"

export function makeTestClient() {
  // No retries and no cache between tests: a failing request must fail the test at once.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/** Components that only need Query. */
export function renderWithQuery(ui: ReactNode) {
  const queryClient = makeTestClient()
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  }
}

/**
 * Components that use the router (`useNavigate`, `useBlocker`, `Link`): a REAL router over a memory
 * history, with the component at `/` and a couple of extra routes to navigate to.
 */
export async function renderWithRouter(
  ui: ReactNode,
  opts: { path?: string } = {}
) {
  const queryClient = makeTestClient()
  const root = createRootRoute({ component: () => <Outlet /> })
  const index = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <>{ui}</>,
  })
  const elsewhere = createRoute({
    getParentRoute: () => root,
    path: "/elsewhere",
    component: () => <p>Elsewhere</p>,
  })
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/products/$productId",
    component: () => <p>Product page</p>,
  })
  const router = createRouter({
    routeTree: root.addChildren([index, elsewhere, detail]),
    history: createMemoryHistory({ initialEntries: [opts.path ?? "/"] }),
  })
  await router.load()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { router, queryClient, ...utils }
}
