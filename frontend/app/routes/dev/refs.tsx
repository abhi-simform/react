// Throwaway (4.5): ref experiments.
import { AddressDialog } from "@/features/account"
import { SlashShortcutDemo } from "@/scratch/refs/SlashShortcutDemo"

export default function ScratchRefs() {
  return (
    <div className="grid gap-4 p-4">
      <SlashShortcutDemo />
      <section className="border p-3">
        <h3 className="font-medium">Address dialog autofocus</h3>
        <AddressDialog />
      </section>
    </div>
  )
}
