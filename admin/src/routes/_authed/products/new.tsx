import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

// Placeholder: the create form (and ?from=<id> duplicate) is A.3.
export const Route = createFileRoute("/_authed/products/new")({
  staticData: { crumb: "New" },
  validateSearch: z.object({ from: z.string().optional() }),
  component: () => <p>The product form arrives in A.3.</p>,
})
