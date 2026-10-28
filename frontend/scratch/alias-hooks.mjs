import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const appDir = new URL("../app/", import.meta.url)

function withExtension(url) {
  if (/\.[cm]?[jt]sx?$|\.json$/.test(url.pathname)) return url
  for (const ext of [".ts", "/index.ts"]) {
    const candidate = new URL(url.href + ext)
    if (existsSync(fileURLToPath(candidate))) return candidate
  }
  return url
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const target = withExtension(new URL(specifier.slice(2), appDir))
    return next(pathToFileURL(fileURLToPath(target)).href, context)
  }
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const target = withExtension(new URL(specifier, context.parentURL))
    return next(target.href, context)
  }
  return next(specifier, context)
}
