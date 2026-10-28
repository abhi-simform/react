// Throwaway (Stage 4): effect experiments.
import { HealthBadge } from "@/components/common/HealthBadge"
import { DerivedFilter, EffectFilter } from "@/scratch/effects/DerivedStateDemo"
import { AbortSearch, NaiveSearch } from "@/scratch/effects/SearchRaceDemo"

export default function ScratchEffects() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      <section className="md:col-span-2">
        <h2 className="font-medium">4.1 HealthBadge (effect on mount)</h2>
        <HealthBadge />
      </section>
      <EffectFilter />
      <DerivedFilter />
      <NaiveSearch />
      <AbortSearch />
    </div>
  )
}
