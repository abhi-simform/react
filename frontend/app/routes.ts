import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("scratch/explorer", "routes/scratch-explorer.tsx"),
  route("scratch/grid", "routes/scratch-grid.tsx"),
  route("p/:productSlug", "routes/product-detail.tsx"),
] satisfies RouteConfig
