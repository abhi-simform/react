// Throwaway (4.9): stale closures.
import {
  BrokenIntervalClosure,
  BrokenTripleIncrement,
  FixedTripleIncrement,
  IntervalWithDeps,
  IntervalWithEffectEvent,
  IntervalWithRef,
} from "@/scratch/closures/StaleClosures"

export default function ScratchClosures() {
  return (
    <div className="grid gap-3 p-4">
      <BrokenTripleIncrement />
      <FixedTripleIncrement />
      <BrokenIntervalClosure />
      <IntervalWithDeps />
      <IntervalWithRef />
      <IntervalWithEffectEvent />
    </div>
  )
}
