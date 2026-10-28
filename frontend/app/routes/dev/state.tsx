// 8.1 and 8.2: state ownership labs (children composition, context re-render problem).
import { ChildrenDemo } from "@/scratch/state/ChildrenDemo"

export default function ScratchState() {
  return (
    <div className="grid gap-6 p-4">
      <h1 className="text-xl font-medium">State ownership (8.1)</h1>
      <ChildrenDemo />
    </div>
  )
}
