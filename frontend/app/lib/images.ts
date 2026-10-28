/**
 * Right-sized images (13.5). The catalog's seeded images are picsum.photos URLs of the form
 * `https://picsum.photos/seed/<seed>/<w>/<h>`, and picsum can serve any size (and WebP, with a `.webp`
 * suffix) from the same seed. This module is the stand-in for an image CDN's transformation URLs
 * (Cloudinary `w_400,f_auto`): ONE place that turns a base URL into a family of sizes. An image the
 * module does not know how to resize (an upload, a placeholder, another host) is returned as it is
 * and simply gets no `srcset`.
 */
const PICSUM = /^(https:\/\/picsum\.photos\/seed\/[^/]+)\/(\d+)\/(\d+)$/

export type ImageSources = {
  /** The fallback `src` (JPEG at the middle width). */
  src: string
  /** `<img srcset>` (JPEG), or undefined when the URL cannot be resized. */
  srcSet?: string
  /** `<source type="image/webp" srcset>`, or undefined. */
  webpSrcSet?: string
  /** Intrinsic pixel size to write in `width`/`height` (keeps the ratio of the original). */
  width?: number
  height?: number
}

export function imageSources(
  url: string,
  widths: readonly number[]
): ImageSources {
  const m = PICSUM.exec(url)
  if (!m || widths.length === 0) return { src: url }
  const [, base, w0, h0] = m
  const ratio = Number(h0) / Number(w0)
  const sorted = [...widths].sort((a, b) => a - b)
  const at = (w: number) => `${base}/${w}/${Math.round(w * ratio)}`
  const set = (suffix: string) =>
    sorted.map((w) => `${at(w)}${suffix} ${w}w`).join(", ")
  const mid = sorted[Math.floor(sorted.length / 2)]!
  return {
    src: at(mid),
    srcSet: set(""),
    webpSrcSet: set(".webp"),
    width: mid,
    height: Math.round(mid * ratio),
  }
}
