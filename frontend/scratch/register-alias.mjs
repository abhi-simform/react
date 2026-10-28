// Lets `node --import ./scratch/register-alias.mjs file.ts` resolve the app's
// "@/..." alias and extensionless .ts imports, like Vite does. Scratch use only.
import { register } from "node:module"

register("./alias-hooks.mjs", import.meta.url)
