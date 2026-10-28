import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

export default [
  layout("routes/_layout.shell.tsx", [
    index("routes/home.tsx"),
    route("scratch/explorer", "routes/scratch-explorer.tsx"),
    route("scratch/effects", "routes/scratch-effects.tsx"),
    route("scratch/grid", "routes/scratch-grid.tsx"),
    route("p/:productSlug", "routes/product-detail.tsx"),
  ]),
] satisfies RouteConfig
