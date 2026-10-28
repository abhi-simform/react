import { readdirSync } from "node:fs"

import js from "@eslint/js"
import jsxA11y from "eslint-plugin-jsx-a11y"
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
  // 12.10: accessibility rules at lint time (names, roles, keyboard handlers, alt text...).
  { ...jsxA11y.flatConfigs.recommended, files: ["app/**/*.{ts,tsx}"] },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      // base-ui's Switch and our QuantityInput ARE the control (they render the input/button).
      "jsx-a11y/label-has-associated-control": [
        "error",
        { controlComponents: ["Switch", "QuantityInput"], assert: "either" },
      ],
    },
  },
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
  })),
  // Stage 12: tests may reach into a feature's internals (that is what a unit test of an
  // internal module IS) and may use `any`-free fixtures with JSON casts.
  {
    files: ["app/**/*.test.{ts,tsx}", "app/test/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": "off" },
  }
)
