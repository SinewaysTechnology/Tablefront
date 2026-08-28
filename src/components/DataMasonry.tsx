"use client"

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { flexRender } from '@tanstack/react-table'
import { cn } from '../utils'
import type { DataTableIcons } from '../types/DataTableTypes'
import { shouldShowLoadingMoreIndicator } from '../utils/tableContentStatus'

/**
 * Props for the DataMasonry component
 */
export interface DataMasonryProps<TData> {
  // Data and display
  displayRows: TData[]
  displayMode: 'masonry'
  idField: keyof TData
  
  // Masonry configuration
  masonryColumns?: number // If > 0, shows exactly this many columns. If 0 or undefined, uses responsive auto-fit with masonryItemMinWidth
  masonryItemMinWidth: number
  
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
  customRenderMasonryItem?: (row: TData, index: number, isSelected: boolean) => React.ReactNode
  customStaticRows?: React.ReactNode[]
  customStaticRowsSticky?: boolean
  
  // Infinite scroll
  isLoadingMore: boolean
  isLoadingLess?: boolean
  isRefreshing?: boolean
  loadingMoreText?: string
  shouldEnableInfiniteScroll: boolean
  
  // Styling
  tableStyles: {
    masonry: {
      container: string
      column: string
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
 * Interface for tracking item positions in masonry layout
 */
interface MasonryItem {
  data: any
  height: number
  columnIndex: number
  position: number
}

/**
 * DataMasonry - Handles Pinterest-style masonry layout rendering
 * Uses a proper masonry algorithm that always places items in the shortest column
 */
export function DataMasonry<TData>({
  displayRows,
  displayMode,
  idField,
  masonryColumns,
  masonryItemMinWidth,
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
  customRenderMasonryItem,
  customStaticRows = [],
  customStaticRowsSticky = true,
  isLoadingMore,
  isLoadingLess,
  isRefreshing = false,
  loadingMoreText = 'Loading...',
  shouldEnableInfiniteScroll,
  tableStyles,
  icons
}: DataMasonryProps<TData>) {
  const masonryContainerRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(3)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const staticRef = useRef<HTMLDivElement>(null)
  const [staticHeight, setStaticHeight] = useState<number | undefined>(undefined)

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

  // Calculate column count based on container width
  useEffect(() => {
    if (!masonryContainerRef.current) return
    
    const updateColumnCount = () => {
      const container = masonryContainerRef.current
      if (!container) return
      
      const containerWidth = container.offsetWidth
      
      if (masonryColumns && masonryColumns > 0) {
        setColumnCount(masonryColumns)
      } else {
        const calculatedColumns = Math.max(1, Math.floor(containerWidth / masonryItemMinWidth))
        setColumnCount(calculatedColumns)
      }
    }
    
    updateColumnCount()
    
    const resizeObserver = new ResizeObserver(updateColumnCount)
    resizeObserver.observe(masonryContainerRef.current)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [masonryColumns, masonryItemMinWidth])

  // Calculate estimated heights for items
  const itemHeights = useMemo(() => {
    return displayRows.map((rowData) => {
      let estimatedHeight = 200 // Base height
      
      // Add variation based on content length
      const rowDataString = JSON.stringify(rowData)
      const contentLength = rowDataString.length
      
      if (contentLength > 500) estimatedHeight += 20
      if (contentLength > 1000) estimatedHeight += 30
      if (contentLength > 1500) estimatedHeight += 40
      
      // Use stable hash for height variation
      const itemId = String(rowData[idField])
      const hash = itemId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      estimatedHeight += Math.abs(hash % 60)
      
      // Always add space for potential expansion
      if (expandable) {
        estimatedHeight += 150
      }
      
      return estimatedHeight
    })
  }, [displayRows, expandable, idField])

  // Proper masonry layout algorithm
  const masonryLayout = useMemo(() => {
    if (columnCount === 0) return { columns: [], columnHeights: [] }
    
    const columns: TData[][] = Array.from({ length: columnCount }, () => [])
    const columnHeights = new Array(columnCount).fill(0)
    
    // Place each item in the shortest column
    displayRows.forEach((rowData, index) => {
      const itemHeight = itemHeights[index]
      
      // Find the column with the minimum height
      const minHeight = Math.min(...columnHeights)
      const shortestColumnIndex = columnHeights.indexOf(minHeight)
      
      // Add item to the shortest column
      columns[shortestColumnIndex].push(rowData)
      
      // Update column height (item height + gap)
      columnHeights[shortestColumnIndex] += itemHeight + 16
    })
    
    return { columns, columnHeights }
  }, [displayRows, itemHeights, columnCount])

  // Measure actual item heights after render for more accurate layout
  const [measuredHeights, setMeasuredHeights] = useState<Map<string, number>>(new Map())
  
  const measureItemHeight = useCallback((itemId: string, element: HTMLDivElement) => {
    if (element) {
      const height = element.offsetHeight
      setMeasuredHeights(prev => {
        const newMap = new Map(prev)
        newMap.set(itemId, height)
        return newMap
      })
    }
  }, [])

  // Optimized masonry layout with measured heights
  const optimizedMasonryLayout = useMemo(() => {
    if (columnCount === 0) return { columns: [], columnHeights: [] }
    
    const columns: TData[][] = Array.from({ length: columnCount }, () => [])
    const columnHeights = new Array(columnCount).fill(0)
    
    // Place each item in the shortest column
    displayRows.forEach((rowData, index) => {
      const itemId = String(rowData[idField])
      
      // Use measured height if available, otherwise fall back to estimated
      const itemHeight = measuredHeights.get(itemId) || itemHeights[index]
      
      // Find the column with the minimum height
      const minHeight = Math.min(...columnHeights)
      const shortestColumnIndex = columnHeights.indexOf(minHeight)
      
      // Add item to the shortest column
      columns[shortestColumnIndex].push(rowData)
      
      // Update column height (item height + gap)
      columnHeights[shortestColumnIndex] += itemHeight + 16
    })
    
    return { columns, columnHeights }
  }, [displayRows, itemHeights, columnCount, measuredHeights, idField])

  // Use optimized layout if we have measured heights, otherwise use basic layout
  const finalLayout = measuredHeights.size > 0 ? optimizedMasonryLayout : masonryLayout

  // Render masonry item component
  const renderMasonryItem = useCallback((rowData: TData, index: number) => {
    const isSelected = selectedId !== null && String(rowData[idField]) === String(selectedId)
    const scrubbingActive = highlightedId !== null && String(highlightedId) !== String(selectedId)
    const isHighlighted = highlightedId !== null && String(rowData[idField]) === String(highlightedId)
    const itemId = String(rowData[idField])
    
    // Use custom renderer if provided
    if (customRenderMasonryItem) {
      return (
        <div 
          key={itemId}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(itemId, el)
              // Measure height after render
              requestAnimationFrame(() => measureItemHeight(itemId, el))
            }
          }}
          onClick={() => handleRowClick(rowData)}
          className="w-full h-fit"
        >
          {customRenderMasonryItem(rowData, index, isSelected)}
        </div>
      )
    }
    
    // Default masonry item implementation
    const expanded = expandable ? isRowExpanded(rowData) : false
    
    return (
      <div
        key={itemId}
        ref={(el) => {
          if (el) {
            itemRefs.current.set(itemId, el)
            // Measure height after render
            requestAnimationFrame(() => measureItemHeight(itemId, el))
          }
        }}
        onClick={() => handleRowClick(rowData)}
        className={cn(
          tableStyles.masonry.item,
          tableStyles.masonry.itemHover,
          (isHighlighted || (isSelected && !scrubbingActive)) && tableStyles.masonry.itemSelected,
          "w-full h-fit"
        )}
      >
        <div className={tableStyles.masonry.itemContent}>
          {expandable && (
            <div className={tableStyles.masonry.expandButton}>
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
          
          <div className={tableStyles.masonry.itemFields}>
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
                
                // Skip hidden columns in masonry mode
                if (override && override.visible === false) return null
                
                const value = rowData[columnId as keyof TData]
                const headerText = typeof column.header === 'string' 
                  ? column.header 
                  : columnId
                
                return (
                  <div key={columnId} className={tableStyles.masonry.field}>
                    <div className={tableStyles.masonry.fieldLabel}>
                      {headerText}
                    </div>
                    <div className={tableStyles.masonry.fieldValue}>
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
            <div className={tableStyles.masonry.expandedContent}>
              {renderExpandedContent(rowData)}
            </div>
          )}
        </div>
      </div>
    )
  }, [
    selectedId, 
    idField, 
    customRenderMasonryItem, 
    expandable, 
    isRowExpanded, 
    handleRowClick, 
    handleToggleExpand, 
    effectiveColumns, 
    columnOverrides, 
    columnVisibility, 
    table, 
    renderExpandedContent, 
    tableStyles, 
    icons,
    measureItemHeight
  ])

  return (
    <>
      {customStaticRows.length > 0 && (
        <>
          <div
            ref={staticRef}
            style={customStaticRowsSticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
          >
            {customStaticRows.map((row, i) => (
              <div key={`custom-static-masonry-${i}`} className="w-full">
                {row}
              </div>
            ))}
          </div>
        </>
      )}
      <div 
        className={tableStyles.masonry.container}
        style={{
          width: '100%',
          maxWidth: '100%',
        }}
        ref={masonryContainerRef}
      >
        {finalLayout.columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={tableStyles.masonry.column}
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {column.map((rowData, itemIndex) => renderMasonryItem(rowData, columnIndex * 1000 + itemIndex))}
          </div>
        ))}
      </div>
      
      {/* Loading indicator for infinite scroll in masonry mode */}
      {(shouldShowLoadingMoreIndicator({
        isLoadingMore,
        isRefreshing,
        rowCount: displayRows.length,
      }) || (Boolean(isLoadingLess) && !isRefreshing)) && shouldEnableInfiniteScroll && (
        <div className="flex justify-center items-center py-4">
          <div
            className="flex items-center gap-2 text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            {icons.Loader && (
              <icons.Loader className="h-4 w-4 animate-spin" />
            )}
            <span className="text-sm">
              {isLoadingLess ? 'Loading previous items...' : loadingMoreText}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * MasonryItem component for standalone use
 */
export function MasonryItem<TData>({
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
      className={cn(className, "break-inside-avoid mb-4")}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * MasonryField component for standalone use
 */
export function MasonryField({
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