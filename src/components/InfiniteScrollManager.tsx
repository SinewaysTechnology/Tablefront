'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PaginationState } from '@tanstack/react-table'
import { INFINITE_SCROLL_INCREMENT, SCROLL_THRESHOLD } from '../constants/pagination'
import { getScrollElement } from '../utils/scrollElement'
import { useWindowedRows } from '../hooks/useWindowedRows'

import type { InfiniteScrollConfig } from '../types/DataTableTypes'

interface UseInfiniteScrollManagerParams<TData> {
  /** Filtered (unsorted) rows — used for length checks in regular mode. */
  normalRows: TData[]
  /** Sorted + filtered full list (pre-pagination). */
  sortedRows: TData[]
  /** Currently paginated/sorted slice from TanStack (regular infinite scroll grows into this). */
  displayRows: TData[]
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  pagination: PaginationState
  setPagination: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  infiniteScrollConfig?: InfiniteScrollConfig
  isUsingPagination: boolean
  displayMode: 'table' | 'grid' | 'masonry'
  windowSize?: { width: number; height: number }
  /** Fingerprint for window resets (filter/sort/data identity). */
  listResetKey?: string
}

export function useInfiniteScrollManager<TData>({
  normalRows,
  sortedRows,
  displayRows,
  scrollAreaRef,
  pagination,
  setPagination,
  infiniteScrollConfig,
  isUsingPagination,
  displayMode,
  windowSize,
  listResetKey,
}: UseInfiniteScrollManagerParams<TData>) {
  const wantsInfinite = !!infiniteScrollConfig?.enabled && !isUsingPagination
  const wantsDomVirtualization =
    !isUsingPagination &&
    displayMode !== 'masonry' &&
    !!(
      infiniteScrollConfig?.virtualized ||
      infiniteScrollConfig?.adaptive ||
      wantsInfinite
    )

  // Progressive loading only when the consumer opts into sizing knobs.
  // With just `{ enabled: true }` (no pageSize / increment / maxItems), show everything.
  const hasProgressiveSizing =
    (typeof infiniteScrollConfig?.pageSize === 'number' &&
      infiniteScrollConfig.pageSize > 0) ||
    (typeof infiniteScrollConfig?.increment === 'number' &&
      infiniteScrollConfig.increment > 0) ||
    (typeof infiniteScrollConfig?.maxItems === 'number' &&
      infiniteScrollConfig.maxItems > 0)

  // Full list: explicit `fullList`, or default when no progressive sizing is configured.
  // `fullList: false` keeps the old growing-pageSize behavior even without knobs.
  const wantsFullList =
    wantsInfinite &&
    (infiniteScrollConfig?.fullList === true ||
      (infiniteScrollConfig?.fullList !== false && !hasProgressiveSizing))

  // Sliding window: caps scrollHeight so the thumb stays usable.
  const maxItems = infiniteScrollConfig?.maxItems
  const wantsWindowed =
    wantsInfinite &&
    !wantsFullList &&
    typeof maxItems === 'number' &&
    maxItems > 0 &&
    displayMode !== 'masonry'

  // Growing pageSize when infinite is on and we're not using full-list or windowed mode.
  const shouldEnableGrowingScroll =
    wantsInfinite && !wantsFullList && !wantsWindowed

  const loadThreshold = infiniteScrollConfig?.loadThreshold ?? SCROLL_THRESHOLD

  const {
    windowRows,
    isLoadingMore: windowIsLoadingMore,
    isLoadingLess: windowIsLoadingLess,
    isEnabled: windowEnabled,
  } = useWindowedRows({
    data: sortedRows,
    scrollAreaRef,
    enabled: wantsWindowed,
    pageSize: infiniteScrollConfig?.pageSize,
    increment: infiniteScrollConfig?.increment,
    maxItems: maxItems ?? 0,
    loadThreshold,
    estimateSize: infiniteScrollConfig?.estimateSize,
    listResetKey,
  })

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadingLockRef = useRef(false)
  const paginationRef = useRef(pagination)
  const normalRowsLengthRef = useRef(normalRows.length)

  paginationRef.current = pagination
  normalRowsLengthRef.current = normalRows.length

  const loadMoreItems = useCallback(() => {
    if (!shouldEnableGrowingScroll || loadingLockRef.current) return

    const { pageIndex, pageSize } = paginationRef.current
    const total = normalRowsLengthRef.current
    const currentlyShowing = (pageIndex + 1) * pageSize
    if (currentlyShowing >= total) return

    loadingLockRef.current = true
    setIsLoadingMore(true)

    const increment = infiniteScrollConfig?.increment || INFINITE_SCROLL_INCREMENT
    setPagination((prev: PaginationState) => ({
      ...prev,
      pageSize: prev.pageSize + increment,
    }))

    requestAnimationFrame(() => {
      loadingLockRef.current = false
      setIsLoadingMore(false)
    })
  }, [shouldEnableGrowingScroll, setPagination, infiniteScrollConfig?.increment])

  useEffect(() => {
    if (!shouldEnableGrowingScroll) return

    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) return

    let rafId: number | null = null
    let needsCheck = false

    const runCheck = () => {
      rafId = null
      needsCheck = false
      if (loadingLockRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const { pageIndex, pageSize } = paginationRef.current
      const currentlyShowing = (pageIndex + 1) * pageSize

      if (distanceFromBottom < loadThreshold) {
        loadMoreItems()
      } else if (
        currentlyShowing < normalRowsLengthRef.current &&
        scrollHeight <= clientHeight
      ) {
        loadMoreItems()
      }

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
  }, [loadMoreItems, shouldEnableGrowingScroll, scrollAreaRef, loadThreshold])

  useEffect(() => {
    if (!shouldEnableGrowingScroll || !windowSize) return

    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) return

    const id = requestAnimationFrame(() => {
      if (loadingLockRef.current) return
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const { pageIndex, pageSize } = paginationRef.current
      const currentlyShowing = (pageIndex + 1) * pageSize

      if (
        distanceFromBottom < loadThreshold ||
        (currentlyShowing < normalRowsLengthRef.current && scrollHeight <= clientHeight)
      ) {
        loadMoreItems()
      }
    })

    return () => cancelAnimationFrame(id)
  }, [windowSize, shouldEnableGrowingScroll, scrollAreaRef, loadMoreItems, loadThreshold])

  const effectiveDisplayRows = wantsFullList
    ? sortedRows
    : windowEnabled
      ? windowRows
      : displayRows

  const effectiveIsLoadingMore = windowEnabled ? windowIsLoadingMore : isLoadingMore

  return {
    effectiveDisplayRows,
    effectiveIsLoadingMore,
    isLoadingLess: windowEnabled ? windowIsLoadingLess : undefined,
    isVirtualizationEnabled: wantsDomVirtualization,
    isFullListVirtualization: wantsFullList,
    shouldEnableInfiniteScroll:
      shouldEnableGrowingScroll || wantsWindowed || wantsFullList,
  }
}
