'use client'

import { useCallback, useMemo } from 'react'
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual'
import { getScrollElement } from '../utils/scrollElement'

export type DataTableVirtualizer = Virtualizer<HTMLElement, Element>

interface UseDataTableVirtualizerParams {
  enabled: boolean
  count: number
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  estimateSize?: number
  overscan?: number
  getItemKey?: (index: number) => string | number
  /**
   * Offset of the virtualized list from the start of the scroll parent
   * (e.g. sticky static rows above a grid). Prefer 0 for table `tbody`
   * spacer virtualization where `thead` is already in document flow.
   */
  scrollMargin?: number
  /** Extra inset used by scrollToIndex so rows clear sticky headers. */
  scrollPaddingStart?: number
  /**
   * When true, measured row height includes the following sibling marked
   * with `data-expanded-content="true"` (table expandable rows).
   */
  measureExpandedSibling?: boolean
  /** Multi-column virtualization for grid layout. */
  lanes?: number
  gap?: number
}

const DEFAULT_ESTIMATE_SIZE = 40
const DEFAULT_OVERSCAN = 8

/**
 * TanStack Virtual wrapper tuned for DataTable scroll roots (Radix or native).
 */
export const useDataTableVirtualizer = ({
  enabled,
  count,
  scrollAreaRef,
  estimateSize = DEFAULT_ESTIMATE_SIZE,
  overscan = DEFAULT_OVERSCAN,
  getItemKey,
  scrollMargin = 0,
  scrollPaddingStart = 0,
  measureExpandedSibling = false,
  lanes = 1,
  gap = 0,
}: UseDataTableVirtualizerParams): DataTableVirtualizer => {
  const getScrollElementCb = useCallback(
    () => getScrollElement(scrollAreaRef),
    [scrollAreaRef],
  )

  const measureElement = useMemo(() => {
    if (!measureExpandedSibling) return undefined

    return (
      element: Element,
      entry: ResizeObserverEntry | undefined,
      _instance: DataTableVirtualizer,
    ) => {
      const base =
        entry?.borderBoxSize?.[0] != null
          ? entry.borderBoxSize[0].blockSize
          : element.getBoundingClientRect().height

      if (element.getAttribute('data-expanded') !== 'true') return base

      const next = element.nextElementSibling as HTMLElement | null
      if (!next || next.getAttribute('data-expanded-content') !== 'true') {
        return base
      }

      return base + next.getBoundingClientRect().height
    }
  }, [measureExpandedSibling])

  return useVirtualizer({
    count: enabled ? count : 0,
    getScrollElement: getScrollElementCb,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey,
    scrollMargin,
    scrollPaddingStart,
    enabled,
    lanes,
    gap,
    measureElement,
  })
}
