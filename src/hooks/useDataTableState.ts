import { useMemo, useState, useRef, useEffect } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, Row } from '@tanstack/react-table'
import { ColumnDef } from '@tanstack/react-table'
import { createEntityTableStore } from '../stores/createTableStore'
import { createSelectionHook } from '../stores/createEntityStore'
import { createEntityFilterStore } from '../stores/createFilterStore'
import { buildFields } from '../fieldBuilder'
import { quickColumns, applySmartSizing } from '../columnBuilder'
import { applyColumnOverrides, applyColumnVisibilityOverrides } from '../ColumnEditor'
import { generateStableStoreId, getFirstField } from '../utils/tableUtils'
import { STANDARD_PAGE_SIZE } from '../constants/pagination'
import type { 
  DataTableProps,
  ResizeState
} from '../types/DataTableTypes'
import { createResizeState } from '../utils'
import type { InitialColumnVisibilityConfig } from '../types/DataTableTypes'

/**
 * Main state management hook for DataTable
 */
export function useDataTableState<TData>({
  data,
  columns,
  columnOverrides = {},
  initialColumnVisibility,
  fieldOverrides,
  storeId,
  selectedRow,
  onRowClick: onRowClickProp,
  autoSelect = true,
  layout = {},
  paginationConfig,
  infiniteScrollConfig,
  enableColumnDrag = true,
  enableColumnResize = true,
  customStaticRows = [],
  customStaticRowsSticky = true,
}: Pick<DataTableProps<TData>, 
  | 'data'
  | 'columns'
  | 'columnOverrides'
  | 'fieldOverrides'
  | 'initialColumnVisibility'
  | 'storeId'
  | 'selectedRow'
  | 'onRowClick'
  | 'autoSelect'
  | 'layout'
  | 'paginationConfig'
  | 'infiniteScrollConfig'
  | 'enableColumnDrag'
  | 'enableColumnResize'
  | 'customStaticRows'
  | 'customStaticRowsSticky'
>) {
  // ============================================================================
  // CORE IDENTIFIERS AND STORES
  // ============================================================================
  
  const idField = useMemo(() => {
    const firstField = getFirstField(data)
    return firstField || ('id' as keyof TData)
  }, [data]) as keyof TData

  const stableStoreId = useMemo(() => 
    generateStableStoreId(storeId, String(idField)), 
    [storeId, idField]
  )
  
  // ============================================================================
  // PAGINATION STATE
  // ============================================================================
  
  const isUsingPagination = !!paginationConfig
  const effectivePageSize = paginationConfig?.pageSize ?? infiniteScrollConfig?.pageSize ?? STANDARD_PAGE_SIZE
  
  const tableStore = useMemo(() => 
    createEntityTableStore(stableStoreId, { 
      initialPageSize: effectivePageSize
    }), 
    [stableStoreId, effectivePageSize]
  )
  
  const useSelection = useMemo(() => 
    createSelectionHook<TData>(stableStoreId, String(idField)), 
    [stableStoreId, idField]
  )

  // ============================================================================
  // SELECTION STATE
  // ============================================================================
  
  const { selectedItem: internalSelectedItem, setSelectedItem: setInternalSelectedItem } = useSelection()
  const effectiveSelectedItem = selectedRow !== undefined ? selectedRow : internalSelectedItem
  const onRowClick = onRowClickProp || ((row: TData) => setInternalSelectedItem(row))
  
  const {
    sorting,
    pagination,
    columnVisibility: rawColumnVisibility,
    columnOrder,
    columnWidths,
    setSorting,
    setPagination,
    setColumnVisibility,
    setColumnOrder,
    setColumnWidth,
    resetColumnWidth
  } = tableStore()

  // ============================================================================
  // LAYOUT STATE
  // ============================================================================
  
  const showHeader = layout.showHeader ?? true
  const showTableHeaders = layout.showTableHeaders ?? true 
  const showSearchBar = layout.showSearchBar ?? true
  const showColumnVisibility = layout.showColumnVisibility ?? true
  const showFilterButton = layout.showFilterButton ?? true
  const displayMode = layout.displayMode ?? 'table'
  const gridColumns = layout.gridColumns
  const gridItemMinWidth = layout.gridItemMinWidth ?? 250
  const masonryColumns = layout.masonryColumns
  const masonryItemMinWidth = layout.masonryItemMinWidth ?? 300
  const masonryGap = layout.masonryGap ?? 16

  // ============================================================================
  // FILTER AND SEARCH STATE
  // ============================================================================
  
  // Stabilize field overrides to prevent unnecessary re-renders
  const stableFieldOverrides = useMemo(() => fieldOverrides, [JSON.stringify(fieldOverrides)])

  const filterStore = useMemo(() => {
    const hasData = data.length > 0
    
    if (!hasData) {
      return createEntityFilterStore(`${stableStoreId}-empty`, [], [])
    }
    
    const effectiveFieldOverrides = stableFieldOverrides || {}
    
    const { filters: autoFilters, searches: autoSearches } = buildFields(
      data, 
      effectiveFieldOverrides, 
      { idField }
    )
    
    return createEntityFilterStore(`${stableStoreId}-filters`, autoFilters, autoSearches)
  }, [stableFieldOverrides, data.length, idField, stableStoreId])

  const {
    filters,
    clearFilters,
    searchValue: storeSearchValue,
    setSearchValue: setStoreSearchValue,
    filterProcessor
  } = filterStore()

  // ============================================================================
  // COLUMN STATE
  // ============================================================================
  
  const effectiveColumns = useMemo(() => {
    let baseColumns: ColumnDef<TData, any>[] = []
    
    if (columns && columns.length > 0) {
      baseColumns = columns
    } else if (data.length > 0) {
      baseColumns = quickColumns(data, { idField })
    }
    
    const columnsWithOverrides = applyColumnOverrides(baseColumns, columnOverrides)
    
    const visibleColumns = columnsWithOverrides.filter(col => {
      const columnId = col.id || String(((col as { accessorKey?: string })?.accessorKey) || '')
      const override = columnOverrides[columnId]
      return !(override && override.visible === false)
    })

    // Apply smart sizing first, then override with manual resize widths
    let result = applySmartSizing(visibleColumns, data)
    
    // Apply stored user-resized column widths
    if (enableColumnResize) {
      result = result.map(col => {
        const columnId = col.id || String(((col as { accessorKey?: string })?.accessorKey) || '')
        const columnWidthInfo = columnWidths[columnId]
        const existingMeta = (col.meta as { style?: React.CSSProperties } | undefined) || {}
        
        // Check if column has been manually resized with valid width
        const isManuallyResized = columnWidthInfo?.isUserSet && 
                                 typeof columnWidthInfo.width === 'number' && 
                                 columnWidthInfo.width > 0 &&
                                 Number.isFinite(columnWidthInfo.width)
        
        if (isManuallyResized) {
          // Apply manual width
          return {
            ...col,
            size: columnWidthInfo.width,
            meta: {
              ...existingMeta,
              isManuallyResized: true,
              style: {
                ...existingMeta.style,
                width: `${columnWidthInfo.width}px`,
                minWidth: `${columnWidthInfo.width}px`,
                maxWidth: `${columnWidthInfo.width}px`
              }
            }
          } as ColumnDef<TData, any>
        } else {
          // Use automatic sizing - remove any existing size override
          const { size, ...colWithoutSize } = col
          return {
            ...colWithoutSize,
            meta: {
              ...existingMeta,
              isManuallyResized: false,
              style: existingMeta.style
            }
          } as ColumnDef<TData, any>
        }
      })
    }
    
    return result
  }, [columns, data, idField, columnOverrides, enableColumnResize, columnWidths])

  const columnVisibility = useMemo(() => {
    // Start from scratch when there's no persisted visibility
    if (Object.keys(rawColumnVisibility).length === 0) {
      const next: Record<string, boolean> = {}

      const byId = initialColumnVisibility?.byId || {}
      const hideAll = initialColumnVisibility?.hideAll === true

      if (hideAll) {
        // Hide all columns first
        effectiveColumns.forEach(col => {
          const colId = col.id || String(((col as { accessorKey?: string })?.accessorKey) || '')
          if (colId) next[colId] = false
        })
      }

      // Overlay explicit byId entries
      Object.keys(byId).forEach(id => {
        next[id] = byId[id]
      })

      // Apply true-only overrides (but do not force-show hidden ones unless asked)
      Object.keys(columnOverrides).forEach(columnId => {
        const override = columnOverrides[columnId]
        if (override && override.visible !== undefined && override.visible !== false) {
          if (next[columnId] === undefined) {
            next[columnId] = override.visible
          }
        }
      })

      return applyColumnVisibilityOverrides(next, effectiveColumns, {})
    }

    // If we have persisted visibility, continue using it with safeguards
    const persisted = { ...rawColumnVisibility }
    return applyColumnVisibilityOverrides(persisted, effectiveColumns, {})
  }, [rawColumnVisibility, effectiveColumns, JSON.stringify(columnOverrides), JSON.stringify(initialColumnVisibility)])

  // (removed effect-based initialization to keep logic simple and render-synchronous)

  // ============================================================================
  // DATA PROCESSING STATE
  // ============================================================================
  
  // Memoize search fields to avoid repeated calls
  const searchFields = useMemo(() => {
    return filterProcessor?.getSearchFields() || []
  }, [filterProcessor])
  
  // Memoize search value for performance
  const memoizedSearchValue = useMemo(() => storeSearchValue, [storeSearchValue])
  
  // Apply search and filters to data
  // Performance optimizations:
  // - Memoized search fields to avoid repeated calls
  // - Memoized search value to prevent unnecessary recalculations
  // - Optimized plain text search with for loops instead of Array.some()
  // - Early return for empty search terms
  // - Pre-computed search term length for better loop performance
  const filteredData = useMemo(() => {
    if (!data.length || !filterProcessor) return data
    
    let result = data
    
    // Handle search with filter syntax (e.g., "field:value") or plain text search
    if (memoizedSearchValue && filterProcessor) {
      if (memoizedSearchValue.includes(':')) {
        const extractedFilters = filterProcessor.extractFilters(memoizedSearchValue)
        if (extractedFilters.length > 0) {
          result = filterProcessor.applyFilters(result, extractedFilters)
        }
      } else {
        // Optimized plain text search - pre-compute search term once
        const searchLower = memoizedSearchValue.toLowerCase()
        const searchFieldsLength = searchFields.length
        
        // Early return for empty search
        if (!searchLower) return result
        
        result = result.filter((item: any) => {
          // Use for loop instead of some() for better performance
          for (let i = 0; i < searchFieldsLength; i++) {
            const field = searchFields[i]
            const value = String(item[field.id] || '').toLowerCase()
            if (value.includes(searchLower)) {
              return true
            }
          }
          return false
        })
      }
    }
    
    // Apply additional filters
    if (filters.length > 0 && filterProcessor) {
      result = filterProcessor.applyFilters(result, filters)
    }
    
    return result
  }, [data, filters, memoizedSearchValue, filterProcessor, searchFields])

  // All rows are normal rows now (custom static rows are handled separately)
  const normalRows = filteredData

  // ============================================================================
  // TABLE INSTANCE
  // ============================================================================
  
  // Determine the effective column order based on drag-and-drop feature
  const effectiveColumnOrder = useMemo(() => {
    if (enableColumnDrag) {
      // Use the stored column order when drag-and-drop is enabled
      return columnOrder
    } else {
      // Use the original column order from column definitions when drag-and-drop is disabled
      return effectiveColumns.map(col => col.id || String(((col as { accessorKey?: string })?.accessorKey) || ''))
    }
  }, [enableColumnDrag, columnOrder, effectiveColumns])

  const table = useReactTable({
    data: normalRows,
    columns: effectiveColumns,
    state: {
      sorting,
      pagination: isUsingPagination 
        ? {
            pageIndex: pagination.pageIndex || 0,
            pageSize: effectivePageSize
          }
        : {
            ...pagination,
            pageSize: pagination.pageSize || STANDARD_PAGE_SIZE
          },
      columnVisibility,
      columnOrder: effectiveColumnOrder,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: enableColumnDrag ? setColumnOrder : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: row => String(row[idField]),
    debugTable: false,
  })

  const { rows } = table.getPaginationRowModel()

  const displayRows = useMemo(() => {
    return rows.map((row: Row<TData>) => row.original)
  }, [rows])

  // ============================================================================
  // RESIZE STATE
  // ============================================================================
  
  const [resizeState, setResizeState] = useState<ResizeState>(createResizeState())
  const [resetInProgress, setResetInProgress] = useState(false)
  const resizeEndTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [tableRefreshKey, setTableRefreshKey] = useState(0)

  // ============================================================================
  // AUTO-SELECTION LOGIC
  // ============================================================================
  
  const manualSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [recentManualSelection, setRecentManualSelection] = useState(false)

  useEffect(() => {
    if (!autoSelect) return
    if (!onRowClick) return
    if (recentManualSelection) return
    
    const hasActiveSearch = filterProcessor && storeSearchValue && storeSearchValue.trim() !== ''
    const hasActiveFilters = filterProcessor && filters?.length > 0
    if (!hasActiveSearch && !hasActiveFilters) return
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) return
    
    const frameId = requestAnimationFrame(() => {
      const allFilteredRows = table.getFilteredRowModel().rows
      
      if (allFilteredRows.length === 0) {
        if (effectiveSelectedItem) onRowClick(null as unknown as TData)
        return
      }
      
      if (effectiveSelectedItem) {
        const isSelectionInResults = allFilteredRows.some(
          row => String(row.original[idField]) === String(effectiveSelectedItem[idField])
        )
        
        if (isSelectionInResults) return
        onRowClick(allFilteredRows[0].original)
        return
      }
      
      onRowClick(allFilteredRows[0].original)
    })
    
    return () => cancelAnimationFrame(frameId)
  }, [
    autoSelect,
    onRowClick,
    tableStore,
    effectiveSelectedItem,
    idField,
    recentManualSelection,
    table.getFilteredRowModel().rows.length,
    ...(filterProcessor ? [filters?.length, storeSearchValue] : [])
  ])

  useEffect(() => {
    return () => {
      if (manualSelectionTimeoutRef.current) {
        clearTimeout(manualSelectionTimeoutRef.current)
        manualSelectionTimeoutRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (resizeEndTimeoutRef.current) {
        clearTimeout(resizeEndTimeoutRef.current)
        resizeEndTimeoutRef.current = null
      }
    }
  }, [])

  // ============================================================================
  // RETURN STATE
  // ============================================================================
  
  return {
    // Core identifiers
    idField,
    stableStoreId,
    
    // Selection
    effectiveSelectedItem,
    onRowClick,
    manualSelectionTimeoutRef,
    recentManualSelection,
    setRecentManualSelection,
    
    // Pagination
    isUsingPagination,
    effectivePageSize,
    pagination,
    
    // Layout
    showHeader,
    showTableHeaders,
    showSearchBar,
    showColumnVisibility,
    showFilterButton,
    displayMode,
    gridColumns,
    gridItemMinWidth,
    masonryColumns,
    masonryItemMinWidth,
    masonryGap,
    
    // Filters and search
    filterStore,
    filters,
    clearFilters,
    storeSearchValue,
    setStoreSearchValue,
    filterProcessor,
    
    // Columns
    effectiveColumns,
    columnVisibility,
    columnWidths,
    columnOrder,
    setColumnWidth,
    resetColumnWidth,
    
    // Data
    filteredData,
    normalRows,
    displayRows,
    
    // Table instance
    table,
    
    // Resize
    resizeState,
    setResizeState,
    resetInProgress,
    setResetInProgress,
    resizeEndTimeoutRef,
    tableRefreshKey,
    setTableRefreshKey,
    
    // Store actions
    setSorting,
    setPagination,
    setColumnVisibility,
    setColumnOrder,
  }
} 