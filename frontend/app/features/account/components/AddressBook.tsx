import { useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { assertNever } from "@/lib/assert"

import { NEW_ROW, useAddresses } from "../hooks/useAddresses"
import type { Address, AddressInput } from "../schemas"
import { AddressCard } from "./AddressCard"
import { AddressFormDialog } from "./AddressFormDialog"

/** /account/addresses (6.3): list, add, edit, delete with confirm, set default. */
export function AddressBook() {
  const book = useAddresses()
  // `undefined` closed, "new" create dialog, an Address = edit that one.
  const [target, setTarget] = useState<Address | "new">()

  async function save(input: AddressInput, existing: Address | undefined) {
    const error = existing
      ? await book.update(existing.id, input)
      : await book.create(input)
    if (!error) toast.success(existing ? "Address updated" : "Address added")
    return error
  }

  async function removeRow(id: string) {
    const error = await book.remove(id)
    if (!error) toast.success("Address deleted")
  }

  const state = book.state
  let content: React.ReactNode
  switch (state.status) {
    case "idle":
    case "loading":
      content = <p aria-busy="true">Loading addresses...</p>
      break
    case "error":
      content = <ErrorState error={state.error} onRetry={book.reload} />
      break
    case "success":
      content =
        state.data.length === 0 ? (
          <EmptyState title="No saved addresses yet">
            <Button onClick={() => setTarget("new")}>
              Add your first address
            </Button>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {state.data.map((a) => (
              <li key={a.id}>
                <AddressCard
                  address={a}
                  pendingOp={book.pending[a.id]}
                  error={book.rowErrors[a.id]}
                  onEdit={setTarget}
                  onSetDefault={(id) => void book.setDefault(id)}
                  onRemove={(id) => void removeRow(id)}
                />
              </li>
            ))}
          </ul>
        )
      break
    default:
      content = assertNever(state)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Addresses</h1>
        <Button onClick={() => setTarget("new")}>Add address</Button>
      </div>
      {content}
      <AddressFormDialog
        target={target}
        pending={
          target === "new"
            ? book.pending[NEW_ROW] !== undefined
            : target
              ? book.pending[target.id] !== undefined
              : false
        }
        onClose={() => setTarget(undefined)}
        onSubmit={save}
      />
    </div>
  )
}
