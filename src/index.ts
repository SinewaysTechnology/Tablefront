export { DataTable } from './DataTable'
export { SmartHeader } from './components/SmartHeader'
export { DataTableStates, LoadingState, EmptyState } from './components/DataTableStates'
export { DataTablePagination, PaginationInfo, PaginationControls } from './components/DataTablePagination'
export { DataTableHeader, ClearFiltersButton, SearchInput } from './components/DataTableHeader'
export { DataTableBody, TableRow, TableCell, ExpandButton } from './components/DataTableBody'
export { DataGrid, GridItem, GridField } from './components/DataGrid'
export { DataMasonry, MasonryItem, MasonryField } from './components/DataMasonry'
export { useInfiniteScrollManager } from './components/InfiniteScrollManager'

export { DefaultIcons, useDataTableIcons } from './icons'

export {
  applyColumnOverrides,
  applyColumnVisibilityOverrides,
  buildDefaultColumnVisibility,
  isColumnWidthLocked,
} from './ColumnEditor'

export { createDataTable, createAutoDataTable, createSimpleDataTable } from './stores/createDataTable'
export type { CreateDataTableConfig, DataTableSetup } from './stores/createDataTable'

export { FilterProcessor } from './filters'

export { useTableStyles } from './variants'
export type { TableStyles } from './variants'
export { defaultTableStyles, modernTableStyles, compactTableStyles, tableStylePresets, getTableStylePreset } from './defaultStyles'

export { 
  quickColumns,
  applySmartSizing
} from './columnBuilder'

export {
  autoGenerateFields,
  applyFieldOverrides,
  buildFields
} from './fieldBuilder'

export { cn } from './utils'
export { 
  generateStableStoreId, 
  getFirstField, 
  isValidId, 
  safeStringId, 
  safeEquals 
} from './utils/tableUtils'

export { DEFAULT_RESIZE_DOUBLE_CLICK_DELAY, DEFAULT_RESIZE_RESET_DEBOUNCE } from './constants/resize'

// Licensing — side-effect import is injected into dist entry (see tsup.config.ts).
// `tablefront activate` overwrites dist/license.globals.* with validated tokens.
export { useLicenseStatus } from './licensing'
export { LicenseEnforcer } from './components/LicenseEnforcer'

// Export all types from the centralized types file
export type {
  // Core component types
  SmartHeaderProps,
  DataTableUIComponents,
  DataTableProps,
  DataTableLayout,
  DataTablePaginationConfig,
  InfiniteScrollConfig,
  
  // Column and field types
  HeaderAlignment,
  ColumnOverrides,
  ColumnVisibilityOverrides,
  FieldOverrides,
  
  // Icon types
  IconProps,
  DataTableIcons,
  
  // Store types
  ColumnWidthInfo,
  ColumnWidthState,
  TableState,
  TableStoreConfig,
  UpdaterFn,
  
  // Utility types
  RowDataWithIndex,
  GridItemContext,
  TableCellContext,
  
  // Event handler types
  RowClickHandler,
  RowExpansionHandler,
  SearchChangeHandler,
  FilterChangeHandler,
  
  // Render function types
  GridItemRenderer,
  ExpandedContentRenderer,
  CellRenderer,
  
  // State management types
  SelectionState,
  ExpansionState,
  SearchState,
  FilterState,
  
  // Hook return types
  DataTableStateHook,
  DataTableInteractionsHook,
  DataTableSearchHook,
  
  // Re-exported types
  FilterField,
  FilterDataType,
  PartialTableStyles,
  ResizeTimingConfig,
  DragState,
  ResizeState,
  EffectiveIcons
} from './types/DataTableTypes' 
