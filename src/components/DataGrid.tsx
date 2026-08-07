"use client"

import React, { useCallback, useRef, useEffect, useState } from 'react'
import { flexRender } from '@tanstack/react-table'
import { cn } from '../utils'
import type { DataTableIcons } from '../types/DataTableTypes'
import { useDataTableVirtualizer } from '../hooks/useDataTableVirtualizer'

/**
 * Props for the DataGrid component
 */
export interface DataGridProps<TData> {
  // Data and display
  displayRows: TData[]
  displayMode: 'grid'
  idField: keyof TData
  
  // Grid configuration
  gridColumns?: number // If > 0, shows exactly this many columns. If 0 or undefined, uses responsive auto-fit with gridItemMinWidth
  gridItemMinWidth: number
  
  // Row selection
  selectedId: any
  highlightedId?: any
  onRowClick: (row: TData) => void
  
  // Expandable functionality
  expandable: boolean
  isRowExpanded: (row: TData) => boolean
  onToggleExpand: (row: TData, e: React.MouseEvent) => void
  renderExpandedContent?: (row: TData) => React.ReactNode
  
  // Column configuration
  effectiveColumns: any[]
  columnOverrides: any
  columnVisibility: any
  table: any
  
  // Custom rendering
  customRenderGridItem?: (row: TData, index: number, isSelected: boolean) => React.ReactNode
  customStaticRows?: React.ReactNode[]
  customStaticRowsSticky?: boolean
  
  // Infinite scroll / virtualization
  isLoadingMore: boolean
  isLoadingLess?: boolean
  shouldEnableInfiniteScroll: boolean
  isVirtualized?: boolean
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>
  estimateSize?: number
  overscan?: number
  
  // Styling
  tableStyles: {
    grid: {
      container: string
      item: string
      itemHover: string
      itemSelected: string
      itemContent: string
      expandButton: string
      itemFields: string
      field: string
      fieldLabel: string
      fieldValue: string
      expandedContent: string
    }
  }
  
  // Icons
  icons: DataTableIcons
}

/**
 * DataGrid - Handles grid layout rendering and grid item management
 */
export function DataGrid<TData>({
  displayRows,
  displayMode,
  idField,
  gridColumns,
  gridItemMinWidth,
  selectedId,
  highlightedId,
  onRowClick,
  expandable,
  isRowExpanded,
  onToggleExpand,
  renderExpandedContent,
  effectiveColumns,
  columnOverrides,
  columnVisibility,
  table,
  customRenderGridItem,
  customStaticRows = [],
  customStaticRowsSticky = true,
  isLoadingMore,
  isLoadingLess,
  shouldEnableInfiniteScroll,
  isVirtualized = false,
  scrollAreaRef,
  estimateSize = 160,
  overscan = 6,
  tableStyles,
  icons
}: DataGridProps<TData>) {
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const staticRef = useRef<HTMLDivElement>(null)
  const [staticHeight, setStaticHeight] = useState<number>(0)
  const [computedColumns, setComputedColumns] = useState<number>(1)
  const fallbackScrollRef = useRef<HTMLDivElement | null>(null)
  const effectiveScrollRef = scrollAreaRef ?? fallbackScrollRef

  useEffect(() => {
    const measure = () => {
      if (!staticRef.current) return
      setStaticHeight(staticRef.current.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (staticRef.current) ro.observe(staticRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  
  const handleRowClick = useCallback((row: TData) => {
    onRowClick(row)
  }, [onRowClick])

  const handleToggleExpand = useCallback((row: TData, e: React.MouseEvent) => {
    onToggleExpand(row, e)
  }, [onToggleExpand])

  const getVirtualItemKey = useCallback(
    (index: number) => {
      const row = displayRows[index]
      if (!row) return index
      return String(row[idField])
    },
    [displayRows, idField],
  )

  const gridVirtualizer = useDataTableVirtualizer({
    enabled: isVirtualized && !!scrollAreaRef,
    count: displayRows.length,
    scrollAreaRef: effectiveScrollRef,
    estimateSize,
    overscan,
    getItemKey: getVirtualItemKey,
    scrollMargin: staticHeight,
    lanes: Math.max(1, computedColumns),
    gap: 4,
  })

  // Render grid item component
  const renderGridItem = useCallback((
    rowData: TData,
    index: number,
    measureRef?: (node: Element | null) => void,
    style?: React.CSSProperties,
  ) => {
    const isSelected = selectedId !== null && String(rowData[idField]) === String(selectedId)
    const scrubbingActive = highlightedId !== null && String(highlightedId) !== String(selectedId)
    const isHighlighted = highlightedId !== null && String(rowData[idField]) === String(highlightedId)
    
    // Use custom renderer if provided
    if (customRenderGridItem) {
      return (
        <div
          key={String(rowData[idField])}
          data-index={index}
          data-tablefront-row="true"
          ref={measureRef as React.Ref<HTMLDivElement>}
          style={style}
          onClick={() => handleRowClick(rowData)}
        >
          {customRenderGridItem(rowData, index, isSelected)}
        </div>
      )
    }
    
    // Default grid item implementation
    const expanded = expandable ? isRowExpanded(rowData) : false
    
    return (
      <div
        key={String(rowData[idField])}
        data-index={index}
        data-tablefront-row="true"
        ref={measureRef as React.Ref<HTMLDivElement>}
        style={style}
        onClick={() => handleRowClick(rowData)}
        className={cn(
          tableStyles.grid.item,
          tableStyles.grid.itemHover,
          (isHighlighted || (isSelected && !scrubbingActive)) && tableStyles.grid.itemSelected
        )}
      >
        <div className={tableStyles.grid.itemContent}>
          {expandable && (
            <div className={tableStyles.grid.expandButton}>
              <button
                onClick={(e) => handleToggleExpand(rowData, e)}
                className="w-full h-full flex items-center justify-center hover:bg-foreground/5 rounded"
              >
                {expanded ? (
                  icons.CollapseIcon && (
                    <icons.CollapseIcon className="w-4 h-4" />
                  )
                ) : (
                  icons.ExpandIcon && (
                    <icons.ExpandIcon className="w-4 h-4" />
                  )
                )}
              </button>
            </div>
          )}
          
          <div className={tableStyles.grid.itemFields}>
            {effectiveColumns
              .filter((column) => {
                const columnId = column.id || String(((column as { accessorKey?: string })?.accessorKey) || '')
                const override = columnOverrides[columnId]
                
                // Skip hidden columns based on column visibility system
                if (override && override.visible === false) return null
                
                // Check if column is visible according to the table's column visibility state
                return columnVisibility[columnId] !== false
              })
              .map((column) => {
                const columnId = column.id || String(((column as { accessorKey?: string })?.accessorKey) || '')
                const override = columnOverrides[columnId]
                
                // Skip hidden columns in grid mode
                if (override && override.visible === false) return null
                
                const value = rowData[columnId as keyof TData]
                const headerText = typeof column.header === 'string' 
                  ? column.header 
                  : columnId
                
                return (
                  <div key={columnId} className={tableStyles.grid.field}>
                    <div className={tableStyles.grid.fieldLabel}>
                      {headerText}
                    </div>
                    <div className={tableStyles.grid.fieldValue}>
                      {column.cell 
                        ? flexRender(column.cell, { 
                            getValue: () => value,
                            row: { original: rowData },
                            column: { id: columnId },
                            table: table
                          } as object)
                        : String(value || '')
                      }
                    </div>
                  </div>
                )
              })}
          </div>
          
          {expandable && expanded && renderExpandedContent && (
            <div className={tableStyles.grid.expandedContent}>
              {renderExpandedContent(rowData)}
            </div>
          )}
        </div>
      </div>
    )
  }, [
    selectedId,
    highlightedId,
    expandable,
    isRowExpanded,
    handleRowClick,
    handleToggleExpand,
    effectiveColumns,
    columnOverrides,
    renderExpandedContent,
    tableStyles.grid,
    table,
    customRenderGridItem,
    columnVisibility,
    icons,
    idField,
  ])

  // Compute responsive column count like masonry based on container width
  useEffect(() => {
    if (!gridContainerRef.current) return

    const updateColumns = () => {
      const container = gridContainerRef.current
      if (!container) return

      if (gridColumns && gridColumns > 0) {
        setComputedColumns(gridColumns)
        return
      }

      const containerWidth = container.offsetWidth
      const cols = Math.max(1, Math.floor(containerWidth / gridItemMinWidth))
      setComputedColumns(cols)
    }

    updateColumns()
    const ro = new ResizeObserver(updateColumns)
    ro.observe(gridContainerRef.current)
    return () => {
      ro.disconnect()
    }
  }, [gridColumns, gridItemMinWidth])

  const virtualItems = isVirtualized ? gridVirtualizer.getVirtualItems() : null
  const lanes = Math.max(1, computedColumns)

  return (
    <>
      {customStaticRows.length > 0 && (
        <>
          <div
            ref={staticRef}
            style={customStaticRowsSticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
          >
            {customStaticRows.map((row, i) => (
              <div key={`custom-static-grid-${i}`} className="w-full">
                {row}
              </div>
            ))}
          </div>
        </>
      )}
      {isVirtualized && virtualItems ? (
        <div
          ref={gridContainerRef}
          className="relative w-full max-w-full"
          style={{ height: `${gridVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualItem) => {
            const rowData = displayRows[virtualItem.index]
            if (!rowData) return null
            return renderGridItem(
              rowData,
              virtualItem.index,
              gridVirtualizer.measureElement,
              {
                position: 'absolute',
                top: 0,
                left: `${(virtualItem.lane / lanes) * 100}%`,
                width: `${100 / lanes}%`,
                transform: `translateY(${virtualItem.start - staticHeight}px)`,
                padding: '2px',
                boxSizing: 'border-box',
              },
            )
          })}
        </div>
      ) : (
        <div
          className={tableStyles.grid.container}
          style={{
            width: '100%',
            maxWidth: '100%',
            gridTemplateColumns: `repeat(${computedColumns}, 1fr)`,
          }}
          ref={gridContainerRef}
        >
          {displayRows.map((rowData, index) => renderGridItem(rowData, index))}
        </div>
      )}
      
      {/* Loading indicator for infinite scroll in grid mode */}
      {(isLoadingMore || isLoadingLess) && shouldEnableInfiniteScroll && (
        <div className="flex justify-center items-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icons.Loader && (
              <icons.Loader className="h-4 w-4 animate-spin" />
            )}
            <span className="text-sm">
              {isLoadingLess ? 'Loading previous items...' : 'Loading more items...'}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * GridItem component for standalone use
 */
export function GridItem<TData>({
  rowData,
  index,
  isSelected,
  onRowClick,
  expandable,
  expanded,
  onToggleExpand,
  children,
  className,
  ...props
}: {
  rowData: TData
  index: number
  isSelected: boolean
  onRowClick: (row: TData) => void
  expandable: boolean
  expanded: boolean
  onToggleExpand: (row: TData, e: React.MouseEvent) => void
  children: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const handleRowClick = useCallback(() => {
    onRowClick(rowData)
  }, [onRowClick, rowData])

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    onToggleExpand(rowData, e)
  }, [onToggleExpand, rowData])

  return (
    <div
      onClick={handleRowClick}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * GridField component for standalone use
 */
export function GridField({
  label,
  value,
  children,
  className,
  ...props
}: {
  label: string
  value?: any
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) {
  return (
    <div className={className} {...props}>
      <div className="field-label">
        {label}
      </div>
      <div className="field-value">
        {children || String(value || '')}
      </div>
    </div>
  )
} 