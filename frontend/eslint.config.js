import { readdirSync } from "node:fs"

import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

// Stage 5.10: a feature exposes ONE public entry (`@/features/<name>`, its index.ts).
// Anything deeper (`@/features/catalog/components/ProductCard`) is internal. Inside
// a feature, deep imports of ITS OWN files are fine (the `!` pattern re-allows them);
// everything else (other features, routes, shared components) must use the index.
const features = readdirSync("app/features", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const internalsRule = (ownFeature) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: [
            "@/features/*/**",
            ...(ownFeature ? [`!@/features/${ownFeature}/**`] : []),
          ],
          message:
            "Import from the feature's public API (`@/features/<name>`), not from its internals.",
        },
      ],
    },
  ],
})

// Stage 4.1: the point of this config is the two react-hooks rules
// (`rules-of-hooks`, `exhaustive-deps`) plus the React Compiler-era checks that
// ship in the plugin's recommended preset.
export default tseslint.config(
  { ignores: ["build", ".react-router", "node_modules", "scratch"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["app/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Everything outside features/ (routes, components, hooks, scratch, tests...).
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/features/**"],
    rules: internalsRule(undefined),
  },
  // Each feature may deep-import itself, nothing else.
  ...features.map((name) => ({
    files: [`app/features/${name}/**/*.{ts,tsx}`],
    rules: internalsRule(name),
  }))
)
