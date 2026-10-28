import { useState } from "react"
import { toast } from "sonner"

import { MapPin } from "lucide-react"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Addresses</h1>
        <Button onClick={() => setTarget("new")}>Add address</Button>
      </div>
      <AsyncView
        state={book.state}
        loading={<ListSkeleton rows={2} label="Loading addresses" />}
        empty={(addresses) =>
          addresses.length === 0 && (
            <EmptyState
              icon={<MapPin className="size-8" />}
              title="No saved addresses yet"
              description="Add one to check out faster."
              action={
                <Button onClick={() => setTarget("new")}>
                  Add your first address
                </Button>
              }
            />
          )
        }
      >
        {(addresses) => (
          <ul className="grid gap-3 md:grid-cols-2">
            {addresses.map((a) => (
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
        )}
      </AsyncView>
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
