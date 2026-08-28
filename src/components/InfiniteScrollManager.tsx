'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PaginationState } from '@tanstack/react-table'
import { INFINITE_SCROLL_INCREMENT, SCROLL_THRESHOLD, STANDARD_PAGE_SIZE } from '../constants/pagination'
import { getScrollElement } from '../utils/scrollElement'
import { resolveEstimateSize, shouldPrefetchNextServerPage } from '../utils/serverInfiniteScroll'
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
  /** Server mode + `infiniteScrollConfig.enabled`: fetch the next page instead of growing local pageSize. */
  isServerInfinite?: boolean
  /** Server match count. Used to stop loading when every row is present. */
  serverTotal?: number
  /** True while the parent is fetching a server page. */
  isFetching?: boolean
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
  isServerInfinite = false,
  serverTotal = 0,
  isFetching = false,
  displayMode,
  windowSize,
  listResetKey,
}: UseInfiniteScrollManagerParams<TData>) {
  const wantsInfinite = (!!infiniteScrollConfig?.enabled && !isUsingPagination) || isServerInfinite
  const wantsDomVirtualization =
    (isServerInfinite || !isUsingPagination) &&
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
    !isServerInfinite &&
    (infiniteScrollConfig?.fullList === true ||
      (infiniteScrollConfig?.fullList !== false && !hasProgressiveSizing))

  // Sliding window: caps scrollHeight so the thumb stays usable.
  const maxItems = infiniteScrollConfig?.maxItems
  const wantsWindowed =
    wantsInfinite &&
    !isServerInfinite &&
    !wantsFullList &&
    typeof maxItems === 'number' &&
    maxItems > 0 &&
    displayMode !== 'masonry'

  // Growing pageSize when infinite is on and we're not using full-list, windowed, or server mode.
  const shouldEnableGrowingScroll =
    wantsInfinite && !isServerInfinite && !wantsFullList && !wantsWindowed

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
  const serverTotalRef = useRef(serverTotal)
  const isFetchingRef = useRef(isFetching)
  const loadedAtRequestRef = useRef(0)
  const wasFetchingRef = useRef(false)

  paginationRef.current = pagination
  normalRowsLengthRef.current = normalRows.length
  serverTotalRef.current = serverTotal
  isFetchingRef.current = isFetching

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

  const loadMoreServerPages = useCallback(() => {
    if (!isServerInfinite || loadingLockRef.current || isFetchingRef.current) return

    const loaded = normalRowsLengthRef.current
    const total = serverTotalRef.current
    if (total <= 0 || loaded >= total) return

    const pageIndex = paginationRef.current.pageIndex || 0
    const pageSize =
      infiniteScrollConfig?.pageSize ||
      paginationRef.current.pageSize ||
      STANDARD_PAGE_SIZE
    const haveCurrentPage = loaded >= Math.min((pageIndex + 1) * pageSize, total || Number.POSITIVE_INFINITY)
    if (!haveCurrentPage) return

    loadedAtRequestRef.current = loaded
    loadingLockRef.current = true
    setIsLoadingMore(true)
    setPagination((prev: PaginationState) => ({
      ...prev,
      pageIndex: (prev.pageIndex || 0) + 1,
    }))
  }, [infiniteScrollConfig?.pageSize, isServerInfinite, setPagination])

  useEffect(() => {
    if (!isServerInfinite) return
    if (normalRows.length > loadedAtRequestRef.current) {
      loadingLockRef.current = false
      setIsLoadingMore(false)
    }
    if (isFetching) {
      wasFetchingRef.current = true
      return
    }
    if (wasFetchingRef.current) {
      wasFetchingRef.current = false
      loadingLockRef.current = false
      setIsLoadingMore(false)
    }
  }, [isServerInfinite, isFetching, normalRows.length])

  useEffect(() => {
    if (!isServerInfinite) return
    if ((pagination.pageIndex || 0) !== 0) return
    loadingLockRef.current = false
    loadedAtRequestRef.current = 0
  }, [isServerInfinite, pagination.pageIndex])

  useEffect(() => {
    if (!isServerInfinite) return

    const scrollElement = getScrollElement(scrollAreaRef)
    if (!scrollElement) return

    let rafId: number | null = null
    let needsCheck = false

    const runCheck = () => {
      rafId = null
      needsCheck = false
      if (loadingLockRef.current || isFetchingRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const estimate = resolveEstimateSize(infiniteScrollConfig?.estimateSize)
      const loaded = normalRowsLengthRef.current
      if (
        shouldPrefetchNextServerPage({
          distanceFromBottom,
          clientHeight,
          loadThreshold,
          estimateSize: estimate,
          loaded,
          total: serverTotalRef.current,
          scrollTop,
        })
      ) {
        loadMoreServerPages()
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
  }, [infiniteScrollConfig?.estimateSize, isServerInfinite, loadMoreServerPages, loadThreshold, scrollAreaRef, normalRows.length, serverTotal])

  const effectiveDisplayRows = isServerInfinite
    ? sortedRows
    : wantsFullList
      ? sortedRows
      : windowEnabled
        ? windowRows
        : displayRows

  const effectiveIsLoadingMore = isServerInfinite
    ? isFetching && normalRows.length > 0 && (serverTotal === 0 || normalRows.length < serverTotal)
    : windowEnabled
      ? windowIsLoadingMore
      : isLoadingMore

  return {
    effectiveDisplayRows,
    effectiveIsLoadingMore,
    isLoadingLess: windowEnabled ? windowIsLoadingLess : undefined,
    isVirtualizationEnabled: wantsDomVirtualization,
    isFullListVirtualization: wantsFullList,
    shouldEnableInfiniteScroll:
      isServerInfinite || shouldEnableGrowingScroll || wantsWindowed || wantsFullList,
  }
}
