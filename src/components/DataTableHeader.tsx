import React, { useRef, useCallback, useState, useEffect, ChangeEvent, KeyboardEvent, useMemo } from 'react'
import { FilterPopover } from '../FilterPopover'
import { ColumnVisibilityPopover } from '../ColumnVisibilityPopover'
import { SimpleButton } from '../defaultUIComponents'
import type { 
  DataTableIcons, 
  DataTableUIComponents
} from '../types/DataTableTypes'

/**
 * Props for the DataTableHeader component
 */
export interface DataTableHeaderProps<TData> {
  // Search functionality
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSearchKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onClearSearch: () => void
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
  onSearchChange,
  onSearchKeyDown,
  onClearSearch,
  searchInputRef: externalSearchInputRef,
  filterStore,
  filters,
  onClearFilters,
  onResetTable,
  layout,
  headerRightElement,
  filteredDataLength,
  table,
  uiComponents,
  tableStyles,
  icons
}: DataTableHeaderProps<TData>) => {
  const internalSearchInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = externalSearchInputRef || internalSearchInputRef
  
  // Get current table state to ensure re-renders when column visibility changes
  const tableState = table.getState()
  
  // Memoize UI components to prevent recreation
  const {
    Button,
    ClearSearchButton,
  } = useMemo(() => uiComponents, [uiComponents])

  const ClearSearchBtn = useMemo(() => ClearSearchButton || Button || SimpleButton, [ClearSearchButton, Button])
  const ClearFiltersBtn = useMemo(() => Button || SimpleButton, [Button])

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e)
  }, [onSearchChange])

  const handleClearSearch = useCallback(() => {
    onClearSearch()
    searchInputRef.current?.focus()
  }, [onClearSearch, searchInputRef])

  // Search bar component - memoized to prevent re-renders
  const SearchBar = useMemo(() => {
    if (!layout.showSearchBar || !filterStore) {
      return null
    }

    return (
      <div className={tableStyles.searchBar.wrapper}>
        <div className={tableStyles.searchBar.containerWrapper}>
          <div className={tableStyles.searchBar.container}>
          {/* <div className="bg-amber-300"> */}
            {icons.Search && (
              <icons.Search 
                className={tableStyles.searchBar.icon}
              />
            )}
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className={tableStyles.searchBar.input}
              aria-label={`Search ${filteredDataLength} records`}
              title="Search"
              suppressHydrationWarning
            />
            
            {searchValue && ClearSearchBtn && (
              <ClearSearchBtn
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className={tableStyles.searchBar.clearButton}
              >
                {icons.X && (
                  <icons.X className={tableStyles.searchBar.clearButtonIcon} />
                )}
              </ClearSearchBtn>
            )}
          </div>
        </div>
      </div>
    )
  }, [
    layout.showSearchBar,
    filterStore,
    searchValue,
    searchPlaceholder,
    filteredDataLength,
    searchInputRef,
    handleSearchChange,
    onSearchKeyDown,
    handleClearSearch,
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
            {`${filteredDataLength === 1 ? 'Result' : 'Results'}: ${filteredDataLength}`}
          </span>

          {filterStore && filters.length > 0 && ClearFiltersBtn && (
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
          {layout.showColumnVisibility && (
            <ColumnVisibilityPopover 
              table={table}
              uiComponents={uiComponents}
              icons={icons}
              styles={tableStyles.columnVisibility}
              showResetButton={!!layout.showResetTableButtonInSettings}
              onResetTable={onResetTable}
            />
          )}
          {headerRightElement}
          {filterStore && layout.showFilterButton && (
            <FilterPopover 
              filterStore={filterStore}
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
    filteredDataLength,
    filterStore,
    filters.length,
    onClearFilters,
    ClearFiltersBtn,
    icons.ClearFilters,
    table,
    tableState.columnVisibility, // Add table state to dependencies
    uiComponents,
    icons,
    headerRightElement
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