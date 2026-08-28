import { useRef, useCallback, KeyboardEvent } from 'react'

/**
 * Search handlers for DataTable. Draft input state lives in DebouncedSearchField
 * so keystrokes do not re-render the table.
 */
export function useDataTableSearch({
  setStoreSearchValue,
  filterProcessor,
  filters,
  clearFilters,
  parentContainerRef,
}: {
  setStoreSearchValue: (value: string) => void
  filterProcessor: any
  filters: any[]
  clearFilters?: () => void
  parentContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearchCommit = useCallback((value: string) => {
    if (!filterProcessor) return
    setStoreSearchValue(value)
  }, [filterProcessor, setStoreSearchValue])

  const clearSearchValue = useCallback(() => {
    if (!filterProcessor) return
    setStoreSearchValue('')
  }, [filterProcessor, setStoreSearchValue])

  const handleSearchKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') return

    e.preventDefault()

    if (filterProcessor && filters.length > 0) {
      clearFilters?.()
      clearSearchValue()
    }

    parentContainerRef.current?.focus()
  }, [filterProcessor, filters, clearFilters, clearSearchValue, parentContainerRef])

  const handleClearSearch = useCallback(() => {
    clearSearchValue()
  }, [clearSearchValue])

  const handleClearFilters = useCallback(() => {
    if (filterProcessor && clearFilters) {
      clearFilters()
    }
  }, [filterProcessor, clearFilters])

  return {
    searchInputRef,
    handleSearchCommit,
    handleSearchKeyDown,
    handleClearSearch,
    handleClearFilters,
  }
}
