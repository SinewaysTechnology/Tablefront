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
  /** Button component used throughout. @example ({ className, ...p }) => <button {...p} /> */
  Button?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Trigger for Filter popover. */
  FilterButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Trigger for Column Visibility popover. */
  ColumnButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Clear filters button. */
  ClearButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Clear search input button. */
  ClearSearchButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Pagination button component. */
  PaginationButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>> | React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>
  /** Button used for individual filter chips inside FilterPopover. */
  FilterItemButton?: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
  /** Scroll area wrapper used around table/grid. */
  ScrollArea?:
    | React.ComponentType<{ className?: string; children?: React.ReactNode }>
    | React.ForwardRefExoticComponent<
        { className?: string; children?: React.ReactNode } &
        React.RefAttributes<HTMLDivElement>
      >
  /** Popover root component. */
  Popover?: React.ComponentType<{ children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>
  /** Popover trigger wrapper. */
  PopoverTrigger?: React.ComponentType<{ children: React.ReactNode; asChild?: boolean }>
  /** Popover content wrapper. */
  PopoverContent?: React.ComponentType<{ children: React.ReactNode; className?: string; align?: 'center' | 'start' | 'end'; sideOffset?: number }>
  /** Tooltip root component. */
  Tooltip?: React.ComponentType<{ children: React.ReactNode }>
  /** Tooltip trigger wrapper. */
  TooltipTrigger?: React.ComponentType<{ children: React.ReactNode; asChild?: boolean }>
  /** Tooltip content wrapper. */
  TooltipContent?: React.ComponentType<{ children: React.ReactNode; className?: string }>
  /** Switch control used in visibility popover. */
  Switch?: React.ComponentType<{ checked?: boolean; onCheckedChange?: (checked: boolean) => void; className?: string; id?: string }>
  /** Label component used in settings. */
  Label?: React.ComponentType<{ children?: React.ReactNode; htmlFor?: string; className?: string }>
  /** Separator line used in settings. */
  Separator?: React.ComponentType<{ className?: string }>
  /** Fallback icon used for settings trigger. */
  Settings02Icon?: React.ComponentType<{ className?: string }>
}

/**
 * Main DataTable component props
 */
export interface DataTableProps<TData> {
  // Core data and configuration
  /**
   * The array of data objects to render.
   * @example
   * const rows = [{ id: 1, name: 'Alice' }];
   * <DataTable data={rows} />
   */
  data: TData[]
  /**
   * Column definitions compatible with @tanstack/react-table.
   * If omitted, columns can be auto-generated upstream.
   * @example
   * const columns = [{ accessorKey: 'name', header: 'Name' }];
   */
  columns?: ColumnDef<TData, any>[]
  /**
   * Override visibility, header, cell, alignment, and meta per column id.
   * @default {}
   * @example
   * { name: { header: 'Full name', headerAlignment: 'center' } }
   */
  columnOverrides?: ColumnOverrides<TData>
  /**
   * Initial column visibility applied on first use only.
   * - byId: map of columnId => boolean (true show, false hide)
   * - hideAll: if true, hide all by default (byId can override)
   * @example
   * { byId: { name: true, internal: false }, hideAll: false }
   */
  initialColumnVisibility?: InitialColumnVisibilityConfig
  /**
   * Field-level overrides for filtering/searching metadata.
   * @example
   * { amount: { type: 'number', label: 'Amount ($)' } }
   */
  fieldOverrides?: FieldOverrides<TData>
  /**
   * Partial style tokens merged into the active variant.
   */
  customStyles?: PartialTableStyles
  /**
   * Swap any internal UI piece (buttons, popovers, etc.).
   * @default {}
   */
  uiComponents?: DataTableUIComponents
  /**
   * Legacy alias for uiComponents. If provided, overrides take precedence over uiComponents.
   */
  customUIComponents?: DataTableUIComponents
  /**
   * Replace built-in icons with your own set.
   */
  icons?: DataTableIcons
  /**
   * Optional stable id to isolate table state in the store.
   * @example
   * storeId="users-table"
   */
  storeId?: string

  // Row interaction
  /**
   * Row click handler. If omitted, selection is managed internally.
   * @example
   * onRowClick={(row) => setActive(row)}
   */
  onRowClick?: (row: TData) => void
  /**
   * Control the selected row externally.
   * @default null
   */
  selectedRow?: TData | null
  /**
   * When true, arrow-key navigation will promote highlight to selection.
   * @default true
   */
  autoSelect?: boolean

  // Expandable functionality
  /**
   * Enable expand/collapse per row.
   * @default false
   */
  expandable?: boolean
  /**
   * Controlled expansion state by row id.
   * @default {}
   */
  expandedRows?: Record<string, boolean>
  /**
   * Called when a row should toggle expansion (controlled mode).
   */
  onToggleExpand?: (row: TData) => void
  /**
   * Notifies parent with the new expanded rows map.
   */
  onExpansionChange?: (expandedRows: Record<string, boolean>) => void
  /**
   * Render content below a row when expanded.
   * @example
   * renderExpandedContent={(row) => <Details row={row} />}
   */
  renderExpandedContent?: (row: TData) => React.ReactNode
  /**
   * Clamp expanded content width to the scroll container in table mode.
   * @default true
   */
  clampExpandedContentToContainer?: boolean
  /**
   * Clamp custom static rows to the scroll container width.
   * @default true
   */
  clampStaticRowsToContainer?: boolean

  // Custom rendering
  /**
   * Custom element rendered at the right of the header row.
   */
  headerRightElement?: React.ReactNode
  /**
   * Custom renderer for grid/masonry items.
   */
  customRenderGridItem?: (row: TData, index: number, isSelected: boolean) => React.ReactNode
  /**
   * Extra rows rendered at the top of the tbody.
   * @default []
   */
  customStaticRows?: React.ReactNode[]
  /**
   * When true, custom static rows stick below the header.
   * @default true
   */
  customStaticRowsSticky?: boolean

  // Text and labels
  /**
   * Placeholder text for the search input.
   * @default "Search..."
   */
  searchPlaceholder?: string
  /**
   * Idle time before search commits to filters / `onQueryChange`.
   * Defaults to 250ms client-side and 400ms in server mode.
   * Enter and blur flush immediately.
   */
  searchDebounceMs?: number
  /**
   * Text displayed when there are no rows to show.
   * @default "No items found"
   */
  emptyStateText?: string
  /**
   * Loading indicator text.
   * @default "Loading..."
   */
  loadingText?: string
  /**
   * Optional UI copy overrides (i18n-friendly).
   * @example { result: 'Resultaat', results: 'Resultaten' }
   */
  labels?: {
    /** Singular result-count label. @default "Result" */
    result?: string
    /** Plural result-count label. @default "Results" */
    results?: string
    /** Joiner in server-mode range copy (`1–50 of 40014`). @default "of" */
    of?: string
    /** Column settings reset button. @default "Reset to defaults" */
    resetToDefaults?: string
  }
  /**
   * Server-side search, sort, and paging.
   * When set (and `enabled` is not false), Tablefront does not filter, sort, or
   * page `data` locally. With `paginationConfig`, `data` is the current page.
   * With `infiniteScrollConfig.enabled`, `data` is all loaded rows (parent appends
   * as `pageIndex` grows) and `total` is the match count.
   */
  server?: DataTableServerConfig
  /**
   * Global loading state for the table.
   * @default false
   */
  isLoading?: boolean

  // Layout configuration
  /**
   * Visual layout and feature toggles for header/search/visibility, etc.
   * See `DataTableLayout` for per-field defaults.
   * @default {}
   * @example
   * { displayMode: 'grid', showSearchBar: false }
   */
  layout?: DataTableLayout
  /**
   * Enable pagination and configure page size.
   * If omitted, the table uses infinite or full rendering.
   * @example
   * { pageSize: 50 }
   */
  paginationConfig?: DataTablePaginationConfig
  /**
   * Configure infinite scrolling and/or real row virtualization.
   * Omit `pageSize` / `increment` / `maxItems` to render the full list.
   * @example
   * { enabled: true, virtualized: true }
   * { enabled: true, virtualized: true, pageSize: 50, increment: 25, maxItems: 150 }
   */
  infiniteScrollConfig?: InfiniteScrollConfig

  // Feature toggles
  /**
   * Allow dragging column headers to reorder.
   * @default true
   */
  enableColumnDrag?: boolean
  /**
   * Allow resizing columns by dragging header edges.
   * @default true
   */
  enableColumnResize?: boolean
  /**
   * Timing config for resize interactions.
   * @default { doubleClickDelay: 150, resetDebounce: 50 }
   */
  resizeTimingConfig?: ResizeTimingConfig
}

// ============================================================================
// LAYOUT AND CONFIGURATION TYPES
// ============================================================================

/**
 * Layout configuration for the DataTable
 */
export interface DataTableLayout {
  /** Show the search input above the table. @default true */
  showSearchBar?: boolean
  /** Show the header area (search, settings, etc.). @default true */
  showHeader?: boolean
  /** Show the table header row (column labels). @default true */
  showTableHeaders?: boolean
  /** Show the column visibility/settings control. @default true */
  showColumnVisibility?: boolean
  /** Show the filters button. @default true */
  showFilterButton?: boolean
  /** Show a reset-to-defaults button inside column settings. @default true */
  showResetTableButtonInSettings?: boolean
  /** Rendering mode. @default 'table' */
  displayMode?: 'table' | 'grid' | 'masonry'
  /**
   * If > 0, render exactly this many grid columns.
   * If 0/undefined, use responsive auto-fit with gridItemMinWidth.
   */
  gridColumns?: number
  /** Minimum grid item width for responsive auto-fit. @default 250 */
  gridItemMinWidth?: number
  /** If > 0, render exactly this many masonry columns. */
  masonryColumns?: number
  /** Minimum masonry item width for responsive auto-fit. @default 300 */
  masonryItemMinWidth?: number
  /** Gap between items in pixels. @default 16 */
  masonryGap?: number
}

/**
 * Query Tablefront emits when `server` mode is on.
 * Map this to your API (`q`, `sort`, `order`, `limit`, `offset`).
 */
export interface DataTableServerQuery {
  /** Free-text search, including structured filter tokens if the user typed them. */
  q: string
  /** Sorted column id, or null when the user has not chosen a column. */
  sort: string | null
  order: 'asc' | 'desc'
  pageIndex: number
  pageSize: number
}

/**
 * Opt into server-side querying. Omit (or `enabled: false`) for the default
 * client-side search/sort/pagination over the full `data` array.
 *
 * Pair with `paginationConfig` for a pager, or `infiniteScrollConfig.enabled`
 * to load the next page when the user scrolls (parent must append rows).
 */
export interface DataTableServerConfig {
  /** @default true when the `server` prop is passed */
  enabled?: boolean
  /** Total matching rows on the server (not `data.length`). */
  total: number
  /**
   * True while a server page is in flight. Blocks the next infinite-scroll
   * request and shows the load-more indicator after the first page.
   */
  isFetching?: boolean
  /** Called when search, sort, or page changes. Parent should fetch `data`. */
  onQueryChange: (query: DataTableServerQuery) => void
  /**
   * Override search idle debounce in server mode.
   * Falls back to `DataTable` `searchDebounceMs`, then 400ms.
   */
  searchDebounceMs?: number
}

export interface DataTablePaginationConfig {
  /**
   * Whether to auto-fit page size to the viewport.
   * (Behavior depends on the consuming UI.)
   */
  autoFit?: boolean
  /**
   * Items per page. If omitted, falls back to infiniteScrollConfig.pageSize or STANDARD_PAGE_SIZE (25).
   * @default 25
   */
  pageSize?: number
}

/**
 * Infinite scrolling / virtualization configuration
 */
export interface InfiniteScrollConfig {
  /** Enable infinite scrolling. @default false */
  enabled?: boolean
  /**
   * Real row virtualization via TanStack Virtual (only visible rows in the DOM).
   * Does **not** change scroll height by itself — combine with growing `pageSize`
   * (default) or `maxItems` windowing for a usable scrollbar thumb.
   * Masonry ignores this (no row virtualization).
   * @default false (also auto-enabled when `enabled` is true for table/grid)
   */
  virtualized?: boolean
  /**
   * @deprecated Use `virtualized`. Kept as an alias for backwards compatibility.
   */
  adaptive?: boolean
  /**
   * Show the entire sorted/filtered list at once (no progressive page growth).
   * Scroll height reflects the full dataset (thumb gets small on large lists).
   * Prefer `maxItems` or growing infinite scroll (`pageSize` / `increment`) for a nicer scrollbar.
   *
   * When omitted: defaults to **true** if `pageSize`, `increment`, and `maxItems` are all unset
   * (so `{ enabled: true }` loads everything). Set `fullList: false` to force growing pageSize
   * with the standard default of 25.
   */
  fullList?: boolean
  /** Distance from viewport edge to trigger load (px). @default 100 */
  loadThreshold?: number
  /**
   * Initial items for growing infinite scroll.
   * Setting this (or `increment` / `maxItems`) opts into progressive loading instead of the full list.
   * @default 25 when progressive loading is active
   */
  pageSize?: number
  /**
   * Items to add per scroll step (growing mode).
   * Setting this opts into progressive loading.
   * @default 25 when progressive loading is active
   */
  increment?: number
  /**
   * Cap how many rows contribute to scroll height (sliding window).
   * Keeps the scrollbar thumb usable while still scrolling through the full list.
   * Setting this opts into progressive/windowed loading. Ignored when `fullList` is true.
   */
  maxItems?: number
  /** Estimated row/item height in px for the virtualizer. @default 40 */
  estimateSize?: number
  /** Extra rows rendered outside the viewport. @default 8 */
  overscan?: number
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
    /** Show or hide the column. @default true */
    visible?: boolean                           // Show/hide column
    /** Header content (string or render function). */
    header?: string | (() => React.ReactNode)  // Header content with full styling control
    /** Cell renderer for full control. */
    cell?: (info: any) => React.ReactNode      // Cell content with full styling control
    /** Header text and sort icon alignment. @default 'left' */
    headerAlignment?: HeaderAlignment          // Header text and sort icon alignment
    /**
     * Lock column width — no resize handle; user/store widths are ignored.
     * Use with `width` or `meta.style` width values.
     * @default false
     */
    lockWidth?: boolean
    /** Fixed width in px (number) or any CSS length string. */
    width?: number | string
    /** Column-level styling (width, classes, etc.). @default {} */
    meta?: {                                    // Column-level styling (width, etc.)
      /** Class applied to header and cells. */
      className?: string                        // Applied to both header and cells
      /** Same as top-level `lockWidth` when set on meta. */
      lockWidth?: boolean
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
  /** Map of columnId => visibility (true show, false hide). @default {} */
  byId?: { [columnId: string]: boolean }
  /** Hide all columns by default (byId can opt-in). @default false */
  hideAll?: boolean
}

/**
 * Field overrides for filtering and searching
 */
export interface FieldOverrides<TData = any> {
  [fieldId: string]: {
    /** Enable as a filter field. @default true (if auto-generated) */
    filterable?: boolean
    /** Enable as a search field. @default true (if auto-generated) */
    searchable?: boolean
    /** Short label used in UI. */
    label?: string
    /** Friendly display name shown to users. */
    displayName?: string
    /** Data type guiding filter/search behavior. @example 'number' */
    type?: FilterDataType
    /** Help text shown in tooltips/docs. */
    description?: string
    /** Custom accessor path or resolver. @example (row) => row.profile.name */
    path?: string | ((item: TData) => any)
    /** Alternate field names to search. @example ['full_name','name'] */
    aliases?: string[]
    /** Preferred categorical values to suggest. */
    preferredValues?: string[]
    /** Default numeric value for comparison filters. */
    defaultNumericValue?: number
    /** Default operator for numeric/date filters. @example '>=' */
    defaultOperator?: '>' | '<' | '>=' | '<=' | '=' | '!=' | '*' | '!*'
    /** Whether numeric values are percentages. */
    isPercentage?: boolean
    /** Suggested free-text value for search. */
    suggestedValue?: string
    /** Include only in filters, exclude from search. @default false */
    filterOnly?: boolean
    /** Include only in search, exclude from filters. @default false */
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
  /** Loading spinner for states. */
  Loader?: React.ComponentType<IconProps>
  /** Prev page icon. */
  PaginationPrevious?: React.ComponentType<IconProps>
  /** Next page icon. */
  PaginationNext?: React.ComponentType<IconProps>
  /** Sort ascending indicator. */
  SortAscending?: React.ComponentType<IconProps>
  /** Sort descending indicator. */
  SortDescending?: React.ComponentType<IconProps>
  /** Unsorted indicator. */
  SortUnsorted?: React.ComponentType<IconProps>
  /** Expand row icon. */
  ExpandIcon?: React.ComponentType<IconProps>
  /** Collapse row icon. */
  CollapseIcon?: React.ComponentType<IconProps>
  /** Clear filters icon. */
  ClearFilters?: React.ComponentType<IconProps>
  /** Search icon. */
  Search?: React.ComponentType<IconProps>
  /** Small X/close icon. */
  X?: React.ComponentType<IconProps>
  /** Filters popover trigger icon. */
  Filter?: React.ComponentType<IconProps>
  /** Column settings trigger icon. */
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
  getState: () => Omit<
    TableState,
    | 'getState'
    | 'resetTableState'
    | 'resetToDefaults'
    | 'setSorting'
    | 'setPagination'
    | 'setColumnVisibility'
    | 'setColumnOrder'
    | 'setColumnWidth'
    | 'setColumnWidths'
    | 'resetColumnWidth'
  >
  // Actions
  setSorting: (updaterOrValue: any) => void
  setPagination: (updaterOrValue: any) => void
  setColumnVisibility: (updaterOrValue: any) => void
  setColumnOrder: (updaterOrValue: any) => void
  setColumnWidth: (columnId: string, width: number) => void
  setColumnWidths: (widths: Record<string, number>) => void
  resetColumnWidth: (columnId: string, pinWidths?: Record<string, number>) => void
  resetTableState: () => void
  resetToDefaults: (defaultColumnVisibility: Record<string, boolean>) => void
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
  searchInputRef: React.RefObject<HTMLInputElement | null>
  handleSearchCommit: (value: string) => void
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleClearSearch: () => void
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
