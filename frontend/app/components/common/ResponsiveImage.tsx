import { imageSources } from "@/lib/images"
import { cn } from "@/lib/utils"

type Props = {
  src: string
  /** Meaningful text, or "" for a decorative image (a name right next to it already says what it is). */
  alt: string
  /** Pixel widths the server can produce; the browser picks one from `sizes` and the screen density. */
  widths: readonly number[]
  /** What width the image will have in the LAYOUT, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string
  /** `true` only for the LCP image: eager, high fetch priority, synchronous decode. Everything else lazy. */
  priority?: boolean
  /** Width / height of the box (e.g. 1 or 3). Reserves the space before the file arrives: no layout shift. */
  ratio?: number
  className?: string
}

/**
 * The one image component (13.5).
 * - `<picture>` offers WebP first and falls back to the JPEG, each with a `srcset`, so a 190 px card
 *   downloads ~10 kB instead of the 800 px original.
 * - `width`/`height` attributes + CSS `aspect-ratio` give the browser the box before the bytes arrive (CLS).
 * - Below the fold: `loading="lazy"` + `decoding="async"` (not requested until near the viewport).
 *   The LCP image: `loading="eager"` + `fetchPriority="high"`, and it must NOT be lazy (that delays LCP).
 */
export function ResponsiveImage({
  src,
  alt,
  widths,
  sizes,
  priority = false,
  ratio,
  className,
}: Props) {
  const s = imageSources(src, widths)
  const width = s.width
  const height =
    s.height ?? (width && ratio ? Math.round(width / ratio) : undefined)
  return (
    <picture>
      {s.webpSrcSet && (
        <source type="image/webp" srcSet={s.webpSrcSet} sizes={sizes} />
      )}
      <img
        src={s.src}
        srcSet={s.srcSet}
        sizes={s.srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
        className={cn("size-full object-cover dark:brightness-90", className)}
      />
    </picture>
  )
}
