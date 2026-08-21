import { useState, useRef, useEffect, useCallback, ChangeEvent, KeyboardEvent } from 'react'
import type { DataTableProps } from '../types/DataTableTypes'

/**
 * Search and filtering logic hook for DataTable
 */
export function useDataTableSearch<TData>({
  storeSearchValue,
  setStoreSearchValue,
  filterProcessor,
  filters,
  clearFilters,
  parentContainerRef,
}: {
  storeSearchValue: string
  setStoreSearchValue: (value: string) => void
  filterProcessor: any
  filters: any[]
  clearFilters?: () => void
  parentContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  // ============================================================================
  // SEARCH STATE
  // ============================================================================
  
  const [searchValue, setSearchValue] = useState(storeSearchValue)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Reduced debounce for more responsive search
  const DEBOUNCE_MS = 150

  // ============================================================================
  // SEARCH SYNC
  // ============================================================================
  
  useEffect(() => {
    setSearchValue(storeSearchValue)
  }, [storeSearchValue])

  // ============================================================================
  // DEBOUNCED SEARCH
  // ============================================================================
  
  const debouncedSetStoreSearchValue = useCallback((value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (filterProcessor) {
        setStoreSearchValue(value)
      }
      debounceTimerRef.current = null
    }, DEBOUNCE_MS)
  }, [filterProcessor, setStoreSearchValue])
  
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // ============================================================================
  // SEARCH HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    debouncedSetStoreSearchValue(newValue)
  }, [debouncedSetStoreSearchValue])

  const clearSearchValue = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    setSearchValue('')
    if (filterProcessor) {
      setStoreSearchValue('')
    }
  }, [filterProcessor, setStoreSearchValue])

  const handleSearchKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      
      if (filterProcessor && filters.length > 0) {
        clearFilters?.()
        clearSearchValue()
      } else if (searchValue) {
        clearSearchValue()
      }
      
      parentContainerRef.current?.focus()
    }
  }, [filterProcessor, filters, clearFilters, searchValue, clearSearchValue])

  const handleClearSearch = useCallback(() => {
    clearSearchValue()
  }, [clearSearchValue])

  const resetSearch = useCallback(() => {
    clearSearchValue()
  }, [clearSearchValue])
  
  const handleClearFilters = useCallback(() => {
    if (filterProcessor && clearFilters) {
      clearFilters()
    }
  }, [filterProcessor, clearFilters])

  // ============================================================================
  // RETURN SEARCH LOGIC
  // ============================================================================
  
  return {
    // Search state
    searchValue,
    setSearchValue,
    searchInputRef,
    debounceTimerRef,
    DEBOUNCE_MS,
    
    // Search handlers
    handleSearchChange,
    clearSearchValue,
    handleSearchKeyDown,
    handleClearSearch,
    resetSearch,
    handleClearFilters,
    
    // Debounced search
    debouncedSetStoreSearchValue,
  }
}
