import { useEffect, useRef, useState, type RefObject } from "react"

/**
 * Where does this element start, measured from the top of the DOCUMENT? A window virtualizer
 * (`useWindowVirtualizer`) needs it as `scrollMargin`: it positions rows relative to the list, but
 * the window scrolls the whole page, and the header, filters or a heading above the list push the
 * list down by an amount only the browser knows. `offsetTop` is wrong whenever an ancestor is
 * positioned, so this uses `getBoundingClientRect() + scrollY`. A ResizeObserver on `<body>` re-measures
 * whenever the page's layout changes size (it also reports once when observation starts, before paint).
 */
export function useScrollMargin<T extends HTMLElement>(): [
  RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null)
  const [margin, setMargin] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().top + window.scrollY)
      setMargin((current) => (current === next ? current : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, margin]
}
