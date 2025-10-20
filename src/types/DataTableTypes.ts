import React from 'react'
import { ColumnDef, PaginationState, Row } from '@tanstack/react-table'
import type { FilterField, FilterDataType } from '../filters'
import type { PartialTableStyles } from '../variants'
import type { ResizeTimingConfig } from '../constants/resize'
import type { DragState, ResizeState } from '../utils'
import type { EffectiveIcons } from '../icons'

// ============================================================================
// CORE COMPONENT TYPES
// ============================================================================

/**
 * Smart header component that auto-truncates text when column gets too narrow
 */
export interface SmartHeaderProps {
  text: string
  columnId: string
  sortIcon: React.ReactNode
  isHeaderEmpty: boolean
  resizeState: ResizeState
  headerAlignment: 'left' | 'center' | 'right'
}

/**
 * UI Components that can be overridden for customization
 */
export interface DataTableUIComponents {
  Button?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  FilterButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  ColumnButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  ClearButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  ClearSearchButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  PaginationButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>> | React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>
  FilterItemButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  ScrollArea?:
    | React.ComponentType<{ className?: string; children?: React.ReactNode }>
    | React.ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } &
        React.RefAttributes<HTMLDivElement>
      >
  Popover?: React.ComponentType<{ children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>
  PopoverTrigger?: React.ComponentType<{ children: React.ReactNode; asChild?: boolean }>
  PopoverContent?: React.ComponentType<{ children: React.ReactNode; className?: string; align?: 'center' | 'start' | 'end'; sideOffset?: number }>
  Tooltip?: React.ComponentType<{ children: React.ReactNode }>
  TooltipTrigger?: React.ComponentType<{ children: React.ReactNode; asChild?: boolean }>
  TooltipContent?: React.ComponentType<{ children: React.ReactNode; className?: string }>
  Switch?: React.ComponentType<{ checked?: boolean; onCheckedChange?: (checked: boolean) => void; className?: string; id?: string }>
  Label?: React.ComponentType<{ children?: React.ReactNode; htmlFor?: string; className?: string }>
  Separator?: React.ComponentType<{ className?: string }>
  Settings02Icon?: React.ComponentType<{ className?: string }>
}

/**
 * Main DataTable component props
 */
export interface DataTableProps<TData> {
  // Core data and configuration
  data: TData[]
  columns?: ColumnDef<TData, any>[]
  columnOverrides?: ColumnOverrides<TData>
  /**
   * Initial column visibility configuration applied on first use only.
   * - byId: map of columnId => boolean (true to show, false to hide)
   * - hideAll: if true, hide all columns by default (byId can override)
   */
  initialColumnVisibility?: InitialColumnVisibilityConfig
  fieldOverrides?: FieldOverrides<TData>
  customStyles?: PartialTableStyles
  uiComponents?: DataTableUIComponents
  icons?: DataTableIcons
  storeId?: string

  // Row interaction
  onRowClick?: (row: TData) => void
  selectedRow?: TData | null
  autoSelect?: boolean

  // Expandable functionality
  expandable?: boolean
  expandedRows?: Record<string, boolean>
  onToggleExpand?: (row: TData) => void
  onExpansionChange?: (expandedRows: Record<string, boolean>) => void
  renderExpandedContent?: (row: TData) => React.ReactNode
  /**
   * If true, expanded row content in table mode will be clamped to the
   * scroll container width rather than spanning the full table content width.
   */
  clampExpandedContentToContainer?: boolean
  /**
   * If true, custom static rows will be clamped to the scroll container width.
   */
  clampStaticRowsToContainer?: boolean

  // Custom rendering
  headerRightElement?: React.ReactNode
  customRenderGridItem?: (row: TData, index: number, isSelected: boolean) => React.ReactNode
  customStaticRows?: React.ReactNode[]
  customStaticRowsSticky?: boolean

  // Text and labels
  searchPlaceholder?: string
  emptyStateText?: string
  loadingText?: string
  isLoading?: boolean

  // Layout configuration
  layout?: DataTableLayout
  paginationConfig?: DataTablePaginationConfig
  infiniteScrollConfig?: InfiniteScrollConfig

  // Feature toggles
  enableColumnDrag?: boolean
  enableColumnResize?: boolean
  resizeTimingConfig?: ResizeTimingConfig
}

// ============================================================================
// LAYOUT AND CONFIGURATION TYPES
// ============================================================================

/**
 * Layout configuration for the DataTable
 */
export interface DataTableLayout {
  showSearchBar?: boolean
  showHeader?: boolean
  showTableHeaders?: boolean
  showColumnVisibility?: boolean
  showFilterButton?: boolean
  showResetTableButtonInSettings?: boolean
  displayMode?: 'table' | 'grid' | 'masonry'
  gridColumns?: number // If > 0, shows exactly this many columns. If 0 or undefined, uses responsive auto-fit with gridItemMinWidth
  gridItemMinWidth?: number
  masonryColumns?: number // If > 0, shows exactly this many columns. If 0 or undefined, uses responsive auto-fit with masonryItemMinWidth
  masonryItemMinWidth?: number
  masonryGap?: number // Gap between items in pixels
}

/**
 * Pagination configuration
 */
export interface DataTablePaginationConfig {
  autoFit?: boolean
  pageSize?: number
}

/**
 * Infinite scrolling configuration (unified for both regular and adaptive)
 */
export interface InfiniteScrollConfig {
  enabled?: boolean
  adaptive?: boolean // Whether to use adaptive infinite scrolling instead of regular
  loadThreshold?: number // Distance from viewport edge to trigger loading (in pixels)
  pageSize?: number // Number of items per page/load (defaults to STANDARD_PAGE_SIZE)
  increment?: number // Number of items to load when scrolling (defaults to INFINITE_SCROLL_INCREMENT)
  maxItems?: number // Maximum number of items to keep in memory for adaptive scrolling (defaults to pageSize * 3)
}

// ============================================================================
// COLUMN AND FIELD TYPES
// ============================================================================

/**
 * Header alignment options
 */
export type HeaderAlignment = 'left' | 'center' | 'right'

/**
 * Column override system for maximum flexibility
 */
export interface ColumnOverrides<TData = any> {
  [columnId: string]: {
    // Core properties
    visible?: boolean                           // Show/hide column
    header?: string | (() => React.ReactNode)  // Header content with full styling control
    cell?: (info: any) => React.ReactNode      // Cell content with full styling control
    headerAlignment?: HeaderAlignment          // Header text and sort icon alignment
    meta?: {                                    // Column-level styling (width, etc.)
      className?: string                        // Applied to both header and cells
      [key: string]: any
    }
  }
}

/**
 * Column visibility overrides
 */
export interface ColumnVisibilityOverrides {
  [columnId: string]: boolean
}

/**
 * Initial column visibility configuration used to set defaults on first render
 */
export interface InitialColumnVisibilityConfig {
  byId?: { [columnId: string]: boolean }
  hideAll?: boolean
}

/**
 * Field overrides for filtering and searching
 */
export interface FieldOverrides<TData = any> {
  [fieldId: string]: {
    filterable?: boolean
    searchable?: boolean
    label?: string
    displayName?: string
    type?: FilterDataType
    description?: string
    path?: string | ((item: TData) => any)
    aliases?: string[]
    preferredValues?: string[]
    defaultNumericValue?: number
    defaultOperator?: '>' | '<' | '>=' | '<=' | '=' | '!=' | '*' | '!*'
    isPercentage?: boolean
    suggestedValue?: string
    filterOnly?: boolean
    searchOnly?: boolean
  }
}

// ============================================================================
// ICON TYPES
// ============================================================================

/**
 * Icon component interface
 */
export interface IconProps {
  className?: string
  size?: number
  [key: string]: any
}

/**
 * Icon overrides interface
 */
export interface DataTableIcons {
  Loader?: React.ComponentType<IconProps>
  PaginationPrevious?: React.ComponentType<IconProps>
  PaginationNext?: React.ComponentType<IconProps>
  SortAscending?: React.ComponentType<IconProps>
  SortDescending?: React.ComponentType<IconProps>
  SortUnsorted?: React.ComponentType<IconProps>
  ExpandIcon?: React.ComponentType<IconProps>
  CollapseIcon?: React.ComponentType<IconProps>
  ClearFilters?: React.ComponentType<IconProps>
  Search?: React.ComponentType<IconProps>
  X?: React.ComponentType<IconProps>
  Filter?: React.ComponentType<IconProps>
  ColumnSettings?: React.ComponentType<IconProps>
}

// ============================================================================
// STORE TYPES
// ============================================================================

/**
 * Column width state with user resize tracking
 */
export interface ColumnWidthInfo {
  width: number
  isUserSet: boolean
}

/**
 * Column width state mapping
 */
export interface ColumnWidthState {
  [columnId: string]: ColumnWidthInfo
}

/**
 * Table state interface
 */
export interface TableState {
  sorting: any[]
  pagination: PaginationState
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
  columnWidths: ColumnWidthState
  // Selectors
  getState: () => Omit<TableState, 'getState' | 'resetTableState' | 'setSorting' | 'setPagination' | 'setColumnVisibility' | 'setColumnOrder' | 'setColumnWidth' | 'resetColumnWidth'>
  // Actions
  setSorting: (updaterOrValue: any) => void
  setPagination: (updaterOrValue: any) => void
  setColumnVisibility: (updaterOrValue: any) => void
  setColumnOrder: (updaterOrValue: any) => void
  setColumnWidth: (columnId: string, width: number) => void
  resetColumnWidth: (columnId: string) => void
  resetTableState: () => void
}

/**
 * Table store configuration
 */
export interface TableStoreConfig {
  name: string
  initialColumnVisibility?: Record<string, boolean>
  initialPageSize?: number
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic updater function type
 */
export type UpdaterFn<T> = (updaterOrValue: any) => void

/**
 * Row data with index for rendering
 */
export interface RowDataWithIndex<TData> {
  data: TData
  index: number
  isSelected: boolean
}

/**
 * Grid item rendering context
 */
export interface GridItemContext<TData> {
  row: TData
  index: number
  isSelected: boolean
  isExpanded: boolean
  onToggleExpand: (e: React.MouseEvent) => void
}

/**
 * Table cell rendering context
 */
export interface TableCellContext<TData> {
  row: TData
  column: ColumnDef<TData, any>
  value: any
  isSelected: boolean
}

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

/**
 * Row click event handler
 */
export type RowClickHandler<TData> = (row: TData, event?: React.MouseEvent) => void

/**
 * Row expansion event handler
 */
export type RowExpansionHandler<TData> = (row: TData, expanded: boolean) => void

/**
 * Search change event handler
 */
export type SearchChangeHandler = (value: string) => void

/**
 * Filter change event handler
 */
export type FilterChangeHandler = (filters: FilterField[]) => void

// ============================================================================
// RENDER FUNCTION TYPES
// ============================================================================

/**
 * Custom grid item renderer
 */
export type GridItemRenderer<TData> = (
  row: TData, 
  index: number, 
  isSelected: boolean
) => React.ReactNode

/**
 * Custom expanded content renderer
 */
export type ExpandedContentRenderer<TData> = (row: TData) => React.ReactNode

/**
 * Custom cell renderer
 */
export type CellRenderer<TData> = (context: TableCellContext<TData>) => React.ReactNode

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Selection state
 */
export interface SelectionState<TData> {
  selectedItem: TData | null
  setSelectedItem: (item: TData | null) => void
}

/**
 * Expansion state
 */
export interface ExpansionState {
  expandedRows: Record<string, boolean>
  setExpandedRows: (rows: Record<string, boolean>) => void
  toggleRow: (rowId: string) => void
}

/**
 * Search state
 */
export interface SearchState {
  searchValue: string
  setSearchValue: (value: string) => void
  clearSearch: () => void
}

/**
 * Filter state
 */
export interface FilterState {
  filters: FilterField[]
  setFilters: (filters: FilterField[]) => void
  clearFilters: () => void
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * DataTable state hook return type
 */
export interface DataTableStateHook<TData> {
  // Table state
  table: any
  data: TData[]
  filteredData: TData[]
  columns: ColumnDef<TData, any>[]
  columnVisibility: Record<string, boolean>
  
  // Pagination
  pagination: PaginationState
  isUsingPagination: boolean
  
  // Selection
  selectedItem: TData | null
  setSelectedItem: (item: TData | null) => void
  
  // Expansion
  expandedRows: Record<string, boolean>
  setExpandedRows: (rows: Record<string, boolean>) => void
  
  // Search and filters
  searchValue: string
  setSearchValue: (value: string) => void
  filters: FilterField[]
  setFilters: (filters: FilterField[]) => void
  
  // Actions
  clearSearch: () => void
  clearFilters: () => void
}

/**
 * DataTable interactions hook return type
 */
export interface DataTableInteractionsHook<TData> {
  // Keyboard navigation
  handleKeyDown: (event: React.KeyboardEvent) => void
  
  // Drag and drop
  dragState: DragState
  handleDragStart: (e: React.DragEvent, columnId: string) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleDragEnd: () => void
  
  // Column resizing
  resizeState: ResizeState
  handleResizeStart: (e: React.MouseEvent, columnId: string) => void
  handleResizeReset: (e: React.MouseEvent, columnId: string) => void
  
  // Row interactions
  handleRowClick: (row: TData) => void
  handleToggleExpand: (row: TData, e: React.MouseEvent) => void
  
  // Infinite scroll
  loadMoreItems: () => void
  isLoadingMore: boolean
}

/**
 * DataTable search hook return type
 */
export interface DataTableSearchHook {
  searchValue: string
  setSearchValue: (value: string) => void
  debouncedSetSearchValue: (value: string) => void
  clearSearch: () => void
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleClearSearch: () => void
  resetSearch: () => void
  handleClearFilters: () => void
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export related types from other files
  FilterField,
  FilterDataType,
  PartialTableStyles,
  ResizeTimingConfig,
  DragState,
  ResizeState,
  EffectiveIcons
} 