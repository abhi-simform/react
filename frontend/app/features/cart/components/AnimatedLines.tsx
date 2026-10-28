import { AnimatePresence, LazyMotion, MotionConfig } from "motion/react"

/**
 * The cart's line list with enter / exit / re-layout animations (13.6).
 * - `LazyMotion` + `m` components: Motion's features are fetched by a dynamic import (`motionFeatures`)
 *   the first time a cart list renders; until then lines render as plain elements. `strict` makes a stray
 *   full `motion.*` component (which would pull everything in) an error.
 * - `MotionConfig reducedMotion="user"`: with the OS "reduce motion" setting, transform and layout
 *   animations are skipped (a removed line just disappears); only a short opacity fade remains.
 * - `AnimatePresence mode="popLayout"`: a removed line leaves the flow at once, so its neighbours glide
 *   up (layout animation, transforms) while it fades; `initial={false}`: nothing animates on first paint.
 */
export function AnimatedLines({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion
        features={() => import("./motionFeatures").then((m) => m.default)}
        strict
      >
        <ul className={className}>
          <AnimatePresence initial={false} mode="popLayout">
            {children}
          </AnimatePresence>
        </ul>
      </LazyMotion>
    </MotionConfig>
  )
}
