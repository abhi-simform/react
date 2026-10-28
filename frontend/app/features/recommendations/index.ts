// Public API of the recommendations feature (B8 rails, recently viewed, view tracking).
export { ProductRail } from "./components/ProductRail"
export {
  AlsoBoughtRail,
  ForYouRail,
  RecentlyViewedRail,
  SimilarRail,
  TrendingRail,
} from "./components/Rails"
export { RecentlyViewedSync } from "./RecentlyViewedSync"
export { useTrackView } from "./hooks/useTrackView"
export { railQueries } from "./queries"
export type { RailData } from "./queries"
