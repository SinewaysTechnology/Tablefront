import React from 'react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
    parseISO,
    isValid
} from 'date-fns'
import {
    toDate
} from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Parse date strings with timezone support
export function parseDate(value: string | Date | undefined, timeZone: string = 'UTC'): Date | undefined {
  if (!value) return undefined

  if (value instanceof Date) return value

  try {
    if (typeof value === 'string' && value.includes('T')) {
      return toDate(parseISO(value), { timeZone })
    }

    const date = new Date(value)
    return isValid(date) ? date : undefined
  } catch {
    return undefined
  }
}

export function truncateText(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
}

export function truncateAtWords(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) return text
    
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.7) {
        return truncated.substring(0, lastSpace).trim() + '...'
    }
    
    return truncated.trim() + '...'
}

export function responsiveTruncate(text: string, options?: {
    mobile?: number
    tablet?: number 
    desktop?: number
}): string {
    const { mobile = 20, tablet = 40, desktop = 60 } = options || {}
    
    if (!text) return text
    
    return truncateAtWords(text, desktop)
}

export interface TruncationConfig {
  defaultLength: number
  patterns: Array<{
    pattern: string | RegExp
    length: number
    priority?: number
  }>
}

export const DEFAULT_TRUNCATION_CONFIG: TruncationConfig = {
  defaultLength: 50,
  patterns: []
}

// Get optimal truncation length based on field name patterns
export function getOptimalTruncationLength(
  fieldName: string, 
  config: TruncationConfig = DEFAULT_TRUNCATION_CONFIG
): number {
  const sortedPatterns = [...config.patterns].sort((a, b) => (b.priority || 0) - (a.priority || 0))
  
  for (const { pattern, length } of sortedPatterns) {
    if (typeof pattern === 'string') {
      if (fieldName.toLowerCase().includes(pattern.toLowerCase())) {
        return length
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(fieldName)) {
        return length
      }
    }
  }
  
  return config.defaultLength
}

export function analyzeContentForTruncation<TData>(
  data: TData[], 
  fieldName: string,
  sampleSize: number = 100
): number {
  if (!data.length) return DEFAULT_TRUNCATION_CONFIG.defaultLength
  
  const sample = data.slice(0, sampleSize)
  const lengths: number[] = []
  
  sample.forEach(row => {
    const value = (row as unknown as Record<string, unknown>)[fieldName]
    if (value != null) {
      const text = String(value)
      lengths.push(text.length)
    }
  })
  
  if (lengths.length === 0) return DEFAULT_TRUNCATION_CONFIG.defaultLength
  
  lengths.sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  const q75 = lengths[Math.floor(lengths.length * 0.75)]
  const max = Math.max(...lengths)
  
  if (max <= 20) return 100
  if (median <= 30) return Math.min(50, q75 + 10)
  if (median <= 50) return Math.min(80, q75 + 15)
  if (median <= 100) return Math.min(120, q75 + 20)
  
  return Math.min(150, q75 + 30)
}

export function getSmartTruncationLength<TData>(
  fieldName: string,
  data?: TData[],
  config: TruncationConfig = DEFAULT_TRUNCATION_CONFIG
): number {
  const patternLength = getOptimalTruncationLength(fieldName, config)
  
  if (data && data.length > 0 && patternLength === config.defaultLength) {
    return analyzeContentForTruncation(data, fieldName)
  }
  
  return patternLength
}

// Drag and Drop utilities
export interface DragState {
  isDragging: boolean
  draggedColumnId: string | null
  dragStartX: number
  dragStartY: number
  currentX: number
  currentY: number
  dropTargetIndex: number | null
  dropTargetColumnId: string | null
}

export const createDragState = (): DragState => ({
  isDragging: false,
  draggedColumnId: null,
  dragStartX: 0,
  dragStartY: 0,
  currentX: 0,
  currentY: 0,
  dropTargetIndex: null,
  dropTargetColumnId: null,
})

export const getColumnIndexFromX = (
  x: number,
  headerCells: HTMLElement[]
): number => {
  for (let i = 0; i < headerCells.length; i++) {
    const cell = headerCells[i]
    const rect = cell.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right) {
      return i
    }
  }
  return -1
}

export const getColumnIdFromElement = (element: HTMLElement): string | null => {
  return element.getAttribute('data-column-id')
}

export const setDragImage = (event: DragEvent, element: HTMLElement) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setDragImage(element, 0, 0)
  }
}

// Enhanced drag utilities for smooth animations
export const getDropTargetIndex = (
  x: number,
  headerCells: HTMLElement[],
  draggedIndex: number
): { index: number; columnId: string | null } => {
  if (headerCells.length === 0) return { index: -1, columnId: null }
  
  // Optimized binary search for better performance with many columns
  let left = 0
  let right = headerCells.length - 1
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const cell = headerCells[mid]
    const rect = cell.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    
    if (x < centerX) {
      right = mid - 1
    } else {
      left = mid + 1
    }
  }
  
  const targetIndex = left
  const targetCell = headerCells[targetIndex] || headerCells[headerCells.length - 1]
  
  return { 
    index: targetIndex, 
    columnId: getColumnIdFromElement(targetCell) 
  }
}

export const addDropIndicator = (
  targetElement: HTMLElement,
  position: 'before' | 'after',
  dropIndicatorClass: string = 'absolute top-0 bottom-0 w-1 bg-primary z-10'
): HTMLElement => {
  const indicator = document.createElement('div')
  indicator.className = dropIndicatorClass
  
  if (position === 'before') {
    indicator.style.left = '0'
  } else {
    indicator.style.right = '0'
  }
  
  targetElement.style.position = 'relative'
  targetElement.appendChild(indicator)
  
  return indicator
}

export const removeDropIndicator = (indicator: HTMLElement | null) => {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator)
  }
}

// Column resize utilities
export interface ResizeState {
  isResizing: boolean
  columnId: string | null
  startX: number
  startWidth: number
}

export const createResizeState = (): ResizeState => ({
  isResizing: false,
  columnId: null,
  startX: 0,
  startWidth: 0,
})

// Constants for resize constraints
export const RESIZE_CONSTRAINTS = {
  MIN_WIDTH: 50,
  MAX_WIDTH: 8000,
} as const

export const clampColumnWidth = (width: number): number =>
  Math.max(RESIZE_CONSTRAINTS.MIN_WIDTH, Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, width))

export const applyResizeCursor = (isResizing: boolean) => {
  if (typeof document === 'undefined') return
  
  if (isResizing) {
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  } else {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

export const getColumnWidth = (element: HTMLElement): number => {
  return element.getBoundingClientRect().width
}

export type ApplyColumnWidthOptions = {
  /** Cached header cell from resize start — skips querySelector on the hot path. */
  headerCell?: HTMLElement | null
  /**
   * When false, only the header is updated.
   * Enough for live drag feedback with `table-layout: fixed`.
   * @default true
   */
  includeBodyCells?: boolean
}

const resolveHeaderCell = (
  columnId: string,
  headerCell?: HTMLElement | null,
): HTMLElement | null =>
  headerCell ??
  (document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement | null)

const getBodyCellsForHeader = (headerCell: HTMLElement): NodeListOf<Element> | null => {
  const table = headerCell.closest('table')
  if (!table) return null
  const columnIndex = Array.from(headerCell.parentElement?.children || []).indexOf(headerCell)
  if (columnIndex < 0) return null
  return table.querySelectorAll(`tbody td:nth-child(${columnIndex + 1})`)
}

/** Apply width for drag feedback or one-shot DOM updates. Avoids forced reflow. */
export const applyColumnWidthToDomImmediate = (
  columnId: string,
  width: number,
  options?: ApplyColumnWidthOptions,
) => {
  const clampedWidth = clampColumnWidth(width)
  const headerCell = resolveHeaderCell(columnId, options?.headerCell)
  if (!headerCell) return clampedWidth

  applyColumnStyles(headerCell, clampedWidth)

  if (options?.includeBodyCells !== false) {
    const bodyCells = getBodyCellsForHeader(headerCell)
    bodyCells?.forEach((cell) => applyColumnStyles(cell as HTMLElement, clampedWidth))
  }

  return clampedWidth
}

/**
 * Locked header-row widths for a resize drag.
 * Freezes every column at its current on-screen width so `table-layout: fixed`
 * + `width: 100%` cannot proportionally reflow (and snap) the active column.
 * Width-locked columns are pinned and never absorb fill/shrink slack.
 */
export type ResizeLayoutLock = {
  table: HTMLElement
  headerCells: HTMLElement[]
  /** Live widths (unlocked columns may grow to fill the viewport). */
  widths: number[]
  /** Immutable widths for `lockWidth` columns (and expand gutter). */
  pinnedWidths: number[]
  locked: boolean[]
  activeIndex: number
  totalWidth: number
  hasPinnedColumns: boolean
}

export type LockTableResizeLayoutOptions = {
  /** Header-cell indexes that must keep a fixed width while another column resizes. */
  lockedIndexes?: Iterable<number>
}

export const parseCssPx = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Resolve CSS length to px for layout math (`px` / `rem`; other units → 0). */
export const cssLengthToPx = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (trimmed.endsWith('%')) return 0
  if (trimmed.endsWith('rem')) {
    const rem = parseFloat(trimmed)
    if (!Number.isFinite(rem)) return 0
    const rootFontSize =
      typeof document !== 'undefined'
        ? parseCssPx(getComputedStyle(document.documentElement).fontSize) || 16
        : 16
    return rem * rootFontSize
  }
  if (trimmed.endsWith('px') || /^-?[\d.]+$/.test(trimmed)) {
    return parseCssPx(trimmed)
  }
  return 0
}

const getTableScrollContainer = (table: HTMLElement): HTMLElement | null =>
  (table.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null) ||
  table.parentElement

/** Set table width so columns keep pixel sizes instead of being compressed into the viewport. */
export const setTableContentWidth = (
  table: HTMLElement,
  contentWidth: number,
  options?: { fillContainer?: boolean },
) => {
  const rounded = Math.max(0, Math.ceil(contentWidth))
  const fillContainer = options?.fillContainer !== false
  if (!fillContainer) {
    table.style.width = `${rounded}px`
    table.style.minWidth = `${rounded}px`
    return
  }

  const scrollParent = getTableScrollContainer(table)
  const containerWidth = scrollParent?.clientWidth ?? 0
  const width = Math.max(rounded, containerWidth)
  table.style.width = `${width}px`
  table.style.minWidth = `${rounded}px`
}

/** Only trust inline `Npx` — rem/em/% would parse incorrectly via parseFloat. */
const readInlinePxWidth = (cell: HTMLElement): number => {
  for (const value of [cell.style.width, cell.style.maxWidth, cell.style.minWidth]) {
    if (typeof value === 'string' && value.trim().endsWith('px')) {
      const px = parseCssPx(value)
      if (px > 0) return px
    }
  }
  return 0
}

const measureCellWidth = (cell: HTMLElement, isPinned: boolean): number => {
  if (isPinned) {
    const fromStyle = readInlinePxWidth(cell)
    if (fromStyle > 0) return fromStyle
  }
  return cell.getBoundingClientRect().width
}

/**
 * Keep pinned columns at their fixed widths; optionally pour leftover viewport
 * space into unlocked columns (never into pinned ones).
 */
const syncResizeLayoutWidths = (lock: ResizeLayoutLock) => {
  // Re-pin locked columns every frame so table fill cannot stretch them
  for (let index = 0; index < lock.headerCells.length; index++) {
    if (lock.locked[index]) {
      lock.widths[index] = lock.pinnedWidths[index] ?? lock.widths[index] ?? 0
    }
  }

  let total = lock.widths.reduce((sum, value) => sum + value, 0)
  const containerWidth = getTableScrollContainer(lock.table)?.clientWidth ?? 0

  if (total < containerWidth) {
    const flexibleIndexes = lock.widths
      .map((_, index) =>
        !lock.locked[index] && index !== lock.activeIndex ? index : -1,
      )
      .filter((index) => index >= 0)

    if (flexibleIndexes.length > 0) {
      const slack = containerWidth - total
      const each = slack / flexibleIndexes.length
      flexibleIndexes.forEach((index) => {
        lock.widths[index] = (lock.widths[index] ?? 0) + each
      })
      total = containerWidth
    }
    // If only the active column is flexible, leave empty space — don't stretch pinned cols
  }

  lock.headerCells.forEach((cell, index) => {
    applyColumnStyles(cell, lock.widths[index] ?? 0)
  })

  lock.totalWidth = total
  // Fill the viewport when possible; pinned lockWidth columns never receive slack
  setTableContentWidth(lock.table, total, {
    fillContainer: !lock.hasPinnedColumns || total >= containerWidth,
  })
}

/** Freeze all header cells at their current measured widths and size the table to match. */
export const lockTableResizeLayout = (
  activeHeaderCell: HTMLElement,
  options?: LockTableResizeLayoutOptions,
): ResizeLayoutLock | null => {
  const table = activeHeaderCell.closest('table') as HTMLElement | null
  const row = activeHeaderCell.parentElement
  if (!table || !row) return null

  const headerCells = Array.from(row.children) as HTMLElement[]
  const activeIndex = headerCells.indexOf(activeHeaderCell)
  if (activeIndex < 0) return null

  const lockedSet = new Set(options?.lockedIndexes ?? [])
  const locked = headerCells.map((_, index) => lockedSet.has(index))
  const widths = headerCells.map((cell, index) => measureCellWidth(cell, locked[index] ?? false))
  const pinnedWidths = widths.map((width, index) => (locked[index] ? width : 0))

  const lock: ResizeLayoutLock = {
    table,
    headerCells,
    widths,
    pinnedWidths,
    locked,
    activeIndex,
    totalWidth: 0,
    hasPinnedColumns: locked.some(Boolean),
  }

  syncResizeLayoutWidths(lock)
  return lock
}

/** Update the active column inside a layout lock and grow/shrink the table with it. */
export const applyLockedColumnResize = (
  lock: ResizeLayoutLock,
  activeWidth: number,
): number => {
  const clampedWidth = clampColumnWidth(activeWidth)
  if (lock.locked[lock.activeIndex]) return lock.widths[lock.activeIndex] ?? clampedWidth

  lock.widths[lock.activeIndex] = clampedWidth
  syncResizeLayoutWidths(lock)
  return clampedWidth
}

/**
 * Width from the column's current left edge to the pointer.
 * Uses live left so auto-reflow on the left doesn't desync the handle from the cursor.
 * `edgeOffset` is pointerX - rightEdge at drag start (hitslop grab correction).
 */
export const measureColumnWidthFromPointer = (
  clientX: number,
  headerCell: HTMLElement,
  edgeOffset: number = 0,
): number => {
  const left = headerCell.getBoundingClientRect().left
  return clampColumnWidth(clientX - left - edgeOffset)
}

/** @deprecated Prefer `applyColumnWidthToDomImmediate`. */
export const applyColumnWidthToDom = (
  columnId: string,
  width: number,
  options?: ApplyColumnWidthOptions,
) => applyColumnWidthToDomImmediate(columnId, width, options)

// Utility to apply consistent column styles
const applyColumnStyles = (element: HTMLElement, width: number) => {
  const px = `${width}px`
  element.style.width = px
  element.style.minWidth = px
  element.style.maxWidth = px
}

// Clear inline column styles (header + body) after reset
export const clearColumnStyles = (columnId: string) => {
  const headerCell = resolveHeaderCell(columnId)
  if (!headerCell) return

  clearElementStyles(headerCell)

  const bodyCells = getBodyCellsForHeader(headerCell)
  bodyCells?.forEach((cell) => clearElementStyles(cell as HTMLElement))
}

// Utility to clear individual element styles
const clearElementStyles = (element: HTMLElement) => {
  element.style.width = ''
  element.style.minWidth = ''
  element.style.maxWidth = ''
}

// Smart header utilities for auto-truncation
export const HEADER_MIN_WIDTH_FOR_TEXT = 40 // Icon (16px) + margins/gaps (8px) + padding (16px)

export const shouldShowHeaderText = (columnWidth: number): boolean => {
  return columnWidth > HEADER_MIN_WIDTH_FOR_TEXT
}

export const truncateHeaderText = (text: string, maxLength: number = 15): string => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Get current column width from DOM
export const getCurrentColumnWidth = (columnId: string): number => {
  const headerCell = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (!headerCell) return 0
  return headerCell.getBoundingClientRect().width
}