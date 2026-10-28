import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, type RenderResult } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactElement } from "react"
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  type RouteObject,
} from "react-router"

import { AuthProvider, SessionCacheSync } from "@/features/auth"
import { CartSessionSync } from "@/features/cart"
import { WishlistSessionSync } from "@/features/wishlist"
import { appRoutes } from "./appRoutes"
import { ThemeProvider } from "@/features/theme"
import { ToastProvider } from "@/features/toast"

/** A fresh client per test: no cache leaks between tests, and no retries (a 500 fails fast). */
export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

type Options = {
  /** Initial URL, e.g. "/products?brand=Apple". */
  route?: string
  /** The route pattern `ui` is mounted at (default: matches everything). */
  path?: string
  /** Extra routes (e.g. "/login") so navigation lands somewhere that can be asserted. */
  routes?: RouteObject[]
  /** Start with a restorable session (the refresh call succeeds). */
  signedIn?: boolean
  queryClient?: QueryClient
}

export type RenderedApp = RenderResult & {
  user: ReturnType<typeof userEvent.setup>
  queryClient: QueryClient
  /** Read the router's location from a test: `app.location().pathname`. */
  location: () => { pathname: string; search: string }
}

/**
 * The providers the real app has (root.tsx), around a routed `ui`. Auth is real: `signedIn`
 * stores the same hint the app does, so the bootstrap calls the (mocked) /auth/refresh.
 */
export async function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    path = "*",
    routes = [],
    signedIn = false,
    queryClient,
  }: Options = {}
): Promise<RenderedApp> {
  const client = queryClient ?? makeTestQueryClient()
  if (signedIn) localStorage.setItem("shopsphere.hasSession", "true")

  const router = createMemoryRouter(
    [
      {
        path,
        element: (
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>{ui}</ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        ),
      },
      ...routes,
    ],
    { initialEntries: [route] }
  )
  // `act` lets the auth bootstrap (a promise) settle before the test starts: no act() warnings.
  let result!: RenderResult
  await act(async () => {
    result = render(<RouterProvider router={router} />)
  })
  return {
    ...result,
    user: userEvent.setup(),
    queryClient: client,
    location: () => ({
      pathname: router.state.location.pathname,
      search: router.state.location.search,
    }),
  }
}

/**
 * A whole routed app (12.5): the real shell, guards and pages, with the same providers and
 * session sync components as `root.tsx` (minus the socket and devtools). Walk it like a user.
 */
export async function renderApp({
  route = "/",
  signedIn = false,
  queryClient,
}: Pick<
  Options,
  "route" | "signedIn" | "queryClient"
> = {}): Promise<RenderedApp> {
  const client = queryClient ?? makeTestQueryClient()
  if (signedIn) localStorage.setItem("shopsphere.hasSession", "true")
  const router = createMemoryRouter(
    [
      {
        element: (
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <AuthProvider>
                <SessionCacheSync />
                <CartSessionSync />
                <WishlistSessionSync />
                <ToastProvider>
                  <Outlet />
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        ),
        children: appRoutes,
      },
    ],
    { initialEntries: [route] }
  )
  let result!: RenderResult
  await act(async () => {
    result = render(<RouterProvider router={router} />)
  })
  return {
    ...result,
    user: userEvent.setup(),
    queryClient: client,
    location: () => ({
      pathname: router.state.location.pathname,
      search: router.state.location.search,
    }),
  }
}
