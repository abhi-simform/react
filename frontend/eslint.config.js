import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

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
  }
)
