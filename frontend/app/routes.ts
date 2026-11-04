import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("scratch/explorer", "routes/scratch-explorer.tsx"),
  route("scratch/grid", "routes/scratch-grid.tsx"),
] satisfies RouteConfig
