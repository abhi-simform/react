import { createFileRoute } from "@tanstack/react-router"

// Placeholder: the edit form is A.3.
export const Route = createFileRoute("/_authed/products/$productId")({
  staticData: { crumb: "Edit" },
  component: () => <p>The product form arrives in A.3.</p>,
})
