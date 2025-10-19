"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { PaginationState } from "@tanstack/react-table";
import { INFINITE_SCROLL_INCREMENT, SCROLL_THRESHOLD } from "../constants/pagination";
import { useAdaptiveInfiniteScroll } from "../hooks/useAdaptiveInfiniteScroll";

import type { InfiniteScrollConfig } from "../types/DataTableTypes";

interface UseInfiniteScrollManagerParams<TData> {
  normalRows: TData[]
  displayRows: TData[]
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  pagination: PaginationState
  setPagination: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  infiniteScrollConfig?: InfiniteScrollConfig
  isUsingPagination: boolean
  displayMode: 'table' | 'grid' | 'masonry'
  windowSize?: { width: number; height: number }
}

export function useInfiniteScrollManager<TData>({
  normalRows,
  displayRows,
  scrollAreaRef,
  pagination,
  setPagination,
  infiniteScrollConfig,
  isUsingPagination,
  displayMode,
  windowSize,
}: UseInfiniteScrollManagerParams<TData>) {
  // Determine adaptive availability
  const isAdaptiveEnabled = !!(infiniteScrollConfig?.enabled && infiniteScrollConfig?.adaptive && displayMode !== 'masonry')

  // Adaptive infinite scrolling
  const {
    virtualData: adaptiveVirtualData,
    isLoadingMore: adaptiveIsLoadingMore,
    isLoadingLess: adaptiveIsLoadingLess,
    isEnabled: adaptiveScrollEnabled,
  } = useAdaptiveInfiniteScroll({
    data: normalRows,
    scrollAreaRef,
    pagination,
    setPagination,
    config: isAdaptiveEnabled ? infiniteScrollConfig : undefined,
    isUsingPagination,
  })

  // Regular infinite scrolling state
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Check if we should enable regular infinite scrolling (when adaptive is disabled)
  const shouldEnableInfiniteScroll = !isUsingPagination && !isAdaptiveEnabled && !!infiniteScrollConfig?.enabled && !infiniteScrollConfig?.adaptive

  // Regular infinite scrolling loader
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !shouldEnableInfiniteScroll) return

    setIsLoadingMore(true)

    const currentPageSize = pagination.pageSize
    const currentPageIndex = pagination.pageIndex
    const currentlyShowing = (currentPageIndex + 1) * currentPageSize
    const increment = infiniteScrollConfig?.increment || INFINITE_SCROLL_INCREMENT

    if (currentlyShowing < normalRows.length) {
      setPagination((prev: PaginationState) => ({
        ...prev,
        pageSize: prev.pageSize + increment,
      }))
      requestAnimationFrame(() => {
        setIsLoadingMore(false)
      })
    } else {
      setIsLoadingMore(false)
    }
  }, [normalRows.length, pagination.pageIndex, pagination.pageSize, setPagination, isLoadingMore, shouldEnableInfiniteScroll, infiniteScrollConfig?.increment])

  // rAF-based scroll checking system (no hardcoded delays)
  useEffect(() => {
    if (!scrollAreaRef.current || !shouldEnableInfiniteScroll) return

    const scrollElement = (scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement) || scrollAreaRef.current
    if (!scrollElement) return

    const rafIdRef = { current: 0 as number | null }
    const needsCheckRef = { current: false }

    const runCheck = () => {
      rafIdRef.current = null
      if (isLoadingMore) return

      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Trigger load-more when near bottom
      if (distanceFromBottom < SCROLL_THRESHOLD) {
        loadMoreItems()
      }

      // Initial fill: if content shorter than viewport, try to load more
      const currentlyShowing = (pagination.pageIndex + 1) * pagination.pageSize
      if (currentlyShowing < normalRows.length && !isLoadingMore) {
        if (scrollHeight <= clientHeight) {
          loadMoreItems()
        }
      }

      // If another check is pending (due to bursty scroll events), schedule again
      if (needsCheckRef.current) {
        needsCheckRef.current = false
        rafIdRef.current = requestAnimationFrame(runCheck)
      }
    }

    const onScroll = () => {
      needsCheckRef.current = true
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(runCheck)
      }
    }

    // Listen to scroll events, but process in rAF
    scrollElement.addEventListener('scroll', onScroll, { passive: true })

    // Kick an initial rAF check once mounted
    rafIdRef.current = requestAnimationFrame(runCheck)

    return () => {
      scrollElement.removeEventListener('scroll', onScroll)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [loadMoreItems, isLoadingMore, shouldEnableInfiniteScroll, scrollAreaRef, pagination.pageIndex, pagination.pageSize, normalRows.length])

  // Re-check on window resize using rAF
  useEffect(() => {
    if (!scrollAreaRef.current || !shouldEnableInfiniteScroll) return
    const el = (scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement) || scrollAreaRef.current
    if (!el) return
    const run = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      if (distanceFromBottom < SCROLL_THRESHOLD) {
        loadMoreItems()
      }
      const currentlyShowing = (pagination.pageIndex + 1) * pagination.pageSize
      if (currentlyShowing < normalRows.length && !isLoadingMore && scrollHeight <= clientHeight) {
        loadMoreItems()
      }
    }
    const id = requestAnimationFrame(run)
    return () => cancelAnimationFrame(id)
  }, [windowSize, shouldEnableInfiniteScroll, scrollAreaRef, loadMoreItems, isLoadingMore, pagination.pageIndex, pagination.pageSize, normalRows.length])

  const effectiveDisplayRows = adaptiveScrollEnabled ? adaptiveVirtualData : displayRows
  const effectiveIsLoadingMore = adaptiveScrollEnabled ? adaptiveIsLoadingMore : isLoadingMore

  return {
    effectiveDisplayRows,
    effectiveIsLoadingMore,
    adaptiveIsLoadingLess: adaptiveScrollEnabled ? adaptiveIsLoadingLess : undefined,
    adaptiveScrollEnabled,
    shouldEnableInfiniteScroll: shouldEnableInfiniteScroll || adaptiveScrollEnabled,
  }
}


