import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api/errors"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry only what might heal itself; a 4xx is the server's final answer.
        retry: (count, err) =>
          !(err instanceof ApiError && err.status >= 400 && err.status < 500) &&
          count < 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}
