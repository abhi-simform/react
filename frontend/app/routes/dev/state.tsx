import { useSearchParams } from "react-router"

// 8.1 and 8.2: state ownership labs (children composition, context re-render problem, zustand selectors; ?broken=1 mounts the broken selector).
import { ContextLab } from "@/scratch/context/ContextLab"
import { OutsideProvider } from "@/scratch/context/OutsideProvider"
import { ZustandLab } from "@/scratch/zustand/ZustandLab"
import { ChildrenDemo } from "@/scratch/state/ChildrenDemo"

export default function ScratchState() {
  return (
    <div className="grid gap-6 p-4">
      <h1 className="text-xl font-medium">State ownership (8.1)</h1>
      <ChildrenDemo />
      <ContextLab />
      <OutsideProvider />
      <ZustandLab broken={useSearchParams()[0].has("broken")} />
    </div>
  )
}
