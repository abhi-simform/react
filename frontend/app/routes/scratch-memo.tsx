// Throwaway (4.8): memo / useMemo / useCallback measurements.
import {
  MemoLab,
  histogramTiming,
  trivialMemoBenchmark,
} from "@/scratch/memo/MemoLab"

export default function ScratchMemo() {
  return (
    <div className="grid gap-4 p-4">
      <MemoLab />
      <button
        className="w-fit border p-1"
        onClick={() => {
          histogramTiming()
          const r = trivialMemoBenchmark()
          console.log(
            "trivial computation: direct",
            r.direct.toFixed(1),
            "ms; useMemo-like",
            r.memoLike.toFixed(1),
            "ms"
          )
        }}
      >
        Benchmark a trivial useMemo (see console)
      </button>
    </div>
  )
}
