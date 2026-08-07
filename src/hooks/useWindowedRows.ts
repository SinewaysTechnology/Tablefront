'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react'
import { STANDARD_PAGE_SIZE, SCROLL_THRESHOLD } from '../constants/pagination'
import { getScrollElement } from '../utils/scrollElement'

interface UseWindowedRowsParams<TData> {
  data: TData[]
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  enabled: boolean
  pageSize?: number
  increment?: number
  maxItems: number
  loadThreshold?: number
  estimateSize?: number
  /** Reset window when filter/sort/data identity changes. */
  listResetKey?: string
}

type PendingScrollAdjust =
  | { type: 'none' }
  | { type: 'compensate'; delta: number }

/**
 * Sliding data window for infinite scroll.
 * Keeps scrollHeight ≈ maxItems so the scrollbar thumb stays usable,
 * while the consumer can still virtualize the windowed rows in the DOM.
 */
export const useWindowedRows = <TData>({
  data,
  scrollAreaRef,
  enabled,
  pageSize = STANDARD_PAGE_SIZE,
  increment = STANDARD_PAGE_SIZE,
  maxItems,
  loadThreshold = SCROLL_THRESHOLD,
  estimateSize = 40,
  listResetKey,
}: UseWindowedRowsParams<TData>) => {
  const [windowStart, setWindowStart] = useState(0)
  const [windowEnd, setWindowEnd] = useState(() => Math.min(pageSize, data.length))

  const lastScrollTopRef = useRef(0)
  const itemHeightRef = useRef(estimateSize)
  const loadingMoreLockRef = useRef(false)
  const loadingLessLockRef = useRef(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingLess, setIsLoadingLess] = useState(false)
  const pendingScrollAdjustRef = useRef<PendingScrollAdjust>({ type: 'none' })
  const windowStartRef = useRef(windowStart)
  const windowEndRef = useRef(windowEnd)
  const dataLengthRef = useRef(data.length)

  windowStartRef.current = windowStart
  windowEndRef.current = windowEnd
  dataLengthRef.current = data.length

  useEffect(() => {
    itemHeightRef.current = estimateSize
  }, [estimateSize])

  const measureItemHeight = useCallback(() => {
    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) return

    const sample =
      (scrollElement.querySelector('tbody tr[data-tablefront-row="true"]') as HTMLElement | null) ||
      (scrollElement.querySelector('[data-tablefront-row="true"]') as HTMLElement | null) ||
      (scrollElement.querySelector('tbody tr:not([aria-hidden]):not([data-static])') as HTMLElement | null)

    if (!sample) return
    const height = sample.getBoundingClientRect().height
    if (height > 0 && Number.isFinite(height)) {
      itemHeightRef.current = height
    }
  }, [scrollAreaRef])

  const windowRows = useMemo(() => {
    if (!enabled) return data
    return data.slice(windowStart, windowEnd)
  }, [enabled, data, windowStart, windowEnd])

  const loadMoreItems = useCallback(() => {
    if (!enabled || loadingMoreLockRef.current) return

    const start = windowStartRef.current
    const end = windowEndRef.current
    const total = dataLengthRef.current
    if (end >= total) return

    loadingMoreLockRef.current = true
    setIsLoadingMore(true)

    const newEnd = Math.min(total, end + increment)
    if (newEnd <= end) {
      loadingMoreLockRef.current = false
      setIsLoadingMore(false)
      return
    }

    const currentWindowSize = end - start
    if (currentWindowSize < maxItems) {
      setWindowEnd(newEnd)
      loadingMoreLockRef.current = false
      setIsLoadingMore(false)
      return
    }

    const newStart = Math.max(0, newEnd - maxItems)
    const removedCount = newStart - start
    pendingScrollAdjustRef.current = {
      type: 'compensate',
      delta: -(removedCount * itemHeightRef.current),
    }
    setWindowStart(newStart)
    setWindowEnd(newEnd)
    loadingMoreLockRef.current = false
    setIsLoadingMore(false)
  }, [enabled, increment, maxItems])

  const loadLessItems = useCallback(() => {
    if (!enabled || loadingLessLockRef.current) return

    const start = windowStartRef.current
    const end = windowEndRef.current
    if (start <= 0) return

    loadingLessLockRef.current = true
    setIsLoadingLess(true)

    const newStart = Math.max(0, start - increment)
    if (newStart >= start) {
      loadingLessLockRef.current = false
      setIsLoadingLess(false)
      return
    }

    const currentWindowSize = end - start
    if (currentWindowSize < maxItems) {
      setWindowStart(newStart)
      loadingLessLockRef.current = false
      setIsLoadingLess(false)
      return
    }

    const newEnd = Math.min(dataLengthRef.current, newStart + maxItems)
    const addedCount = start - newStart
    pendingScrollAdjustRef.current = {
      type: 'compensate',
      delta: addedCount * itemHeightRef.current,
    }
    setWindowStart(newStart)
    setWindowEnd(newEnd)
    loadingLessLockRef.current = false
    setIsLoadingLess(false)
  }, [enabled, increment, maxItems])

  useLayoutEffect(() => {
    const pending = pendingScrollAdjustRef.current
    if (pending.type === 'none') return

    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) {
      pendingScrollAdjustRef.current = { type: 'none' }
      return
    }

    measureItemHeight()
    if (pending.type === 'compensate') {
      scrollElement.scrollTop = Math.max(0, scrollElement.scrollTop + pending.delta)
    }
    lastScrollTopRef.current = scrollElement.scrollTop
    pendingScrollAdjustRef.current = { type: 'none' }
  }, [windowStart, windowEnd, scrollAreaRef, measureItemHeight])

  useEffect(() => {
    if (!enabled) return

    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) return

    let rafId: number | null = null
    let needsCheck = false

    const runCheck = () => {
      rafId = null
      needsCheck = false

      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      measureItemHeight()

      const start = windowStartRef.current
      const end = windowEndRef.current
      const total = dataLengthRef.current
      const isScrollingDown = scrollTop >= lastScrollTopRef.current
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (isScrollingDown || scrollHeight <= clientHeight) {
        if (
          (distanceFromBottom < loadThreshold || scrollHeight <= clientHeight) &&
          end < total
        ) {
          loadMoreItems()
        }
      }

      if (!isScrollingDown || scrollTop === 0) {
        if (scrollTop < loadThreshold && start > 0) {
          loadLessItems()
        }
      }

      lastScrollTopRef.current = scrollTop

      if (needsCheck) {
        rafId = requestAnimationFrame(runCheck)
      }
    }

    const onScroll = () => {
      needsCheck = true
      if (rafId == null) {
        rafId = requestAnimationFrame(runCheck)
      }
    }

    scrollElement.addEventListener('scroll', onScroll, { passive: true })
    rafId = requestAnimationFrame(runCheck)

    return () => {
      scrollElement.removeEventListener('scroll', onScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [
    enabled,
    scrollAreaRef,
    loadThreshold,
    loadMoreItems,
    loadLessItems,
    measureItemHeight,
  ])

  useEffect(() => {
    if (!enabled) return

    loadingMoreLockRef.current = false
    loadingLessLockRef.current = false
    pendingScrollAdjustRef.current = { type: 'none' }

    setWindowStart(0)
    setWindowEnd(Math.min(pageSize, data.length))
    setIsLoadingMore(false)
    setIsLoadingLess(false)

    const scrollElement = getScrollElement(scrollAreaRef)
    if (scrollElement) {
      scrollElement.scrollTop = 0
      lastScrollTopRef.current = 0
    }
  }, [enabled, listResetKey, pageSize, data.length, scrollAreaRef])

  return {
    windowRows,
    isLoadingMore,
    isLoadingLess,
    windowStart,
    windowEnd,
    isEnabled: enabled,
  }
}
