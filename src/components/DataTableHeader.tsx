import React, { useRef, useCallback, ChangeEvent, KeyboardEvent, useMemo } from 'react'
import { FilterPopover } from '../FilterPopover'
import { ColumnVisibilityPopover } from '../ColumnVisibilityPopover'
import { SimpleButton } from '../defaultUIComponents'
import { DebouncedSearchField } from './DebouncedSearchField'
import type { 
  DataTableIcons, 
  DataTableUIComponents
} from '../types/DataTableTypes'
import { formatTableResultCount } from '../utils/resultCount'

/**
 * Props for the DataTableHeader component
 */
export interface DataTableHeaderProps<TData> {
  // Search functionality
  searchPlaceholder?: string
  searchValue: string
  onSearchCommit: (value: string) => void
  onSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  searchDebounceMs: number
  searchResetKey?: number
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  
  // Filter functionality
  filterStore?: any
  filters: any[]
  onClearFilters: () => void
  onResetTable?: () => void
  
  // Layout controls
  layout: {
    showHeader?: boolean
    showSearchBar?: boolean
    showColumnVisibility?: boolean
    showFilterButton?: boolean
    showResetTableButtonInSettings?: boolean
  }
  
  // Header elements
  headerRightElement?: React.ReactNode
  filteredDataLength: number
  /** When set with resultLimit, the count is shown as a page range (server mode). */
  resultOffset?: number
  resultLimit?: number
  /** Singular/plural labels for the result count and settings actions. */
  labels?: {
    result?: string
    results?: string
    of?: string
    resetToDefaults?: string
  }
  
  // Table instance for column visibility
  table: any
  
  // UI components
  uiComponents: DataTableUIComponents
  
  // Styling
  tableStyles: {
    searchBar: {
      wrapper: string
      containerWrapper: string
      container: string
      icon: string
      input: string
      clearButton: string
      clearButtonIcon: string
    }
    header: {
      container: string
      leftSection: string
      rightSection: string
      resultCount: string
      clearFiltersButton: string
      clearFiltersIcon: string
    }
    columnVisibility: any
    filterPopover: any
  }
  
  // Icons
  icons: DataTableIcons
}

/**
 * DataTableHeader - Handles search, filters, and header controls
 */
export const DataTableHeader = React.memo(<TData,>({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchCommit,
  onSearchKeyDown,
  searchDebounceMs,
  searchResetKey = 0,
  searchInputRef: externalSearchInputRef,
  filterStore,
  filters,
  onClearFilters,
  onResetTable,
  layout,
  headerRightElement,
  filteredDataLength,
  resultOffset,
  resultLimit,
  labels,
  table,
  uiComponents,
  tableStyles,
  icons
}: DataTableHeaderProps<TData>) => {
  const resultLabel = labels?.result ?? 'Result'
  const resultsLabel = labels?.results ?? 'Results'
  const ofLabel = labels?.of ?? 'of'
  const resetToDefaultsLabel = labels?.resetToDefaults ?? 'Reset to defaults'
  const resultCountText = formatTableResultCount({
    total: filteredDataLength,
    resultOffset,
    resultLimit,
    resultLabel,
    resultsLabel,
    ofLabel,
  })
  const internalSearchInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = externalSearchInputRef || internalSearchInputRef
  
  // Get current table state to ensure re-renders when column visibility changes
  const tableState = table.getState()
  const hasColumnFilters = filters.some((filter) => String(filter?.id) !== '_search')
  
  // Memoize UI components to prevent recreation
  const {
    Button,
    ClearSearchButton,
  } = useMemo(() => uiComponents, [uiComponents])

  const ClearSearchBtn = useMemo(() => ClearSearchButton || Button || SimpleButton, [ClearSearchButton, Button])
  const ClearFiltersBtn = useMemo(() => Button || SimpleButton, [Button])

  const handleSearchCommit = useCallback((value: string) => {
    onSearchCommit(value)
  }, [onSearchCommit])

  const SearchBar = useMemo(() => {
    if (!layout.showSearchBar || !filterStore) {
      return null
    }

    return (
      <div className={tableStyles.searchBar.wrapper}>
        <div className={tableStyles.searchBar.containerWrapper}>
          <div className={tableStyles.searchBar.container}>
            {icons.Search && (
              <icons.Search 
                className={tableStyles.searchBar.icon}
              />
            )}
            
            <DebouncedSearchField
              key={searchResetKey}
              committedValue={searchValue}
              onCommit={handleSearchCommit}
              debounceMs={searchDebounceMs}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              inputRef={searchInputRef}
              className={tableStyles.searchBar.input}
              ariaLabel={`Search ${filteredDataLength} records`}
              ClearSearchBtn={ClearSearchBtn}
              clearButtonClassName={tableStyles.searchBar.clearButton}
              clearButtonIcon={icons.X ? (
                <icons.X className={tableStyles.searchBar.clearButtonIcon} />
              ) : null}
            />
          </div>
        </div>
      </div>
    )
  }, [
    layout.showSearchBar,
    filterStore,
    searchValue,
    searchPlaceholder,
    searchDebounceMs,
    searchResetKey,
    filteredDataLength,
    searchInputRef,
    handleSearchCommit,
    onSearchKeyDown,
    ClearSearchBtn,
    icons.Search,
    icons.X,
    tableStyles.searchBar
  ])

  // Header controls component - memoized to prevent re-renders
  const HeaderControls = useMemo(() => {
    if (!layout.showHeader) {
      return null
    }

    return (
      <div className={tableStyles.header.container}>
        <div className={tableStyles.header.leftSection}>
          <span className={tableStyles.header.resultCount}>
            {resultCountText}
          </span>

          {filterStore && hasColumnFilters && ClearFiltersBtn && (
            <ClearFiltersBtn
              onClick={onClearFilters}
              aria-label="Clear filters"
              title="Clear all filters"
              className={tableStyles.header.clearFiltersButton}
            >
              {icons.ClearFilters && (
                <icons.ClearFilters className={tableStyles.header.clearFiltersIcon} />
              )}
              <span>Clear filters</span>
            </ClearFiltersBtn>
          )}
        </div>
        
        <div className={tableStyles.header.rightSection}>
          {headerRightElement}
          {layout.showColumnVisibility && (
            <ColumnVisibilityPopover 
              table={table}
              uiComponents={uiComponents}
              icons={icons}
              styles={tableStyles.columnVisibility}
              showResetButton={layout.showResetTableButtonInSettings !== false}
              onResetTable={onResetTable}
              resetLabel={resetToDefaultsLabel}
            />
          )}
          {filterStore && layout.showFilterButton && (
            <FilterPopover 
              filterStore={filterStore}
              columnIds={table.getAllLeafColumns().map((column: { id: string }) => column.id)}
              uiComponents={uiComponents}
              icons={icons}
              styles={tableStyles.filterPopover}
            />
          )}
        </div>
      </div>
    )
  }, [
    layout.showHeader,
    layout.showColumnVisibility,
    layout.showFilterButton,
    tableStyles.header,
    tableStyles.columnVisibility,
    tableStyles.filterPopover,
    resultCountText,
    resetToDefaultsLabel,
    filterStore,
    hasColumnFilters,
    onClearFilters,
    onResetTable,
    ClearFiltersBtn,
    icons.ClearFilters,
    table,
    tableState.columnVisibility, // Add table state to dependencies
    uiComponents,
    icons,
    headerRightElement,
    layout.showResetTableButtonInSettings,
  ])

  return (
    <>
      {SearchBar}
      {HeaderControls}
    </>
  )
})

DataTableHeader.displayName = 'DataTableHeader'

/**
 * ClearFiltersButton component for standalone use
 */
export const ClearFiltersButton = React.memo<{
  onClick: () => void
  children: React.ReactNode
  className?: string
  [key: string]: any
}>(({
  onClick,
  children,
  className,
  ...props
}) => {
  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  return (
    <button
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})

ClearFiltersButton.displayName = 'ClearFiltersButton'

/**
 * SearchInput component for standalone use
 */
export const SearchInput = React.memo<{
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  inputRef?: React.RefObject<HTMLInputElement>
  [key: string]: any
}>(({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  inputRef,
  ...props
}) => {
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(e)
  }, [onChange])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
  }, [onKeyDown])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      suppressHydrationWarning
      {...props}
    />
  )
})

SearchInput.displayName = 'SearchInput'
