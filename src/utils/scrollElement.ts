import type { RefObject } from 'react'

/**
 * Resolve the actual scrollable node for a DataTable ScrollArea root.
 * Prefers a Radix viewport when present.
 */
export const getScrollElement = (
  scrollAreaRef: RefObject<HTMLDivElement | null>,
): HTMLElement | null => {
  const root = scrollAreaRef.current
  if (!root) return null
  return (
    (root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null) ||
    root
  )
}
