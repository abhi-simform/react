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
    route("products", "routes/products.tsx"),
    route("scratch/effects", "routes/scratch-effects.tsx"),
    route("scratch/rules", "routes/scratch-rules.tsx"),
    route("scratch/refs", "routes/scratch-refs.tsx"),
    route("scratch/countdown", "routes/scratch-countdown.tsx"),
    route("scratch/memo", "routes/scratch-memo.tsx"),
    route("scratch/closures", "routes/scratch-closures.tsx"),
    route("scratch/bugs", "routes/scratch-bugs.tsx"),
    route("scratch/grid", "routes/scratch-grid.tsx"),
    route("p/:productSlug", "routes/product-detail.tsx"),
  ]),
] satisfies RouteConfig
