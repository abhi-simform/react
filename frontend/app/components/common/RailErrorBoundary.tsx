import { SectionBoundary } from "./SectionBoundary"

/**
 * The 9.9 name, kept for the rails that already use it. Since 12.8 it is the shared
 * `SectionBoundary` (react-error-boundary + the Query reset), not a hand-written class.
 */
export const RailErrorBoundary = SectionBoundary
