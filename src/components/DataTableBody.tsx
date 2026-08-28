'use client'

import React, { useCallback, useRef, useEffect, useState } from 'react'
import { flexRender } from '@tanstack/react-table'
import { cn } from '../utils'
import type { DataTableIcons } from '../types/DataTableTypes'
import type { DataTableVirtualizer } from '../hooks/useDataTableVirtualizer'
import { shouldShowLoadingMoreIndicator } from '../utils/tableContentStatus'

/**
 * Props for the DataTableBody component
 */
export interface DataTableBodyProps<TData> {
  // Data and display
  displayRows: TData[]
  table: any
  idField: keyof TData
  
  // Row selection
  selectedId: any
  highlightedId?: any
  onRowClick: (row: TData) => void
  
  // Expandable functionality
  expandable: boolean
  isRowExpanded: (row: TData) => boolean
  onToggleExpand: (row: TData, e: React.MouseEvent) => void
  renderExpandedContent?: (row: TData) => React.ReactNode
  
  // Static row functionality
  customStaticRows?: React.ReactNode[]
  customStaticRowsSticky?: boolean
  
  // Column configuration
  enableColumnResize: boolean
  
  // Styling
  tableStyles: {
    table: {
      tableRow: string
      tableRowHover: string
      tableRowSelected: string
      tableCell: string
      tableBodyRefreshing?: string
      expandButton: string
    }
  }
  
  // Icons
  icons: DataTableIcons

  // Expanded content width behavior
  clampExpandedContentToContainer?: boolean
  scrollAreaRef?: React.RefObject<HTMLDivElement | null>
  // Static rows width behavior
  clampStaticRowsToContainer?: boolean

  /** TanStack row virtualizer — when set, only visible rows are mounted. */
  rowVirtualizer?: DataTableVirtualizer | null
  isVirtualized?: boolean

  /** Dim existing rows while a sort/search/filter replace is in flight. */
  isRefreshing?: boolean
  /** Instant extra row while the next infinite-scroll page is requested. */
  isLoadingMore?: boolean
  loadingMoreText?: string
}

/**
 * DataTableBody - Handles table body rendering, rows, cells, and expandable functionality
 */
export function DataTableBody<TData>({
  displayRows,
  table,
  idField,
  selectedId,
  highlightedId,
  onRowClick,
  expandable,
  isRowExpanded,
  onToggleExpand,
  renderExpandedContent,
  customStaticRows = [],
  customStaticRowsSticky = true,
  enableColumnResize,
  tableStyles,
  icons,
  clampExpandedContentToContainer = true,
  clampStaticRowsToContainer = true,
  scrollAreaRef,
  rowVirtualizer = null,
  isVirtualized = false,
  isRefreshing = false,
  isLoadingMore = false,
  loadingMoreText = 'Loading...',
}: DataTableBodyProps<TData>) {
  const [headerHeight, setHeaderHeight] = useState(40)
  const [headerHasBorder, setHeaderHasBorder] = useState(false)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const [containerScrollLeft, setContainerScrollLeft] = useState(0)
  
  const handleRowClick = useCallback((row: TData) => {
    onRowClick(row)
  }, [onRowClick])

  const handleToggleExpand = useCallback((row: TData, e: React.MouseEvent) => {
    onToggleExpand(row, e)
  }, [onToggleExpand])

  const columnCount =
    table.getVisibleLeafColumns().length + (expandable ? 1 : 0)

  // Calculate header height dynamically
  useEffect(() => {
    if (!tbodyRef.current) return
    const tableEl = tbodyRef.current.closest('table')
    if (!tableEl) return
    const thead = tableEl.querySelector('thead') as HTMLElement | null
    if (!thead) return

    setHeaderHeight(thead.offsetHeight)
    const style = window.getComputedStyle(thead)
    const borderBottomWidth = parseInt(style.borderBottomWidth || '0', 10)
    setHeaderHasBorder(borderBottomWidth > 0)
  }, [displayRows])

  // Remeasure when expansion toggles — sibling expanded rows aren't in the RO target.
  const expandedFingerprint =
    expandable && isVirtualized && rowVirtualizer
      ? rowVirtualizer
          .getVirtualItems()
          .map((item) => {
            const row = displayRows[item.index]
            return row && isRowExpanded(row) ? '1' : '0'
          })
          .join('')
      : ''

  useEffect(() => {
    if (!isVirtualized || !rowVirtualizer || !expandable) return
    rowVirtualizer.measure()
  }, [isVirtualized, rowVirtualizer, expandable, expandedFingerprint])

  // Measure scroll container width and listen to horizontal scroll if clamping is enabled
  useEffect(() => {
    if (!clampExpandedContentToContainer && !clampStaticRowsToContainer) return
    const viewport =
      (scrollAreaRef?.current?.querySelector(
        '[data-radix-scroll-area-viewport]',
      ) as HTMLElement | null) ||
      scrollAreaRef?.current ||
      null
    if (!viewport) return
    const update = () => {
      setContainerWidth(viewport.clientWidth)
      setContainerScrollLeft(viewport.scrollLeft)
    }
    update()
    const handleScroll = () => setContainerScrollLeft(viewport.scrollLeft)
    const ro = new ResizeObserver(() => setContainerWidth(viewport.clientWidth))
    ro.observe(viewport)
    viewport.addEventListener('scroll', handleScroll, { passive: true } as any)
    return () => {
      viewport.removeEventListener('scroll', handleScroll as any)
      ro.disconnect()
    }
  }, [clampExpandedContentToContainer, clampStaticRowsToContainer, scrollAreaRef])

  const renderDataRow = (rowData: TData, index: number) => {
    const rowId = String(rowData[idField])
    const isSelected = selectedId !== null && rowId === String(selectedId)
    const scrubbingActive =
      highlightedId !== null && String(highlightedId) !== String(selectedId)
    const isHighlighted = highlightedId !== null && rowId === String(highlightedId)
    const expanded = expandable ? isRowExpanded(rowData) : false
    // Prefer pre-pagination model so full-list virtualization can resolve every row.
    const tableRow =
      table.getPrePaginationRowModel().rowsById[rowId] ??
      table.getRowModel().rowsById[rowId]

    if (!tableRow) return null

    return (
      <React.Fragment key={rowId}>
        <tr
          data-index={index}
          data-expanded={expanded ? 'true' : 'false'}
          data-tablefront-row="true"
          ref={
            isVirtualized && rowVirtualizer
              ? rowVirtualizer.measureElement
              : undefined
          }
          onClick={() => handleRowClick(rowData)}
          className={cn(
            tableStyles.table.tableRow,
            tableStyles.table.tableRowHover,
            (isHighlighted || (isSelected && !scrubbingActive)) &&
              tableStyles.table.tableRowSelected,
          )}
        >
          {expandable && (
            <td className={tableStyles.table.expandButton}>
              <button
                onClick={(e) => handleToggleExpand(rowData, e)}
                className="w-full h-full flex items-center justify-center hover:bg-foreground/5"
              >
                {expanded ? (
                  icons.CollapseIcon && (
                    <icons.CollapseIcon className="w-4 h-4" />
                  )
                ) : (
                  icons.ExpandIcon && <icons.ExpandIcon className="w-4 h-4" />
                )}
              </button>
            </td>
          )}
          {tableRow.getVisibleCells().map((cell: any) => (
            <td
              key={cell.id}
              data-column-id={cell.column.id}
              className={cn(
                tableStyles.table.tableCell,
                enableColumnResize && 'overflow-hidden',
                (cell.column.columnDef.meta as { className?: string } | undefined)
                  ?.className,
              )}
              style={
                (cell.column.columnDef.meta as { style?: React.CSSProperties } | undefined)
                  ?.style
              }
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
        {expandable && expanded && renderExpandedContent && (
          <tr data-expanded-content="true">
            <td
              colSpan={columnCount}
              className="p-0 bg-background"
            >
              {clampExpandedContentToContainer ? (
                <div
                  className="overflow-hidden"
                  style={{
                    position: 'sticky',
                    left: 0,
                    width: containerWidth ? `${containerWidth}px` : undefined,
                    maxWidth: '100%',
                  }}
                >
                  {renderExpandedContent(rowData)}
                </div>
              ) : (
                renderExpandedContent(rowData)
              )}
            </td>
          </tr>
        )}
      </React.Fragment>
    )
  }

  const virtualItems =
    isVirtualized && rowVirtualizer ? rowVirtualizer.getVirtualItems() : null
  const paddingTop =
    virtualItems && virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems && virtualItems.length > 0 && rowVirtualizer
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  const showLoadingMoreRow = shouldShowLoadingMoreIndicator({
    isLoadingMore,
    isRefreshing,
    rowCount: displayRows.length,
  })

  const loadingMoreRow = showLoadingMoreRow ? (
    <tr
      data-tablefront-loading-more="true"
      className={cn(tableStyles.table.tableRow, 'pointer-events-none')}
    >
      <td
        colSpan={columnCount}
        className={cn(tableStyles.table.tableCell, 'text-muted-foreground')}
      >
        <div
          className="flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={
            clampStaticRowsToContainer
              ? {
                  position: 'sticky',
                  left: 0,
                  width: containerWidth ? `${containerWidth}px` : undefined,
                  maxWidth: '100%',
                }
              : undefined
          }
        >
          {icons.Loader && <icons.Loader className="h-4 w-4 animate-spin" />}
          <span>{loadingMoreText}</span>
        </div>
      </td>
    </tr>
  ) : null

  return (
    <tbody
      ref={tbodyRef}
      aria-busy={isRefreshing || showLoadingMoreRow || undefined}
      className={cn(isRefreshing && tableStyles.table.tableBodyRefreshing)}
    >
      {/* Custom static rows */}
      {customStaticRows.map((staticRow, index) => (
        <tr
          key={`custom-static-${index}`}
          data-index={`static-${index}`}
          data-static={customStaticRowsSticky ? 'true' : 'false'}
          className={cn(tableStyles.table.tableRow)}
          style={
            customStaticRowsSticky
              ? {
                  position: 'sticky',
                  top: `${headerHeight}px`,
                  zIndex: 10,
                }
              : undefined
          }
        >
          <td
            colSpan={columnCount}
            className={cn(
              'p-0',
              headerHasBorder && 'border-t border-border',
            )}
          >
            {clampStaticRowsToContainer ? (
              <div
                className="overflow-hidden"
                style={{
                  position: 'sticky',
                  left: 0,
                  width: containerWidth ? `${containerWidth}px` : undefined,
                  maxWidth: '100%',
                }}
              >
                {staticRow}
              </div>
            ) : (
              staticRow
            )}
          </td>
        </tr>
      ))}

      {isVirtualized && virtualItems ? (
        <>
          {paddingTop > 0 && (
            <tr aria-hidden="true" className="pointer-events-none">
              <td
                colSpan={columnCount}
                style={{
                  height: paddingTop,
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const rowData = displayRows[virtualRow.index]
            if (!rowData) return null
            return renderDataRow(rowData, virtualRow.index)
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true" className="pointer-events-none">
              <td
                colSpan={columnCount}
                style={{
                  height: paddingBottom,
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
          {loadingMoreRow}
        </>
      ) : (
        <>
          {displayRows.map((rowData, index) => renderDataRow(rowData, index))}
          {loadingMoreRow}
        </>
      )}
    </tbody>
  )
}

/**
 * TableRow component for standalone use
 */
export function TableRow<TData>({
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

  return (
    <tr
      data-index={index}
      onClick={handleRowClick}
      className={className}
      {...props}
    >
      {children}
    </tr>
  )
}

/**
 * TableCell component for standalone use
 */
export function TableCell({
  children,
  className,
  style,
  ...props
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  [key: string]: any
}) {
  return (
    <td className={className} style={style} {...props}>
      {children}
    </td>
  )
}

/**
 * ExpandButton component for standalone use
 */
export function ExpandButton<TData>({
  rowData,
  expanded,
  onToggleExpand,
  icons,
  className,
  ...props
}: {
  rowData: TData
  expanded: boolean
  onToggleExpand: (row: TData, e: React.MouseEvent) => void
  icons: DataTableIcons
  className?: string
  [key: string]: any
}) {
  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      onToggleExpand(rowData, e)
    },
    [onToggleExpand, rowData],
  )

  return (
    <td className={className} {...props}>
      <button
        onClick={handleToggleExpand}
        className="w-full h-full flex items-center justify-center hover:bg-foreground/5"
      >
        {expanded ? (
          icons.CollapseIcon && <icons.CollapseIcon className="w-4 h-4" />
        ) : (
          icons.ExpandIcon && <icons.ExpandIcon className="w-4 h-4" />
        )}
      </button>
    </td>
  )
}
