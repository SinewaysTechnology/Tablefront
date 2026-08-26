"use client"

import React, { useEffect, useLayoutEffect, useRef, useCallback, useState, useMemo, KeyboardEvent, startTransition } from "react";
import { useWindowResize } from './hooks/useWindowResize'
import { DEFAULT_RESIZE_RESET_DEBOUNCE } from './constants/resize'
import { 
  cn, 
  createDragState, 
  setDragImage, 
  moveDragImage,
  removeDragImage,
  addDropIndicator,
  moveDropIndicator,
  removeDropIndicator,
  createResizeState,
  applyResizeCursor,
  applyColumnWidthToDomImmediate,
  clampColumnWidth,
  lockTableResizeLayout,
  applyLockedColumnResize,
  getResizeLayoutColumnWidths,
  releaseTableResizeLayout,
  measureColumnWidthFromPointer,
  cssLengthToPx,
  type ResizeLayoutLock,
} from './utils'
import { buildDefaultColumnVisibility, isColumnWidthLocked } from './ColumnEditor'
import { getAutomaticColumnWidth } from './columnBuilder'
import { 
  useTableStyles
} from './variants'
import { LicenseEnforcer } from './components/LicenseEnforcer'


import { SimpleButton, SimpleScrollArea } from './defaultUIComponents';
import { useDataTableIcons } from './icons';
import { SmartHeader } from './components/SmartHeader';
import { DataTableStates } from './components/DataTableStates';
import { DataTablePagination } from './components/DataTablePagination';
import { DataTableHeader } from './components/DataTableHeader';
import { DataTableBody } from './components/DataTableBody';
import { DataGrid } from './components/DataGrid';
import { DataMasonry } from './components/DataMasonry';
import { useDataTableState } from './hooks/useDataTableState';
import { useDataTableSearch } from './hooks/useDataTableSearch';
import { useInfiniteScrollManager } from './components/InfiniteScrollManager';
import { useDataTableVirtualizer } from './hooks/useDataTableVirtualizer';

// Import only the types actually used in this component
import type {
  DataTableProps,
  DragState,
} from './types/DataTableTypes';





/**
 * DataTable - A comprehensive, self-contained data table component
 * 
 * Features:
 * - Zero configuration with auto-generated columns and filters
 * - Built-in search, filtering, sorting, and pagination
 * - Keyboard navigation and row selection
 * - Expandable rows with custom content
 * - Responsive design with multiple style variants
 * - Type-safe with full TypeScript support
 */





export function DataTable<TData>({
  data,
  columns,
  columnOverrides = {},
  initialColumnVisibility,
  fieldOverrides,
  customStyles,
  uiComponents = {},
  customUIComponents = {},
  icons,
  storeId,
  onRowClick: onRowClickProp,
  selectedRow = null,

  expandable = false,
  expandedRows = {},
  onToggleExpand,
  onExpansionChange,
  headerRightElement,
  autoSelect = true,
  renderExpandedContent,
  clampExpandedContentToContainer = true,
  clampStaticRowsToContainer = true,
  customRenderGridItem,
  customStaticRows = [],
  customStaticRowsSticky = true,

  searchPlaceholder = 'Search...',
  emptyStateText = 'No items found',
  loadingText = 'Loading...',
  labels,
  isLoading = false,

  layout = {},
  paginationConfig,
  infiniteScrollConfig,
  enableColumnDrag = true,
  enableColumnResize = true,
  resizeTimingConfig = {},
}: DataTableProps<TData>) {

  // Extract timing configuration with defaults
  const resizeResetDebounce = resizeTimingConfig.resetDebounce ?? DEFAULT_RESIZE_RESET_DEBOUNCE
  
  const tableStyles = useTableStyles(customStyles)
  const effectiveIcons = useDataTableIcons(icons)
  
  // Merge legacy customUIComponents alias with uiComponents (custom takes precedence)
  const mergedUIComponents = useMemo(() => ({
    ...uiComponents,
    ...customUIComponents,
  }), [uiComponents, customUIComponents])

  const {
    Button, 
    PaginationButton,
    ScrollArea,
  } = mergedUIComponents

  const PaginationBtn = PaginationButton || Button || SimpleButton
  const ScrollAreaComponent = ScrollArea || SimpleScrollArea

  // Use the extracted state management hook
  const {
    idField,
    effectiveSelectedItem,
    onRowClick,
    manualSelectionTimeoutRef,
    setRecentManualSelection,
    isUsingPagination,
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
    filterStore,
    filters,
    clearFilters,
    storeSearchValue,
    setStoreSearchValue,
    filterProcessor,
    effectiveColumns,
    columnVisibility,
    columnWidths,
    setColumnWidths,
    resetColumnWidth,
    filteredData,
    normalRows,
    displayRows,
    table,
    resizeState,
    setResizeState,
    resetInProgress,
    setResetInProgress,
    setPagination,
    setColumnOrder,
    columnOrder,
    pagination,
    resetToDefaults,
  } = useDataTableState({
      data, 
    columns,
    columnOverrides,
    initialColumnVisibility,
    fieldOverrides,
    storeId,
    selectedRow,
    onRowClick: onRowClickProp,
    autoSelect,
    layout,
    paginationConfig,
    infiniteScrollConfig,
    enableColumnDrag,
    enableColumnResize,
    customStaticRows,
    customStaticRowsSticky,
  })



  const parentContainerRef = useRef<HTMLDivElement>(null);

  // Use the extracted search hook
  const {
    searchValue,
    searchInputRef,
    handleSearchChange,
    handleSearchKeyDown,
    handleClearSearch,
    handleClearFilters,
  } = useDataTableSearch({
    storeSearchValue,
    setStoreSearchValue,
    filterProcessor,
    filters,
    clearFilters,
    parentContainerRef,
  })
  
  // Resizing writes widths directly to table cells for smooth pointer tracking.
  // Remount the table after a full reset so none of those imperative styles can
  // outlive the reset state, even when the persisted values were already empty.
  const [tableResetVersion, setTableResetVersion] = useState(0)

  // Reset = one store write with the configured preset. Idempotent on repeat clicks.
  const handleResetTable = useCallback(() => {
    const defaults = buildDefaultColumnVisibility(
      effectiveColumns,
      initialColumnVisibility,
      columnOverrides,
    )

    resetToDefaults(defaults)
    setTableResetVersion((version) => version + 1)
    handleClearFilters()
    handleClearSearch()
  }, [
    effectiveColumns,
    initialColumnVisibility,
    columnOverrides,
    resetToDefaults,
    handleClearFilters,
    handleClearSearch,
  ])
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const windowSize = useWindowResize();
  
    
  
  const selectedId = effectiveSelectedItem ? effectiveSelectedItem[idField] : null;
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)
  const [highlightedId, setHighlightedId] = useState<unknown>(null)
  const promoteTimerRef = useRef<number | null>(null)
  
  const [internalExpandedRows, setInternalExpandedRows] = useState<Record<string, boolean>>({});
  const navRafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  
  const effectiveExpandedRows = onToggleExpand ? expandedRows : internalExpandedRows;

  // Ensure custom ScrollArea viewports (e.g., Radix) allow horizontal and vertical scrolling
  useEffect(() => {
    const root = scrollAreaRef.current
    if (!root) return
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null
    if (viewport) {
      try {
        viewport.style.overflowX = 'auto'
        viewport.style.overflowY = 'auto'
      } catch {}
    }
  }, [mergedUIComponents])

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>(createDragState());
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const dropIndicatorRef = useRef<HTMLElement | null>(null);
  const headerCellsRef = useRef<HTMLElement[]>([]);
  const dragGhostRef = useRef<HTMLElement | null>(null)
  const dragGhostOffsetRef = useRef({ x: 0, y: 0 })
  const dragMoveFrameRef = useRef<number | null>(null)
  const pendingDragPointRef = useRef({ x: 0, y: 0 })
  const dropSettleRectsRef = useRef<Map<string, number> | null>(null)
  const dragInitialOrderRef = useRef<string[] | null>(null)
  const dragDropCommittedRef = useRef(false)
  const activeDraggedColumnIdRef = useRef<string | null>(null)
  const removeDocumentDragAcceptanceRef = useRef<(() => void) | null>(null)
  const optimisticSwapPendingRef = useRef(false)
  const optimisticUnlockTimerRef = useRef<number | null>(null)
  const dragDirectionRef = useRef<'left' | 'right' | null>(null)
  const dragDirectionAnchorXRef = useRef(0)
  const headerHeightRef = useRef(0);
  const stickyStaticRowsHeightRef = useRef(0);

  // FLIP the reordered headers from their pre-drop positions into the new order.
  useLayoutEffect(() => {
    const previousRects = dropSettleRectsRef.current
    dropSettleRectsRef.current = null
    if (!headerRef.current) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const deltas = new Map<string, number>()
    const cells = Array.from(
      headerRef.current.querySelectorAll<HTMLElement>('th[data-column-id]'),
    )

    if (previousRects && !reduceMotion) {
      cells.forEach((cell) => {
        const columnId = cell.getAttribute('data-column-id')
        const previousLeft = columnId ? previousRects.get(columnId) : undefined
        if (previousLeft === undefined) return
        const deltaX = previousLeft - cell.getBoundingClientRect().left
        if (Math.abs(deltaX) < 0.5) return
        if (columnId) deltas.set(columnId, deltaX)
        cell.animate(
          [
            { transform: `translate3d(${deltaX}px, 0, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      })
    }

    // Carry the same settle motion into rendered rows. Cap the work so a large
    // non-virtualized table never creates hundreds of compositor animations.
    const tableElement = headerRef.current.closest('table')
    const bodyCells = tableElement?.querySelectorAll<HTMLElement>('tbody td[data-column-id]')
    if (!reduceMotion && bodyCells && bodyCells.length <= 600) {
      bodyCells.forEach((cell) => {
        const columnId = cell.getAttribute('data-column-id')
        const deltaX = columnId ? deltas.get(columnId) : undefined
        if (deltaX === undefined) return
        cell.animate(
          [
            { transform: `translate3d(${deltaX}px, 0, 0)`, opacity: 0.88 },
            { transform: 'translate3d(0, 0, 0)', opacity: 1 },
          ],
          { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      })
    }

    headerCellsRef.current = cells
    if (optimisticSwapPendingRef.current) {
      if (optimisticUnlockTimerRef.current != null) {
        window.clearTimeout(optimisticUnlockTimerRef.current)
      }
      if (reduceMotion) {
        optimisticSwapPendingRef.current = false
      } else {
        optimisticUnlockTimerRef.current = window.setTimeout(() => {
          optimisticSwapPendingRef.current = false
          optimisticUnlockTimerRef.current = null
        }, 90)
      }
    }
  }, [columnOrder])

  useEffect(() => () => {
    if (dragMoveFrameRef.current != null) cancelAnimationFrame(dragMoveFrameRef.current)
    if (optimisticUnlockTimerRef.current != null) window.clearTimeout(optimisticUnlockTimerRef.current)
    removeDocumentDragAcceptanceRef.current?.()
    activeDraggedColumnIdRef.current = null
    removeDragImage(dragGhostRef.current)
    removeDropIndicator(dropIndicatorRef.current)
  }, [])

  // Measure header and sticky static rows heights and cache them
  useEffect(() => {
    const measure = () => {
      // Header height
      headerHeightRef.current = headerRef.current?.offsetHeight || 0
      
      // Sticky static rows total height
      let total = 0
      if (customStaticRowsSticky && customStaticRows && customStaticRows.length > 0) {
        const tableEl = scrollAreaRef.current?.querySelector('table') as HTMLElement | null
        if (tableEl) {
          const stickyRows = tableEl.querySelectorAll('tbody tr[data-static="true"]')
          stickyRows.forEach(row => { total += (row as HTMLElement).offsetHeight || 0 })
        }
      }
      stickyStaticRowsHeightRef.current = total
    }
    const raf = window.requestAnimationFrame(measure)
    return () => window.cancelAnimationFrame(raf)
  }, [
    displayRows.length,
    customStaticRowsSticky,
    customStaticRows.length,
    showTableHeaders,
    windowSize.width,
    windowSize.height
  ])

  // Initialize column order if empty
  useEffect(() => {
    if (columnOrder.length === 0 && effectiveColumns.length > 0) {
      const initialOrder = effectiveColumns.map(col => {
        const accessorKey = (col as { accessorKey?: string }).accessorKey
        return col.id || String(accessorKey || '')
      });
      setColumnOrder(initialOrder);
    }
  }, [columnOrder.length, effectiveColumns, setColumnOrder]);
  
  const handleToggleExpand = useCallback((row: TData, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onToggleExpand) {
      onToggleExpand(row);
    } else {
      const rowId = String(row[idField]);
      const newExpandedRows = {
        ...internalExpandedRows,
        [rowId]: !internalExpandedRows[rowId]
      };
      setInternalExpandedRows(newExpandedRows);
      
      // Notify parent of expansion state change if callback provided
      if (onExpansionChange) {
        onExpansionChange(newExpandedRows);
      }
    }
  }, [idField, onToggleExpand, internalExpandedRows, onExpansionChange]);
  
  const isRowExpanded = useCallback((row: TData) => {
    const rowId = String(row[idField]);
    return !!effectiveExpandedRows[rowId];
  }, [effectiveExpandedRows, idField]);

  // Sorted + filtered full list (pre-pagination) for windowed / full-list modes.
  const prePaginationRows = table.getPrePaginationRowModel().rows
  const sortedRows = useMemo(
    () => prePaginationRows.map((row: { original: TData }) => row.original),
    [prePaginationRows],
  )

  const listResetKey = useMemo(() => {
    const sortingKey = JSON.stringify(table.getState().sorting)
    const mid = sortedRows[Math.floor(sortedRows.length / 2)] as TData | undefined
    const first = sortedRows[0] as TData | undefined
    const last = sortedRows[sortedRows.length - 1] as TData | undefined
    return [
      sortedRows.length,
      String(first?.[idField] ?? ''),
      String(mid?.[idField] ?? ''),
      String(last?.[idField] ?? ''),
      sortingKey,
      storeSearchValue,
      filters.length,
    ].join('|')
  }, [sortedRows, idField, table, storeSearchValue, filters.length])

  // Growing pageSize / sliding window + DOM virtualization flags
  const {
    effectiveDisplayRows,
    effectiveIsLoadingMore,
    isLoadingLess,
    isVirtualizationEnabled,
    shouldEnableInfiniteScroll,
  } = useInfiniteScrollManager({
    normalRows,
    sortedRows,
    displayRows,
    scrollAreaRef,
    pagination,
    setPagination,
    infiniteScrollConfig,
    isUsingPagination,
    displayMode,
    windowSize,
    listResetKey,
  })

  const [virtualScrollMargin, setVirtualScrollMargin] = useState(0)

  useEffect(() => {
    const headerH = headerRef.current?.offsetHeight || 0
    let stickyH = 0
    if (customStaticRowsSticky && customStaticRows && customStaticRows.length > 0) {
      const tableEl = scrollAreaRef.current?.querySelector('table') as HTMLElement | null
      if (tableEl) {
        tableEl.querySelectorAll('tbody tr[data-static="true"]').forEach((row) => {
          stickyH += (row as HTMLElement).offsetHeight || 0
        })
      }
    }
    headerHeightRef.current = headerH
    stickyStaticRowsHeightRef.current = stickyH
    setVirtualScrollMargin(headerH + stickyH)
  }, [
    customStaticRowsSticky,
    customStaticRows,
    effectiveDisplayRows.length,
    showTableHeaders,
    displayMode,
  ])

  const getVirtualItemKey = useCallback(
    (index: number) => {
      const row = effectiveDisplayRows[index]
      if (!row) return index
      return String(row[idField])
    },
    [effectiveDisplayRows, idField],
  )

  const rowVirtualizer = useDataTableVirtualizer({
    enabled: isVirtualizationEnabled && displayMode === 'table',
    count: effectiveDisplayRows.length,
    scrollAreaRef,
    estimateSize: infiniteScrollConfig?.estimateSize ?? 40,
    overscan: infiniteScrollConfig?.overscan ?? 8,
    getItemKey: getVirtualItemKey,
    // thead/static rows are in document flow — don't offset item starts.
    scrollMargin: 0,
    scrollPaddingStart: virtualScrollMargin,
    measureExpandedSibling: expandable,
  })

  const scrollToTop = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = 0;
    }
  }, [scrollAreaRef]);

  const scrollToBottom = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') || scrollAreaRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [scrollAreaRef]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!effectiveDisplayRows.length || !onRowClick) return;
    
    if (event.key === '/' && event.target === parentContainerRef.current) {
      event.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    
    const currentSelectedIndex = selectedId !== null 
      ? effectiveDisplayRows.findIndex(row => String(row[idField]) === String(selectedId))
      : -1;
    const currentIndex = highlightIndex != null ? highlightIndex : currentSelectedIndex;
    
    if (currentIndex === -1) {
      if (event.key === 'Home') {
        event.preventDefault();
        
        const firstValidRow = effectiveDisplayRows[0];
        
        if (firstValidRow) {
          setHighlightIndex(0)
          setHighlightedId(firstValidRow[idField])
          if (promoteTimerRef.current) window.clearTimeout(promoteTimerRef.current)
          promoteTimerRef.current = window.setTimeout(() => {
            onRowClick(firstValidRow)
          }, 120)
        }
      }
      return;
    }
    
    const currentRow = effectiveDisplayRows[currentIndex];
    const rowId = String(currentRow[idField]);
    
    if (expandable && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      const isExpanded = effectiveExpandedRows[rowId];
      
      if (event.key === 'ArrowRight' && !isExpanded) {
        event.preventDefault();
        if (onToggleExpand) {
          onToggleExpand(currentRow);
        } else {
          const newExpandedRows = {
            ...internalExpandedRows,
            [rowId]: true
          };
          setInternalExpandedRows(newExpandedRows);
          
          // Notify parent of expansion state change if callback provided
          if (onExpansionChange) {
            onExpansionChange(newExpandedRows);
          }
        }
        return;
      }
      
      if (event.key === 'ArrowLeft' && isExpanded) {
        event.preventDefault();
        if (onToggleExpand) {
          onToggleExpand(currentRow);
        } else {
          const newExpandedRows = {
            ...internalExpandedRows,
            [rowId]: false
          };
          setInternalExpandedRows(newExpandedRows);
          
          // Notify parent of expansion state change if callback provided
          if (onExpansionChange) {
            onExpansionChange(newExpandedRows);
          }
        }
        return;
      }
    }
    
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, effectiveDisplayRows.length - 1);
        
        if (newIndex === currentIndex && isUsingPagination && table.getCanNextPage()) {
          table.nextPage();
          requestAnimationFrame(() => {
            const nextPageRows = table.getRowModel().rows;
            if (nextPageRows.length > 0) {
              const topRow = nextPageRows[0].original as TData
              setHighlightIndex(0)
              setHighlightedId(topRow[idField])
              if (promoteTimerRef.current) window.clearTimeout(promoteTimerRef.current)
              promoteTimerRef.current = window.setTimeout(() => {
                onRowClick(topRow)
              }, 120)
              scrollToTop();
            }
          });
          return;
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        
        if (newIndex === currentIndex && isUsingPagination && table.getCanPreviousPage()) {
          table.previousPage();
          requestAnimationFrame(() => {
            const prevPageRows = table.getRowModel().rows;
            if (prevPageRows.length > 0) {
              const lastIndex = prevPageRows.length - 1
              const bottomRow = prevPageRows[lastIndex].original as TData
              setHighlightIndex(lastIndex)
              setHighlightedId(bottomRow[idField])
              if (promoteTimerRef.current) window.clearTimeout(promoteTimerRef.current)
              promoteTimerRef.current = window.setTimeout(() => {
                onRowClick(bottomRow)
              }, 120)
              scrollToBottom();
            }
          });
          return;
        }
        break;
        
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
        
      case 'End':
        event.preventDefault();
        newIndex = effectiveDisplayRows.length - 1;
        break;
        
      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 10, effectiveDisplayRows.length - 1);
        break;
        
      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 10, 0);
        break;
    }
    
    if (newIndex !== currentIndex) {
      pendingIndexRef.current = newIndex
      if (!navRafRef.current) {
        navRafRef.current = window.requestAnimationFrame(() => {
          const target = pendingIndexRef.current
          pendingIndexRef.current = null
          navRafRef.current = null
          if (target != null) {
            setHighlightIndex(target)
            setHighlightedId(effectiveDisplayRows[target][idField])
            if (promoteTimerRef.current) window.clearTimeout(promoteTimerRef.current)
            promoteTimerRef.current = window.setTimeout(() => {
              startTransition(() => onRowClick(effectiveDisplayRows[target]))
            }, 120)

            window.requestAnimationFrame(() => {
              if (isVirtualizationEnabled && displayMode === 'table') {
                rowVirtualizer.scrollToIndex(target, { align: 'auto' })
              }

              if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
                const scrollContainer = viewport || scrollAreaRef.current
                const targetRow = scrollContainer.querySelector(`tr[data-index="${target}"]`) as HTMLElement
                if (targetRow) {
                  scrollToRow(targetRow, scrollContainer)
                } else {
                  window.requestAnimationFrame(() => {
                    const retryRow = scrollContainer.querySelector(`tr[data-index="${target}"]`) as HTMLElement
                    if (retryRow) scrollToRow(retryRow, scrollContainer)
                  })
                }
              }
            })
          }
        })
      }
    }
      }, [effectiveDisplayRows, onRowClick, selectedId, idField, scrollAreaRef, expandable, effectiveExpandedRows, onToggleExpand, onExpansionChange, internalExpandedRows, isUsingPagination, table, scrollToTop, scrollToBottom, highlightIndex, isVirtualizationEnabled, displayMode, rowVirtualizer]);

  useEffect(() => {
    return () => {
      if (promoteTimerRef.current) window.clearTimeout(promoteTimerRef.current)
      if (navRafRef.current) window.cancelAnimationFrame(navRafRef.current)
    }
  }, [])

  const scrollToRow = useCallback((targetRow: HTMLElement, viewport: HTMLElement) => {
    if (!targetRow || !viewport) return
    
    const scrollContainer = viewport || scrollAreaRef.current
    if (!scrollContainer) return
    
    // Use cached measurements to avoid layout thrash
    const topGuard = (headerHeightRef.current || 0) + (stickyStaticRowsHeightRef.current || 0)
    
    const containerRect = scrollContainer.getBoundingClientRect()
    const rowRect = targetRow.getBoundingClientRect()
    
    const rowTop = rowRect.top - containerRect.top
    const rowBottom = rowRect.bottom - containerRect.top
    const containerHeight = containerRect.height
    
    const isRowAbove = rowTop < topGuard
    const isRowBelow = rowBottom > containerHeight
    const isPartiallyVisible = (rowTop >= topGuard && rowTop < containerHeight) || 
                              (rowBottom > topGuard && rowBottom <= containerHeight)
    
    if (isRowAbove) {
      const scrollOffset = rowTop - topGuard
      scrollContainer.scrollTop += scrollOffset
    } else if (isRowBelow) {
      const scrollOffset = rowBottom - containerHeight
      scrollContainer.scrollTop += scrollOffset
    } else if (isPartiallyVisible) {
      if (rowTop < topGuard) {
        const scrollOffset = rowTop - topGuard
        scrollContainer.scrollTop += scrollOffset
      } else if (rowBottom > containerHeight) {
        const scrollOffset = rowBottom - containerHeight
        scrollContainer.scrollTop += scrollOffset
      }
    }
  }, [scrollAreaRef, customStaticRowsSticky, customStaticRows?.length]);

  const handleRowClick = useCallback((row: TData) => {
    setRecentManualSelection(true);
    
    if (manualSelectionTimeoutRef.current) {
      clearTimeout(manualSelectionTimeoutRef.current);
    }
    manualSelectionTimeoutRef.current = setTimeout(() => {
      setRecentManualSelection(false);
      manualSelectionTimeoutRef.current = null;
    }, 500);
    
    const idx = effectiveDisplayRows.findIndex(r => String(r[idField]) === String(row[idField]))
    if (idx >= 0) {
      setHighlightIndex(idx)
      setHighlightedId(row[idField])
    }
    onRowClick(row);
  }, [onRowClick, effectiveDisplayRows, idField]);

  // ============================================================================
  // DRAG AND DROP OPTIMIZATION HELPERS
  // ============================================================================
  
  /**
   * Cleans up the drop indicator element and resets the reference
   */
  const cleanupDropIndicator = useCallback(() => {
    if (dropIndicatorRef.current) {
      removeDropIndicator(dropIndicatorRef.current);
      dropIndicatorRef.current = null;
    }
  }, []);

  const cleanupDragVisuals = useCallback(() => {
    if (dragMoveFrameRef.current != null) {
      cancelAnimationFrame(dragMoveFrameRef.current)
      dragMoveFrameRef.current = null
    }
    if (optimisticUnlockTimerRef.current != null) {
      window.clearTimeout(optimisticUnlockTimerRef.current)
      optimisticUnlockTimerRef.current = null
    }
    cleanupDropIndicator()
    removeDragImage(dragGhostRef.current)
    dragGhostRef.current = null
    removeDocumentDragAcceptanceRef.current?.()
    removeDocumentDragAcceptanceRef.current = null
    activeDraggedColumnIdRef.current = null
    dragDirectionRef.current = null
    dragDirectionAnchorXRef.current = 0
  }, [cleanupDropIndicator])

  const queueDragGhostMove = useCallback((x: number, y: number) => {
    // Some browsers emit a final native drag event at 0,0.
    if (x === 0 && y === 0) return
    pendingDragPointRef.current = { x, y }
    if (dragMoveFrameRef.current != null) return

    dragMoveFrameRef.current = requestAnimationFrame(() => {
      dragMoveFrameRef.current = null
      const point = pendingDragPointRef.current
      const offset = dragGhostOffsetRef.current
      moveDragImage(dragGhostRef.current, point.x - offset.x, point.y - offset.y)
    })
  }, [])

  // ============================================================================
  // DRAG AND DROP EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handles the start of a column drag operation
   */
  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    if (!enableColumnDrag) return;

    // Native drag events can reach dragenter/dragover before React has rendered
    // the dragging state. Keep the active session in a ref so every event is
    // accepted synchronously and Chromium never falls back to a no-drop cursor.
    activeDraggedColumnIdRef.current = columnId

    const acceptDrag = (event: globalThis.DragEvent) => {
      if (!activeDraggedColumnIdRef.current) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    }
    const acceptDrop = (event: globalThis.DragEvent) => {
      if (!activeDraggedColumnIdRef.current) return
      acceptDrag(event)
      dragDropCommittedRef.current = true
    }

    removeDocumentDragAcceptanceRef.current?.()
    document.addEventListener('dragenter', acceptDrag, true)
    document.addEventListener('dragover', acceptDrag, true)
    document.addEventListener('drop', acceptDrop, true)
    removeDocumentDragAcceptanceRef.current = () => {
      document.removeEventListener('dragenter', acceptDrag, true)
      document.removeEventListener('dragover', acceptDrag, true)
      document.removeEventListener('drop', acceptDrop, true)
    }
    
    const target = e.currentTarget;
    const targetRect = target.getBoundingClientRect()
    dragGhostOffsetRef.current = {
      x: Math.max(0, Math.min(targetRect.width, e.clientX - targetRect.left)),
      y: Math.max(0, Math.min(targetRect.height, e.clientY - targetRect.top)),
    }
    // WebKit requires payload data before setDragImage; Chromium is fine either
    // way. Set it first so Safari does not cancel the drag or fall back to a
    // URL/globe bitmap.
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)
    dragGhostRef.current = setDragImage(
      e.nativeEvent,
      target,
      tableStyles.dragDrop.dragGhost,
    )
    
    if (headerRef.current) {
      headerCellsRef.current = Array.from(
        headerRef.current.querySelectorAll('th[data-column-id]')
      ) as HTMLElement[];
    }
    dragInitialOrderRef.current = [...table.getState().columnOrder]
    dragDropCommittedRef.current = false
    optimisticSwapPendingRef.current = false
    dragDirectionRef.current = null
    dragDirectionAnchorXRef.current = e.clientX
    
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedColumnId: columnId,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    }));
  }, [enableColumnDrag, tableStyles.dragDrop.dragGhost, table]);

  /**
   * Handles drag over events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    const draggedColumnId = activeDraggedColumnIdRef.current
    if (!enableColumnDrag || !draggedColumnId) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Move the custom ghost at most once per frame. No React render is needed
    // for pointer tracking.
    queueDragGhostMove(e.clientX, e.clientY)

    // Keep the user's actual pointer direction separate from the dragged
    // header's layout position. Unequal column widths can move the header past
    // a stationary pointer after a swap; that must not be interpreted as an
    // immediate move in the opposite direction.
    const reversalThreshold = 3
    let dragDirection = dragDirectionRef.current
    const directionAnchorX = dragDirectionAnchorXRef.current

    if (dragDirection === null) {
      const deltaX = e.clientX - directionAnchorX
      if (Math.abs(deltaX) >= 1) {
        dragDirection = deltaX > 0 ? 'right' : 'left'
        dragDirectionRef.current = dragDirection
        dragDirectionAnchorXRef.current = e.clientX
      }
    } else if (dragDirection === 'right') {
      if (e.clientX >= directionAnchorX) {
        dragDirectionAnchorXRef.current = e.clientX
      } else if (directionAnchorX - e.clientX >= reversalThreshold) {
        dragDirection = 'left'
        dragDirectionRef.current = dragDirection
        dragDirectionAnchorXRef.current = e.clientX
      }
    } else if (e.clientX <= directionAnchorX) {
      dragDirectionAnchorXRef.current = e.clientX
    } else if (e.clientX - directionAnchorX >= reversalThreshold) {
      dragDirection = 'right'
      dragDirectionRef.current = dragDirection
      dragDirectionAnchorXRef.current = e.clientX
    }

    if (optimisticSwapPendingRef.current || dragDirection === null) return

    const cells = headerCellsRef.current
    const draggedIndex = cells.findIndex(
      (cell) => cell.getAttribute('data-column-id') === draggedColumnId,
    )
    const draggedCell = cells[draggedIndex]
    if (!draggedCell) return

    const draggedRect = draggedCell.getBoundingClientRect()
    const movingLeft = dragDirection === 'left' && e.clientX < draggedRect.left && draggedIndex > 0
    const movingRight = dragDirection === 'right' && e.clientX > draggedRect.right && draggedIndex < cells.length - 1
    if (!movingLeft && !movingRight) return

    // Crossing the dragged column's own edge swaps immediately with the next
    // visible neighbor. This is intentionally earlier than midpoint targeting.
    const adjacentIndex = movingLeft ? draggedIndex - 1 : draggedIndex + 1
    const adjacentCell = cells[adjacentIndex]
    const adjacentColumnId = adjacentCell?.getAttribute('data-column-id')
    if (!adjacentCell || !adjacentColumnId) return

    const currentOrder = table.getState().columnOrder
    const fromIndex = currentOrder.indexOf(draggedColumnId)
    const adjacentOrderIndex = currentOrder.indexOf(adjacentColumnId)
    if (fromIndex < 0 || adjacentOrderIndex < 0) return

    const nextOrder = [...currentOrder]
    const adjacentColumn = nextOrder[adjacentOrderIndex]
    nextOrder[adjacentOrderIndex] = nextOrder[fromIndex]
    nextOrder[fromIndex] = adjacentColumn

    dropSettleRectsRef.current = new Map(
      cells.map((cell) => [
        cell.getAttribute('data-column-id') || '',
        cell.getBoundingClientRect().left,
      ]),
    )
    optimisticSwapPendingRef.current = true

    const indicatorPosition: 'before' | 'after' = movingLeft ? 'before' : 'after'
    if (dropIndicatorRef.current) {
      moveDropIndicator(dropIndicatorRef.current, adjacentCell, indicatorPosition)
    } else {
      dropIndicatorRef.current = addDropIndicator(
        adjacentCell,
        indicatorPosition,
        tableStyles.dragDrop.dropIndicator,
      )
    }

    setDragState(prev => ({
      ...prev,
      dropTargetIndex: adjacentIndex,
      dropTargetColumnId: adjacentColumnId,
    }))
    setColumnOrder(nextOrder)
  }, [enableColumnDrag, tableStyles.dragDrop.dropIndicator, queueDragGhostMove, table, setColumnOrder]);

  /**
   * Handles drop events
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!enableColumnDrag || !activeDraggedColumnIdRef.current) return;
    
    e.preventDefault();
    dragDropCommittedRef.current = true
    cleanupDragVisuals()
    setDragState(createDragState());
  }, [enableColumnDrag, cleanupDragVisuals]);

  /**
   * Handles drag end events
   */
  const handleDragEnd = useCallback(() => {
    if (!dragDropCommittedRef.current && dragInitialOrderRef.current) {
      dropSettleRectsRef.current = new Map(
        headerCellsRef.current.map((cell) => [
          cell.getAttribute('data-column-id') || '',
          cell.getBoundingClientRect().left,
        ]),
      )
      setColumnOrder(dragInitialOrderRef.current)
    }
    cleanupDragVisuals()
    dragInitialOrderRef.current = null
    dragDropCommittedRef.current = false
    optimisticSwapPendingRef.current = false
    setDragState(createDragState())
  }, [cleanupDragVisuals, setColumnOrder]);

  // ============================================================================
  // COLUMN RESIZE EVENT HANDLERS
  // ============================================================================

  // Cached layout lock + pending width for the active resize drag
  const resizeSessionRef = useRef<{
    headerCell: HTMLElement | null
    lock: ResizeLayoutLock | null
    lastWidth: number
    /** pointerX - columnRight at drag start (hitslop grab correction) */
    edgeOffset: number
    rafId: number | null
    didResize: boolean
  }>({ headerCell: null, lock: null, lastWidth: 0, edgeOffset: 0, rafId: null, didResize: false })
  const resetDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectLockedHeaderIndexes = useCallback((headerRow: Element | null) => {
    const lockedIndexes: number[] = []
    if (!headerRow) return lockedIndexes
    Array.from(headerRow.children).forEach((cell, index) => {
      const columnIdAttr = (cell as HTMLElement).getAttribute('data-column-id')
      if (!columnIdAttr) {
        // Expand-column gutter — treat as pinned
        lockedIndexes.push(index)
        return
      }
      if (isColumnWidthLocked(columnOverrides, columnIdAttr)) {
        lockedIndexes.push(index)
        return
      }
      const metaLock = (
        table.getColumn(columnIdAttr)?.columnDef.meta as { lockWidth?: boolean } | undefined
      )?.lockWidth
      if (metaLock) lockedIndexes.push(index)
    })
    return lockedIndexes
  }, [columnOverrides, table])

  /**
   * Double-click resets only this column to automatic width.
   * Columns to the left keep their current widths; leftover space is absorbed
   * by unlocked columns to the right (same layout rule as a shrink drag).
   */
  const handleResizeReset = useCallback((e: React.MouseEvent, columnId: string) => {
    if (!enableColumnResize || isColumnWidthLocked(columnOverrides, columnId)) return

    e.preventDefault()
    e.stopPropagation()

    if (resizeSessionRef.current.rafId != null) {
      cancelAnimationFrame(resizeSessionRef.current.rafId)
      resizeSessionRef.current.rafId = null
    }
    if (resizeSessionRef.current.lock) {
      releaseTableResizeLayout(resizeSessionRef.current.lock)
      resizeSessionRef.current.lock = null
    }
    resizeSessionRef.current.headerCell = null
    resizeSessionRef.current.didResize = false

    if (resizeState.isResizing) {
      setResizeState(createResizeState())
      applyResizeCursor(false)
    }

    // Already at automatic sizing — pinning neighbors here would freeze every
    // unlocked column as a user resize and change layout on a no-op double-click.
    if (!(columnId in columnWidths)) return

    setResetInProgress(true)

    const headerCell = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null
    const autoWidth = getAutomaticColumnWidth(
      table.getColumn(columnId)?.columnDef,
      data,
    )

    let pinWidths: Record<string, number> | undefined
    if (headerCell) {
      const lock = lockTableResizeLayout(headerCell, {
        lockedIndexes: collectLockedHeaderIndexes(headerCell.parentElement),
      })
      if (lock) {
        applyLockedColumnResize(lock, autoWidth)
        const snapshot = getResizeLayoutColumnWidths(lock)
        delete snapshot[columnId]
        pinWidths = snapshot
        releaseTableResizeLayout(lock)
      }
    }

    // Pin neighbors in the same store write so a remount/re-render cannot
    // proportionally redistribute leftover viewport space across every column.
    resetColumnWidth(columnId, pinWidths)

    if (resetDebounceTimeoutRef.current != null) {
      clearTimeout(resetDebounceTimeoutRef.current)
    }
    resetDebounceTimeoutRef.current = setTimeout(() => {
      resetDebounceTimeoutRef.current = null
      setResetInProgress(false)
    }, resizeResetDebounce)
  }, [
    enableColumnResize,
    resetColumnWidth,
    resizeState.isResizing,
    resizeResetDebounce,
    columnOverrides,
    columnWidths,
    table,
    data,
    collectLockedHeaderIndexes,
  ])

  const tableContentWidth = useMemo(() => {
    if (!enableColumnResize) return undefined

    let sum = expandable ? 40 : 0
    const visibleColumns = table.getVisibleLeafColumns()

    for (const column of visibleColumns) {
      const columnId = column.id
      const meta = column.columnDef.meta as { style?: React.CSSProperties } | undefined
      const fromStyle = cssLengthToPx(meta?.style?.width)
      if (fromStyle > 0) {
        sum += fromStyle
        continue
      }

      const fromSize = column.columnDef.size
      if (typeof fromSize === 'number' && fromSize > 0) {
        sum += fromSize
        continue
      }

      sum += column.getSize()
    }

    // Preserve sub-pixel geometry; rounding here makes a restored table wider
    // than the exact snapshot and lets the browser redistribute the difference.
    return sum > 0 ? sum : undefined
  }, [enableColumnResize, expandable, table, columnWidths, effectiveColumns, columnVisibility])

  /**
   * Handles the start of a column resize operation
   */
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    if (
      !enableColumnResize ||
      e.detail === 2 ||
      resetInProgress ||
      isColumnWidthLocked(columnOverrides, columnId)
    ) {
      return
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const headerCell = e.currentTarget.closest('th') as HTMLElement;
    if (!headerCell) return;

    const lock = lockTableResizeLayout(headerCell, {
      lockedIndexes: collectLockedHeaderIndexes(headerCell.parentElement),
    })
    const startRect = headerCell.getBoundingClientRect()
    const startWidth = lock
      ? (lock.widths[lock.activeIndex] ?? startRect.width)
      : startRect.width
    // Keep the grab point on the hitslop aligned with the column's right edge
    const edgeOffset = e.clientX - startRect.right

    resizeSessionRef.current = {
      headerCell,
      lock,
      lastWidth: startWidth,
      edgeOffset,
      rafId: null,
      didResize: false,
    }
    
    setResizeState({
      isResizing: true,
      columnId,
      startX: e.clientX,
      startWidth,
    });
    
    applyResizeCursor(true);
  }, [enableColumnResize, resetInProgress, columnOverrides, collectLockedHeaderIndexes]);

  /**
   * Handles mouse move during column resize (rAF-coalesced).
   * Width is measured from the column's live left edge → pointer, so left-side
   * auto-reflow cannot desync the handle from the cursor.
   */
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.columnId || resetInProgress) return;

    const { headerCell, edgeOffset } = resizeSessionRef.current
    if (!headerCell) return

    const newWidth = measureColumnWidthFromPointer(e.clientX, headerCell, edgeOffset)
    if (Math.abs(newWidth - resizeState.startWidth) <= 0.5) return

    resizeSessionRef.current.lastWidth = newWidth;
    resizeSessionRef.current.didResize = true

    if (resizeSessionRef.current.rafId != null) return

    resizeSessionRef.current.rafId = requestAnimationFrame(() => {
      resizeSessionRef.current.rafId = null
      const { lock, lastWidth, headerCell: cell } = resizeSessionRef.current
      if (lock) {
        applyLockedColumnResize(lock, lastWidth)
        return
      }
      if (!cell || !resizeState.columnId) return
      applyColumnWidthToDomImmediate(resizeState.columnId, lastWidth, {
        headerCell: cell,
        includeBodyCells: false,
      })
    })
  }, [resizeState, resetInProgress]);

  /**
   * Handles the end of a column resize operation
   */
  const handleResizeEnd = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.columnId || resetInProgress) return;

    if (resizeSessionRef.current.rafId != null) {
      cancelAnimationFrame(resizeSessionRef.current.rafId)
      resizeSessionRef.current.rafId = null
    }

    const { lock, headerCell, edgeOffset, lastWidth, didResize } = resizeSessionRef.current
    const fromPointer = headerCell
      ? measureColumnWidthFromPointer(e.clientX, headerCell, edgeOffset)
      : clampColumnWidth(resizeState.startWidth + (e.clientX - resizeState.startX))
    const hasMeaningfulResize = didResize || Math.abs(fromPointer - resizeState.startWidth) > 0.5
    const finalWidth = didResize ? lastWidth : fromPointer
    const currentColumnId = resizeState.columnId

    if (!hasMeaningfulResize) {
      if (lock) releaseTableResizeLayout(lock)
      resizeSessionRef.current.headerCell = null
      resizeSessionRef.current.lock = null
      resizeSessionRef.current.didResize = false
      setResizeState(createResizeState())
      applyResizeCursor(false)
      return
    }

    let widthSnapshot: Record<string, number>
    if (lock) {
      applyLockedColumnResize(lock, finalWidth)
      widthSnapshot = getResizeLayoutColumnWidths(lock)
      releaseTableResizeLayout(lock)
    } else {
      applyColumnWidthToDomImmediate(currentColumnId, finalWidth, {
        headerCell,
        includeBodyCells: false,
      })
      widthSnapshot = { [currentColumnId]: finalWidth }
    }

    // Persist the entire final geometry synchronously and in one store write.
    // A refresh immediately after mouse-up now restores the exact same widths.
    setColumnWidths(widthSnapshot)

    resizeSessionRef.current.headerCell = null
    resizeSessionRef.current.lock = null
    resizeSessionRef.current.didResize = false
    
    // Reset UI state immediately
    setResizeState(createResizeState());
    applyResizeCursor(false);
    
      }, [resizeState, setColumnWidths, resetInProgress]);

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (resizeState.isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        if (resizeSessionRef.current.rafId != null) {
          cancelAnimationFrame(resizeSessionRef.current.rafId)
          resizeSessionRef.current.rafId = null
        }
      };
    }
  }, [resizeState.isResizing, handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    return () => {
      if (resetDebounceTimeoutRef.current != null) {
        clearTimeout(resetDebounceTimeoutRef.current)
      }
    }
  }, [])

  // Memoize global resize overlay to prevent unnecessary re-renders
  const globalResizeOverlay = useMemo(() => {
    if (!enableColumnResize || !resizeState.isResizing) return null;
    
    return (
      <div
        className={tableStyles.resize.overlay}
        style={{ userSelect: 'none' }}
      />
    );
  }, [enableColumnResize, resizeState.isResizing]);

  

  return (
    <div data-tablefront-root className="flex h-full min-h-0 w-full flex-1 flex-col">
      {globalResizeOverlay}
      <div 
        className={cn(tableStyles.container, 'relative')}
        ref={parentContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onDragOver={enableColumnDrag ? handleDragOver : undefined}
        onDrop={enableColumnDrag ? handleDrop : undefined}
        aria-label="Data table with keyboard navigation"
        role="grid"
      >
      <LicenseEnforcer containerRef={parentContainerRef} />
      <DataTableHeader
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleSearchKeyDown}
        onClearSearch={handleClearSearch}
        searchInputRef={searchInputRef}
        filterStore={filterStore}
        filters={filters}
        onClearFilters={handleClearFilters}
        layout={{
          showHeader,
          showSearchBar,
          showColumnVisibility,
          showFilterButton,
          showResetTableButtonInSettings: layout.showResetTableButtonInSettings,
        }}
        headerRightElement={headerRightElement}
        filteredDataLength={filteredData.length}
        labels={labels}
        table={table}
                uiComponents={mergedUIComponents}
        tableStyles={tableStyles}
                icons={effectiveIcons}
        onResetTable={handleResetTable}
      />

      <ScrollAreaComponent
        ref={scrollAreaRef as unknown as React.Ref<HTMLDivElement>}
        className={cn(
          tableStyles.table.scrollArea,
          displayMode === 'table' && effectiveDisplayRows.length === 0 && 'overflow-hidden'
        )}
      >
        {(displayMode === 'grid' || displayMode === 'masonry') && null}
        {displayMode === 'grid' ? (
          <>
            <DataGrid
              displayRows={effectiveDisplayRows}
              displayMode={displayMode}
              idField={idField}
              gridColumns={gridColumns}
              gridItemMinWidth={gridItemMinWidth}
              selectedId={selectedId}
              highlightedId={highlightedId}
              onRowClick={handleRowClick}
              expandable={expandable}
              isRowExpanded={isRowExpanded}
              onToggleExpand={handleToggleExpand}
              renderExpandedContent={renderExpandedContent}
              effectiveColumns={effectiveColumns}
              columnOverrides={columnOverrides}
              columnVisibility={columnVisibility}
              table={table}
              customRenderGridItem={customRenderGridItem}
              customStaticRows={customStaticRows}
              customStaticRowsSticky={customStaticRowsSticky}
              isLoadingMore={effectiveIsLoadingMore}
              isLoadingLess={isLoadingLess}
              shouldEnableInfiniteScroll={shouldEnableInfiniteScroll}
              isVirtualized={isVirtualizationEnabled}
              scrollAreaRef={scrollAreaRef}
              estimateSize={infiniteScrollConfig?.estimateSize}
              overscan={infiniteScrollConfig?.overscan}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
            {effectiveDisplayRows.length === 0 && !isLoading && (
              <DataTableStates
                showLoadingState={false}
                showEmptyState={true}
                isLoading={isLoading}
                loadingText={loadingText}
                emptyStateText={emptyStateText}
                tableStyles={tableStyles}
                icons={effectiveIcons}
              />
            )}
          </>
        ) : displayMode === 'masonry' ? (
          <>
            <DataMasonry
              displayRows={effectiveDisplayRows}
              displayMode={displayMode}
              idField={idField}
              masonryColumns={masonryColumns}
              masonryItemMinWidth={masonryItemMinWidth}
              selectedId={selectedId}
              highlightedId={highlightedId}
              onRowClick={handleRowClick}
              expandable={expandable}
              isRowExpanded={isRowExpanded}
              onToggleExpand={handleToggleExpand}
              renderExpandedContent={renderExpandedContent}
              effectiveColumns={effectiveColumns}
              columnOverrides={columnOverrides}
              columnVisibility={columnVisibility}
              table={table}
              customRenderMasonryItem={customRenderGridItem}
              customStaticRows={customStaticRows}
              customStaticRowsSticky={customStaticRowsSticky}
              isLoadingMore={effectiveIsLoadingMore}
              isLoadingLess={isLoadingLess}
              shouldEnableInfiniteScroll={shouldEnableInfiniteScroll}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
            {effectiveDisplayRows.length === 0 && !isLoading && (
              <DataTableStates
                showLoadingState={false}
                showEmptyState={true}
                isLoading={isLoading}
                loadingText={loadingText}
                emptyStateText={emptyStateText}
                tableStyles={tableStyles}
                icons={effectiveIcons}
              />
            )}
          </>
        ) : (
            <>
              <table
                key={tableResetVersion}
                className={cn(
                  tableStyles.table.table,
                  enableColumnResize && "table-fixed"
                )}
                style={enableColumnResize ? { 
                  tableLayout: 'fixed',
                  // minWidth keeps user sizes; width stays 100% (w-full) so unlocked
                  // columns can still absorb leftover viewport space.
                  minWidth: tableContentWidth ? `${tableContentWidth}px` : undefined,
                } : undefined}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {showTableHeaders && effectiveDisplayRows.length > 0 && (
                  <thead
                    className={cn(
                      tableStyles.table.tableHeader,
                      customStaticRowsSticky && customStaticRows.length > 0 && 'border-b-0',
                    )}
                    ref={headerRef}
                    {...(dragState.isDragging ? { 'data-tf-column-dragging': '' } : {})}
                    // Keep the header above sticky static rows (z-index 10) and
                    // transformed body cells during resize/reorder animations.
                    style={{ zIndex: 20 }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {expandable && <th className={tableStyles.table.expandHeader} />}
                        {headerGroup.headers.map((header, headerIndex) => {
                          const canSort = header.column.getCanSort()
                          const sortDirection = header.column.getIsSorted()
                          const meta = (header.column.columnDef.meta as {
                            className?: string
                            style?: React.CSSProperties
                            lockWidth?: boolean
                          } | undefined) || {}
                          const columnId = header.column.id || String(((header.column.columnDef as { accessorKey?: string })?.accessorKey) || '')
                          
                          const sortIcon = canSort ? (
                            sortDirection === 'asc' ? (
                              <effectiveIcons.SortAscending className="h-4 w-4 ml-1" />
                            ) : sortDirection === 'desc' ? (
                              <effectiveIcons.SortDescending className="h-4 w-4 ml-1" />
                            ) : (
                              <effectiveIcons.SortUnsorted className="h-4 w-4 ml-1 opacity-50" />
                            )
                          ) : null
                          
                          const override = columnOverrides[columnId]
                          const headerAlignment = override?.headerAlignment || 'left'
                          
                          const headerDef = header.column.columnDef.header
                          let isHeaderEmpty = false
                          if (typeof headerDef === 'string') {
                            isHeaderEmpty = !headerDef.trim()
                          } else if (typeof headerDef === 'function') {
                            try {
                              const rendered = headerDef(header.getContext())
                              if (!rendered) isHeaderEmpty = true
                              else if (typeof rendered === 'string') isHeaderEmpty = !rendered.trim()
                              else if (React.isValidElement(rendered)) {
                                const props = rendered.props as { children?: unknown }
                                isHeaderEmpty = !props?.children || 
                                               (typeof props?.children === 'string' && !props.children.trim()) ||
                                               (Array.isArray(props?.children) && props.children.length === 0)
                              }
                            } catch (e) {
                              isHeaderEmpty = false
                            }
                          }
                          
                          const isDragging = dragState.isDragging && dragState.draggedColumnId === columnId;
                          
                          return (
                            <th 
                              key={header.id} 
                              data-column-id={columnId}
                              onClick={(e) => {
                                if (!canSort) return
                                // Scroll to top BEFORE sorting for faster UX
                                scrollToTop()
                                const handler = header.column.getToggleSortingHandler()
                                if (handler) handler(e)
                              }}
                              draggable={enableColumnDrag}
                              onDragStart={(e) => handleDragStart(e, columnId)}
                              onDrag={(e) => queueDragGhostMove(e.clientX, e.clientY)}
                              onDragEnd={handleDragEnd}
                              className={cn(
                                tableStyles.table.tableHeaderCell,
                                canSort && "cursor-pointer select-none",
                                enableColumnDrag && "transition-[transform,opacity] duration-200 ease-out",
                                isDragging && tableStyles.dragDrop.dragSource,
                                enableColumnResize && "relative",
                                meta.className
                              )}
                              style={meta.style}
                            >
                              <SmartHeader
                                text={(() => {
                                  const headerDef = header.column.columnDef.header
                                  if (typeof headerDef === 'string') {
                                    return headerDef
                                  }
                                  
                                  // For function headers, try to extract meaningful text
                                  if (typeof headerDef === 'function') {
                                    try {
                                      const rendered = headerDef(header.getContext())
                                      
                                      // If it's a string, use it
                                      if (typeof rendered === 'string') {
                                        return rendered
                                      }
                                      
                                      // If it's a React element, try to extract text content
                                      if (React.isValidElement(rendered)) {
                                        const props = rendered.props as { children?: unknown }
                                        if (typeof props?.children === 'string') {
                                          return props.children
                                        }
                                        if (Array.isArray(props?.children)) {
                                          const textChildren = props.children.filter((child: unknown) => typeof child === 'string')
                                          if (textChildren.length > 0) {
                                            return textChildren.join(' ')
                                          }
                                        }
                                      }
                                    } catch (e) {
                                      // Fallback to column ID if rendering fails
                                    }
                                  }
                                  
                                  // Final fallback to column ID
                                  return columnId
                                })()}
                                columnId={columnId}
                                sortIcon={sortIcon}
                                isHeaderEmpty={isHeaderEmpty}
                                resizeState={resizeState}
                                headerAlignment={headerAlignment}
                              />
                              
                              {enableColumnResize &&
                                showTableHeaders &&
                                !isColumnWidthLocked(columnOverrides, columnId) && (
                                <div
                                  className={tableStyles.resize.hitslop}
                                  data-tablefront-resize-handle="true"
                                  data-tablefront-edge={
                                    headerIndex === headerGroup.headers.length - 1
                                      ? 'end'
                                      : 'inner'
                                  }
                                  // The default hit area extends beyond a column edge so
                                  // boundaries are easy to grab. At the table's final edge
                                  // that extra width would increase scrollWidth and create a
                                  // scrollbar even when all columns fit, so contain it there.
                                  style={
                                    headerIndex === headerGroup.headers.length - 1
                                      ? { right: 0 }
                                      : undefined
                                  }
                                  onMouseDown={(e) => handleResizeStart(e, columnId)}
                                  onClick={(e) => {
                                    // Prevent all clicks from bubbling up to the sort handler
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleResizeReset(e, columnId);
                                  }}
                                  title="Drag to resize, double-click to reset"
                                >
                                  <div className={tableStyles.resize.handle}>
                                    <div className={tableStyles.resize.indicator} />
                                  </div>
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                )}
                <DataTableBody
                  displayRows={effectiveDisplayRows}
                  table={table}
                  idField={idField}
                  selectedId={selectedId}
                  highlightedId={highlightedId}
                  onRowClick={handleRowClick}
                  expandable={expandable}
                  isRowExpanded={isRowExpanded}
                  onToggleExpand={handleToggleExpand}
                  renderExpandedContent={renderExpandedContent}

                  customStaticRows={customStaticRows}
                  customStaticRowsSticky={customStaticRowsSticky}
                  enableColumnResize={enableColumnResize}
                  tableStyles={tableStyles}
                  icons={effectiveIcons}
                  clampExpandedContentToContainer={clampExpandedContentToContainer}
                  clampStaticRowsToContainer={clampStaticRowsToContainer}
                  scrollAreaRef={scrollAreaRef}
                  rowVirtualizer={rowVirtualizer}
                  isVirtualized={isVirtualizationEnabled && displayMode === 'table'}
                />
              </table>
              {effectiveDisplayRows.length === 0 && !isLoading && (
                <DataTableStates
                  showLoadingState={false}
                  showEmptyState={true}
                  isLoading={isLoading}
                  loadingText={loadingText}
                  emptyStateText={emptyStateText}
                  tableStyles={tableStyles}
                  icons={effectiveIcons}
                />
              )}
            </>
        )}
      </ScrollAreaComponent>
      
      <DataTablePagination
        table={table}
        isUsingPagination={isUsingPagination}
        normalRowsLength={normalRows.length}
        PaginationBtn={PaginationBtn}
        tableStyles={tableStyles}
        icons={effectiveIcons}
      />
      </div>
    </div>
  );
}

