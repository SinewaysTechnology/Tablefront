"use client"

import React, { useEffect, useRef, useCallback, useState, useMemo, KeyboardEvent, startTransition } from "react";
import { useWindowResize } from './hooks/useWindowResize'
import { DEFAULT_RESIZE_DOUBLE_CLICK_DELAY, DEFAULT_RESIZE_RESET_DEBOUNCE } from './constants/resize'
import { 
  cn, 
  createDragState, 
  setDragImage, 
  getDropTargetIndex,
  addDropIndicator,
  removeDropIndicator,
  createResizeState,
  applyResizeCursor,
  getColumnWidth,
  applyColumnWidthToDomImmediate,
  clearColumnStyles,
  RESIZE_CONSTRAINTS,
} from './utils'
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
  isLoading = false,

  layout = {},
  paginationConfig,
  infiniteScrollConfig,
  enableColumnDrag = true,
  enableColumnResize = true,
  resizeTimingConfig = {},
}: DataTableProps<TData>) {

  // Extract timing configuration with defaults
  const resizeDoubleClickDelay = resizeTimingConfig.doubleClickDelay ?? DEFAULT_RESIZE_DOUBLE_CLICK_DELAY
  const resizeResetDebounce = resizeTimingConfig.resetDebounce ?? DEFAULT_RESIZE_RESET_DEBOUNCE
  
  const tableStyles = useTableStyles(customStyles)
  const effectiveIcons = useDataTableIcons(icons)
  
  const {
    Button, 
    PaginationButton,
    ScrollArea,
  } = uiComponents

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
    setColumnWidth,
    resetColumnWidth,
    filteredData,
    normalRows,
    displayRows,
    table,
    resizeState,
    setResizeState,
    resetInProgress,
    setResetInProgress,
    resizeEndTimeoutRef,
    setTableRefreshKey,
    setPagination,
    setColumnOrder,
    columnOrder,
    pagination,
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

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>(createDragState());
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const dropIndicatorRef = useRef<HTMLElement | null>(null);
  const headerCellsRef = useRef<HTMLElement[]>([]);
  const headerHeightRef = useRef(0);
  const stickyStaticRowsHeightRef = useRef(0);

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

  // Centralized infinite scroll manager (regular + adaptive) with rAF
  const {
    effectiveDisplayRows,
    effectiveIsLoadingMore,
    adaptiveIsLoadingLess,
    adaptiveScrollEnabled,
    shouldEnableInfiniteScroll,
  } = useInfiniteScrollManager({
    normalRows,
    displayRows,
    scrollAreaRef,
    pagination,
    setPagination,
    infiniteScrollConfig,
    isUsingPagination,
    displayMode,
    windowSize,
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
      }, [effectiveDisplayRows, onRowClick, selectedId, idField, scrollAreaRef, expandable, effectiveExpandedRows, onToggleExpand, onExpansionChange, internalExpandedRows, isUsingPagination, table, scrollToTop, scrollToBottom, highlightIndex]);

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
   * Reorders columns in the array by moving an item from draggedIndex to dropIndex
   */
  const reorderColumns = useCallback((currentOrder: string[], draggedIndex: number, dropIndex: number): string[] => {
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    
    // Adjust drop index if we're moving to the right
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newOrder.splice(adjustedDropIndex, 0, currentOrder[draggedIndex]);
    
    return newOrder;
  }, []);

  /**
   * Cleans up the drop indicator element and resets the reference
   */
  const cleanupDropIndicator = useCallback(() => {
    if (dropIndicatorRef.current) {
      removeDropIndicator(dropIndicatorRef.current);
      dropIndicatorRef.current = null;
    }
  }, []);

  // ============================================================================
  // DRAG AND DROP EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handles the start of a column drag operation
   */
  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    if (!enableColumnDrag) return;
    
    const target = e.currentTarget;
    setDragImage(e.nativeEvent, target);
    
    if (headerRef.current) {
      headerCellsRef.current = Array.from(
        headerRef.current.querySelectorAll('th[data-column-id]')
      ) as HTMLElement[];
    }
    
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedColumnId: columnId,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    }));
  }, [enableColumnDrag]);

  /**
   * Handles drag over events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!enableColumnDrag || !dragState.isDragging || !dragState.draggedColumnId) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const draggedIndexInOrder = (() => {
      try {
        const order = table.getState().columnOrder
        return order.indexOf(dragState.draggedColumnId as string)
      } catch {
        return -1
      }
    })()
    const { index: dropIndex, columnId: dropColumnId } = getDropTargetIndex(
      currentX,
      headerCellsRef.current,
      draggedIndexInOrder
    );
    
    const currentTargetIndex = dragState.dropTargetIndex;
    if (dropIndex !== currentTargetIndex) {
      if (dropIndicatorRef.current) {
        removeDropIndicator(dropIndicatorRef.current);
        dropIndicatorRef.current = null;
      }
      
      const len = headerCellsRef.current.length
      if (dropIndex >= 0 && dropIndex < len) {
        const targetCell = headerCellsRef.current[dropIndex]
        const indicator = addDropIndicator(targetCell, 'before', tableStyles.dragDrop.dropIndicator)
        dropIndicatorRef.current = indicator
      } else if (dropIndex === len && len > 0) {
        // Show indicator at the far right when dropping at the end
        const targetCell = headerCellsRef.current[len - 1]
        const indicator = addDropIndicator(targetCell, 'after', tableStyles.dragDrop.dropIndicator)
        dropIndicatorRef.current = indicator
      }
    }
    
    setDragState(prev => ({
      ...prev,
      currentX,
      currentY,
      dropTargetIndex: dropIndex,
      dropTargetColumnId: dropColumnId,
    }));
  }, [enableColumnDrag, dragState.isDragging, dragState.draggedColumnId, dragState.dropTargetIndex, tableStyles.dragDrop.dropIndicator, table]);

  /**
   * Handles drop events
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!enableColumnDrag || !dragState.isDragging || !dragState.draggedColumnId) return;
    
    e.preventDefault();
    
    const draggedColumnId = dragState.draggedColumnId;
    const dropIndex = dragState.dropTargetIndex;
    
    if (dropIndex === null || dropIndex === -1) return;
    
    const currentOrder = table.getState().columnOrder;
    const draggedIndex = currentOrder.indexOf(draggedColumnId);
    
    if (draggedIndex === -1) return;

    // Map the visible drop index to the actual index in currentOrder,
    // accounting for hidden columns that are not present in headerCellsRef
    let targetIndexInOrder = dropIndex
    const visibleCount = headerCellsRef.current.length
    if (dropIndex === visibleCount) {
      // Dropping at the far right -> insert at end of currentOrder
      targetIndexInOrder = currentOrder.length
    } else if (dragState.dropTargetColumnId) {
      const idx = currentOrder.indexOf(dragState.dropTargetColumnId)
      if (idx !== -1) targetIndexInOrder = idx
    }

    const newOrder = reorderColumns(currentOrder, draggedIndex, targetIndexInOrder);
    setColumnOrder(newOrder);
    cleanupDropIndicator();
    setDragState(createDragState());
  }, [enableColumnDrag, dragState.isDragging, dragState.draggedColumnId, dragState.dropTargetIndex, table, setColumnOrder, reorderColumns, cleanupDropIndicator]);

  /**
   * Handles drag end events
   */
  const handleDragEnd = useCallback(() => {
    cleanupDropIndicator();
    setDragState(createDragState());
  }, [cleanupDropIndicator]);

  // ============================================================================
  // COLUMN RESIZE EVENT HANDLERS
  // ============================================================================

  /**
   * Handles double-click to reset column width to automatic sizing
   */
  const handleResizeReset = useCallback((e: React.MouseEvent, columnId: string) => {
    if (!enableColumnResize) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Cancel any pending resize end operation immediately
    const hadPendingOperation = !!resizeEndTimeoutRef.current;
    if (resizeEndTimeoutRef.current) {
      clearTimeout(resizeEndTimeoutRef.current);
      resizeEndTimeoutRef.current = null;
    }
    
    // Set flag to prevent any resize operations
    setResetInProgress(true);
    
    // Reset any ongoing resize state first
    if (resizeState.isResizing) {
      setResizeState(createResizeState());
      applyResizeCursor(false);
    }
    
    // Check if there's actually a stored width to reset
    const hasStoredWidth = columnWidths[columnId]?.isUserSet;
    
    if (hasStoredWidth) {
      resetColumnWidth(columnId);
      clearColumnStyles(columnId);
    } else if (hadPendingOperation) {
      // Restore automatic calculated width from column definition
      const column = effectiveColumns.find(col => {
        const accessorKey = (col as { accessorKey?: string }).accessorKey
        return (col.id || String(accessorKey || '')) === columnId
      });
      
      if (column) {
        const widthStr = (column.meta as { style?: { width?: string } } | undefined)?.style?.width;
        if (widthStr) {
          const autoWidth = parseInt(String(widthStr).replace('px', ''), 10);
          if (autoWidth > 0) {
            applyColumnWidthToDomImmediate(columnId, autoWidth);
          }
        }
      }
    } else {
      clearColumnStyles(columnId);
    }
    
    // Force table recalculation
    setTableRefreshKey(prev => prev + 1);
    
    // Clear the reset flag
    setTimeout(() => setResetInProgress(false), resizeResetDebounce);
      }, [enableColumnResize, resetColumnWidth, setTableRefreshKey, resizeState.isResizing, columnWidths, effectiveColumns, resizeResetDebounce]);

  /**
   * Handles the start of a column resize operation
   */
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    if (!enableColumnResize || e.detail === 2 || resetInProgress) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const headerCell = e.currentTarget.closest('th') as HTMLElement;
    if (!headerCell) return;
    
    setResizeState({
      isResizing: true,
      columnId,
      startX: e.clientX,
      startWidth: getColumnWidth(headerCell),
    });
    
    applyResizeCursor(true);
  }, [enableColumnResize, resetInProgress]);

  /**
   * Handles mouse move during column resize
   */
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.columnId || resetInProgress) return;
    
    const deltaX = e.clientX - resizeState.startX;
    const newWidth = Math.max(
      RESIZE_CONSTRAINTS.MIN_WIDTH, 
      Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, resizeState.startWidth + deltaX)
    );
    
    // Apply width immediately for real-time feedback (no delay)
    applyColumnWidthToDomImmediate(resizeState.columnId, newWidth);
  }, [resizeState, resetInProgress]);

  /**
   * Handles the end of a column resize operation
   */
  const handleResizeEnd = useCallback((e: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.columnId || resetInProgress) return;
    
    const deltaX = e.clientX - resizeState.startX;
    const finalWidth = Math.max(
      RESIZE_CONSTRAINTS.MIN_WIDTH, 
      Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, resizeState.startWidth + deltaX)
    );
    
    const currentColumnId = resizeState.columnId;
    
    // Reset UI state immediately
    setResizeState(createResizeState());
    applyResizeCursor(false);
    
    // Clear any existing timeout
    if (resizeEndTimeoutRef.current) {
      clearTimeout(resizeEndTimeoutRef.current);
    }
    
    // Delay persisting to store to detect potential double-click
    resizeEndTimeoutRef.current = setTimeout(() => {
      setColumnWidth(currentColumnId, finalWidth);
      resizeEndTimeoutRef.current = null;
    }, resizeDoubleClickDelay);
    
      }, [resizeState, setColumnWidth, resetInProgress, resizeDoubleClickDelay]);

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (resizeState.isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizeState.isResizing, handleResizeMove, handleResizeEnd]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeEndTimeoutRef.current) {
        clearTimeout(resizeEndTimeoutRef.current);
        resizeEndTimeoutRef.current = null;
      }
    };
  }, []);

  // Memoize global drop zone to prevent unnecessary re-renders
  const globalDropZone = useMemo(() => {
    if (!enableColumnDrag || !dragState.isDragging) return null;
    
    return (
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    );
  }, [enableColumnDrag, dragState.isDragging, handleDragOver, handleDrop, handleDragEnd]);

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
    <>
      {globalDropZone}
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
        }}
        headerRightElement={headerRightElement}
        filteredDataLength={filteredData.length}
                table={table}
                uiComponents={uiComponents}
        tableStyles={tableStyles}
                icons={effectiveIcons}
      />

      <div
        ref={scrollAreaRef}
        className={cn(
          tableStyles.table.scrollArea,
          displayMode === 'table' && effectiveDisplayRows.length === 0 && 'overflow-hidden'
        )}
      >
        <ScrollAreaComponent>
        {(displayMode === 'grid' || displayMode === 'masonry') && null}
        {displayMode === 'grid' ? (
          effectiveDisplayRows.length > 0 ? (
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
              isLoadingLess={adaptiveScrollEnabled ? adaptiveIsLoadingLess : undefined}
              shouldEnableInfiniteScroll={shouldEnableInfiniteScroll || adaptiveScrollEnabled}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
          ) : (
            <DataTableStates
              showLoadingState={false}
              showEmptyState={true}
              isLoading={isLoading}
              loadingText={loadingText}
              emptyStateText={emptyStateText}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
          )
        ) : displayMode === 'masonry' ? (
          effectiveDisplayRows.length > 0 ? (
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
              isLoadingLess={adaptiveScrollEnabled ? adaptiveIsLoadingLess : undefined}
              shouldEnableInfiniteScroll={shouldEnableInfiniteScroll || adaptiveScrollEnabled}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
          ) : (
            <DataTableStates
              showLoadingState={false}
              showEmptyState={true}
              isLoading={isLoading}
              loadingText={loadingText}
              emptyStateText={emptyStateText}
              tableStyles={tableStyles}
              icons={effectiveIcons}
            />
          )
        ) : (
            <>
              <table 
                className={cn(
                  tableStyles.table.table,
                  enableColumnResize && "table-fixed"
                )}
                style={enableColumnResize ? { 
                  tableLayout: 'fixed',
                  // minWidth: '100%'
                } : undefined}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {showTableHeaders && effectiveDisplayRows.length > 0 && (
                  <thead className={cn(tableStyles.table.tableHeader, customStaticRowsSticky && customStaticRows.length > 0 && 'border-b-0')} ref={headerRef}>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {expandable && <th className={tableStyles.table.expandHeader} />}
                        {headerGroup.headers.map((header) => {
                          const canSort = header.column.getCanSort()
                          const sortDirection = header.column.getIsSorted()
                          const meta = (header.column.columnDef.meta as { className?: string; style?: React.CSSProperties } | undefined) || {}
                          
                          const sortIcon = canSort ? (
                            sortDirection === 'asc' ? (
                              <effectiveIcons.SortAscending className="h-4 w-4 ml-1" />
                            ) : sortDirection === 'desc' ? (
                              <effectiveIcons.SortDescending className="h-4 w-4 ml-1" />
                            ) : (
                              <effectiveIcons.SortUnsorted className="h-4 w-4 ml-1 opacity-50" />
                            )
                          ) : null
                          
                          const columnId = header.column.id || String(((header.column.columnDef as { accessorKey?: string })?.accessorKey) || '')
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
                          
                          // Optimize drag state calculations
                          const isDragging = dragState.isDragging && dragState.draggedColumnId === columnId;
                          const isDragTarget = dragState.isDragging && !isDragging;
                          
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
                              onDragEnd={handleDragEnd}
                              className={cn(
                                tableStyles.table.tableHeaderCell,
                                canSort && "cursor-pointer select-none",
                                isDragging && tableStyles.dragDrop.dragSource,
                                isDragTarget && tableStyles.dragDrop.dragTarget,
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
                              
                              {enableColumnResize && showTableHeaders && (
                                <div
                                  className={tableStyles.resize.hitslop}
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
      </div>
      
      <DataTablePagination
        table={table}
        isUsingPagination={isUsingPagination}
        normalRowsLength={normalRows.length}
        PaginationBtn={PaginationBtn}
        tableStyles={tableStyles}
        icons={effectiveIcons}
      />
    </div>
    </>
  );
}

