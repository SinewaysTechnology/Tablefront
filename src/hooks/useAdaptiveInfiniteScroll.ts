"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { PaginationState } from '@tanstack/react-table'
import {
  STANDARD_PAGE_SIZE,
  SCROLL_THRESHOLD,
} from '../constants/pagination'
import type { InfiniteScrollConfig } from '../types/DataTableTypes'

interface UseAdaptiveInfiniteScrollProps<TData> {
  data: TData[]
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  pagination: PaginationState
  setPagination: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void
  config?: InfiniteScrollConfig
  isUsingPagination: boolean
}

interface AdaptiveScrollState {
  isLoadingMore: boolean
  isLoadingLess: boolean
  virtualStartIndex: number
  virtualEndIndex: number
}

export function useAdaptiveInfiniteScroll<TData>({
  data,
  scrollAreaRef,
  pagination,
  setPagination,
  config,
  isUsingPagination,
}: UseAdaptiveInfiniteScrollProps<TData>) {
  const {
    enabled = false,
    loadThreshold = SCROLL_THRESHOLD,
    pageSize = STANDARD_PAGE_SIZE,
    increment = STANDARD_PAGE_SIZE,
    maxItems,
  } = config || {}

  const [adaptiveState, setAdaptiveState] = useState<AdaptiveScrollState>({
    isLoadingMore: false,
    isLoadingLess: false,
    virtualStartIndex: 0,
    virtualEndIndex: Math.min(pageSize, data.length),
  })

  const lastScrollTopRef = useRef(0)
  const itemHeightEstimateRef = useRef(50)
  const viewportHeightRef = useRef(0)
  const scrollPositionRef = useRef(0) // Track scroll position for preservation

  // Calculate maximum window size based on viewport and item heights
  const calculateMaxWindowSize = useCallback(() => {
    // If maxItems is explicitly set, use it
    if (maxItems !== undefined) {
      return maxItems
    }
    
    if (!viewportHeightRef.current || !itemHeightEstimateRef.current) {
      return pageSize * 3 // Default to 3x pageSize if no viewport info
    }
    
    const itemsPerViewport = Math.ceil(viewportHeightRef.current / itemHeightEstimateRef.current)
    // Keep 3x viewport worth of items for smooth scrolling
    return Math.max(pageSize * 3, itemsPerViewport * 3)
  }, [pageSize, maxItems])

  // Get the virtual window of data (this is what should be displayed)
  const getVirtualWindowData = useCallback(() => {
    if (!enabled || isUsingPagination) {
      return data
    }
    return data.slice(adaptiveState.virtualStartIndex, adaptiveState.virtualEndIndex)
  }, [enabled, isUsingPagination, data, adaptiveState.virtualStartIndex, adaptiveState.virtualEndIndex])

  // Load more items when scrolling down
  const loadMoreItems = useCallback(() => {
    if (adaptiveState.isLoadingMore || !enabled || isUsingPagination) return

    setAdaptiveState(prev => ({ ...prev, isLoadingMore: true }))

    const currentEnd = adaptiveState.virtualEndIndex
    const maxWindowSize = calculateMaxWindowSize()
    
    const newEnd = Math.min(data.length, currentEnd + increment)
    
    if (newEnd > currentEnd) {
      // Calculate current window size
      const currentWindowSize = currentEnd - adaptiveState.virtualStartIndex
      
      // If we haven't reached maxItems yet, just extend the window
      if (currentWindowSize < maxWindowSize) {
        setAdaptiveState(prev => ({
          ...prev,
          virtualEndIndex: newEnd,
          isLoadingMore: false,
        }))
      } else {
        // Slide window forward: add items at end, remove items from start
        const newStart = Math.max(0, newEnd - maxWindowSize)
        
        // Store current scroll position before updating
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
          if (scrollElement) {
            scrollPositionRef.current = scrollElement.scrollTop
          }
        }
        
        setAdaptiveState(prev => ({
          ...prev,
          virtualStartIndex: newStart,
          virtualEndIndex: newEnd,
          isLoadingMore: false,
        }))
        
        // Restore scroll position after state update
        requestAnimationFrame(() => {
          if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
            if (scrollElement && scrollPositionRef.current > 0) {
              scrollElement.scrollTop = scrollPositionRef.current
            }
          }
        })
      }
    } else {
      setAdaptiveState(prev => ({ ...prev, isLoadingMore: false }))
    }
  }, [adaptiveState, enabled, isUsingPagination, data.length, calculateMaxWindowSize, scrollAreaRef, increment])

  // Load items when scrolling up
  const loadLessItems = useCallback(() => {
    if (adaptiveState.isLoadingLess || !enabled || isUsingPagination) return

    setAdaptiveState(prev => ({ ...prev, isLoadingLess: true }))

    const currentStart = adaptiveState.virtualStartIndex
    const maxWindowSize = calculateMaxWindowSize()
    
    const newStart = Math.max(0, currentStart - increment)
    
    if (newStart < currentStart) {
      // Calculate current window size
      const currentWindowSize = adaptiveState.virtualEndIndex - currentStart
      
      // If we haven't reached maxItems yet, just extend the window
      if (currentWindowSize < maxWindowSize) {
        setAdaptiveState(prev => ({
          ...prev,
          virtualStartIndex: newStart,
          isLoadingLess: false,
        }))
      } else {
        // Slide window backward: add items at start, remove items from end
        const newEnd = Math.min(data.length, newStart + maxWindowSize)
        
        // Store current scroll position before updating
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
          if (scrollElement) {
            scrollPositionRef.current = scrollElement.scrollTop
          }
        }
        
        setAdaptiveState(prev => ({
          ...prev,
          virtualStartIndex: newStart,
          virtualEndIndex: newEnd,
          isLoadingLess: false,
        }))
        
        // Restore scroll position after state update
        requestAnimationFrame(() => {
          if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
            if (scrollElement && scrollPositionRef.current > 0) {
              scrollElement.scrollTop = scrollPositionRef.current
            }
          }
        })
      }
    } else {
      setAdaptiveState(prev => ({ ...prev, isLoadingLess: false }))
    }
  }, [adaptiveState, enabled, isUsingPagination, calculateMaxWindowSize, scrollAreaRef, increment])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!enabled || isUsingPagination || !scrollAreaRef.current) return

    const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
    if (!scrollElement) return

    const { scrollTop, scrollHeight, clientHeight } = scrollElement
    const currentScrollTop = scrollTop

    // Update viewport height reference
    viewportHeightRef.current = clientHeight

    const isScrollingDown = currentScrollTop > lastScrollTopRef.current

    // Check if we need to load more items (scrolling down)
    if (isScrollingDown) {
      const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight
      if (distanceFromBottom < loadThreshold && adaptiveState.virtualEndIndex < data.length) {
        loadMoreItems()
      }
    }

    // Check if we need to load items when scrolling up
    if (!isScrollingDown) {
      const distanceFromTop = currentScrollTop
      if (distanceFromTop < loadThreshold && adaptiveState.virtualStartIndex > 0) {
        loadLessItems()
      }
    }

    // Special case: if we're stuck at the very top and can load more items upward
    if (currentScrollTop === 0 && adaptiveState.virtualStartIndex > 0) {
      loadLessItems()
    }

    lastScrollTopRef.current = currentScrollTop
  }, [enabled, isUsingPagination, scrollAreaRef, loadThreshold, loadMoreItems, loadLessItems, adaptiveState.virtualStartIndex, adaptiveState.virtualEndIndex, data.length])

  // Set up scroll listener
  useEffect(() => {
    if (!enabled || isUsingPagination || !scrollAreaRef.current) return

    const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current
    if (!scrollElement) return

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    // Periodic check for edge cases (stuck at top/bottom)
    const intervalId = setInterval(() => {
      if (!scrollAreaRef.current) return
      
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      
      // Check if stuck at top and can load more items upward
      if (scrollTop === 0 && adaptiveState.virtualStartIndex > 0 && !adaptiveState.isLoadingLess) {
        loadLessItems()
      }
      
      // Check if stuck at bottom and can load more items downward
      if (scrollTop + clientHeight >= scrollHeight && adaptiveState.virtualEndIndex < data.length && !adaptiveState.isLoadingMore) {
        loadMoreItems()
      }
    }, 100) // Check every 100ms

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      clearInterval(intervalId)
    }
  }, [enabled, isUsingPagination, scrollAreaRef, handleScroll, adaptiveState.virtualStartIndex, adaptiveState.virtualEndIndex, adaptiveState.isLoadingLess, adaptiveState.isLoadingMore, data.length, loadLessItems, loadMoreItems])

  // Initialize adaptive scrolling
  useEffect(() => {
    if (!enabled || isUsingPagination) return

    const optimalWindowSize = calculateMaxWindowSize()
    const initialEnd = Math.min(pageSize, data.length) // Start with pageSize, not maxWindowSize
    
    setAdaptiveState({
      isLoadingMore: false,
      isLoadingLess: false,
      virtualStartIndex: 0,
      virtualEndIndex: initialEnd,
    })
  }, [enabled, isUsingPagination, data.length, calculateMaxWindowSize, pageSize])

  return {
    virtualData: getVirtualWindowData(),
    isLoadingMore: adaptiveState.isLoadingMore,
    isLoadingLess: adaptiveState.isLoadingLess,
    virtualStartIndex: adaptiveState.virtualStartIndex,
    virtualEndIndex: adaptiveState.virtualEndIndex,
    totalItems: data.length,
    isEnabled: enabled && !isUsingPagination,
  }
} 