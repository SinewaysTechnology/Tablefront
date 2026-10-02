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

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

const NATIVE_DRAG_IMAGE_ATTR = 'data-tablefront-native-drag-image'

const removeNativeDragImage = () => {
  if (typeof document === 'undefined') return
  document.querySelectorAll(`[${NATIVE_DRAG_IMAGE_ATTR}]`).forEach((node) => node.remove())
}

/**
 * Hide the browser's native drag bitmap.
 *
 * Chromium and WebKit on macOS ignore `setDragImage` unless the node is in the
 * document, participates in layout, and has painted pixels. A detached empty
 * canvas falls back to the page favicon (or Safari's globe), which then
 * animates from the top-left of the window to the pointer.
 */
const hideNativeDragImage = (
  dataTransfer: DataTransfer,
  clientX: number,
  clientY: number,
) => {
  removeNativeDragImage()

  const nativeDragImage = document.createElement('canvas')
  nativeDragImage.width = 1
  nativeDragImage.height = 1
  nativeDragImage.setAttribute(NATIVE_DRAG_IMAGE_ATTR, '')
  nativeDragImage.setAttribute('aria-hidden', 'true')

  const context = nativeDragImage.getContext('2d')
  if (context) {
    context.fillStyle = 'rgba(0, 0, 0, 0.01)'
    context.fillRect(0, 0, 1, 1)
  }

  Object.assign(nativeDragImage.style, {
    position: 'fixed',
    left: `${clientX}px`,
    top: `${clientY}px`,
    width: '1px',
    height: '1px',
    display: 'block',
    opacity: '1',
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
    border: '0',
  })

  document.body.appendChild(nativeDragImage)
  dataTransfer.effectAllowed = 'move'
  dataTransfer.setDragImage(nativeDragImage, 0, 0)
}

/** Create a styled DOM ghost while hiding the browser's native drag bitmap. */
export const setDragImage = (
  event: DragEvent,
  element: HTMLElement,
  className: string = '',
): HTMLElement | null => {
  if (!event.dataTransfer || typeof document === 'undefined') return null

  const rect = element.getBoundingClientRect()
  hideNativeDragImage(
    event.dataTransfer,
    Number.isFinite(event.clientX) ? event.clientX : rect.left,
    Number.isFinite(event.clientY) ? event.clientY : rect.top,
  )

  const resolveBackground = (source: HTMLElement): string => {
    let current: HTMLElement | null = source
    while (current) {
      const background = getComputedStyle(current).backgroundColor
      if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return background
      current = current.parentElement
    }
    return 'Canvas'
  }

  const cloneCell = (source: HTMLElement): HTMLElement => {
    const clone = source.cloneNode(true) as HTMLElement
    const computed = getComputedStyle(source)
    clone.removeAttribute('id')
    clone.removeAttribute('draggable')
    Object.assign(clone.style, {
      width: `${rect.width}px`,
      minWidth: `${rect.width}px`,
      maxWidth: `${rect.width}px`,
      height: `${source.getBoundingClientRect().height}px`,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      margin: '0',
      padding: computed.padding,
      color: computed.color,
      font: computed.font,
      textAlign: computed.textAlign,
      whiteSpace: computed.whiteSpace,
      backgroundColor: resolveBackground(source),
      borderTop: computed.borderTop,
      borderRight: computed.borderRight,
      borderBottom: computed.borderBottom,
      borderLeft: computed.borderLeft,
      borderRadius: '0',
    })
    return clone
  }

  const ghost = document.createElement('div')
  ghost.setAttribute('data-tablefront-root', '')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.className = className

  const headerClone = cloneCell(element)
  ghost.appendChild(headerClone)

  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '2147483647',
    width: `${rect.width}px`,
    boxSizing: 'border-box',
    display: 'block',
    overflow: 'hidden',
    pointerEvents: 'none',
    margin: '0',
    padding: '0',
    border: '0',
    borderRadius: '0',
    boxShadow: '0 18px 45px -18px rgba(0,0,0,.42), 0 8px 18px -12px rgba(0,0,0,.28)',
    opacity: '0.98',
    transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
    willChange: 'transform, opacity',
    transition: prefersReducedMotion()
      ? 'none'
      : 'transform 70ms linear, opacity 120ms ease',
  })

  document.body.appendChild(ghost)

  return ghost
}

export const moveDragImage = (ghost: HTMLElement | null, left: number, top: number) => {
  if (!ghost) return
  ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`
}

export const removeDragImage = (ghost: HTMLElement | null) => {
  removeNativeDragImage()
  if (!ghost?.parentNode) return
  if (prefersReducedMotion()) {
    ghost.remove()
    return
  }

  ghost.style.opacity = '0'
  window.setTimeout(() => ghost.remove(), 150)
}

// Enhanced drag utilities for smooth animations
export const getDropTargetIndex = (
  x: number,
  headerCells: HTMLElement[],
  draggedIndex: number,
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
  Object.assign(indicator.style, {
    position: 'fixed',
    left: '0',
    right: 'auto',
    bottom: 'auto',
    pointerEvents: 'none',
    opacity: '0',
    transformOrigin: 'center',
    willChange: 'transform, opacity',
    transition: prefersReducedMotion()
      ? 'none'
      : 'transform 180ms cubic-bezier(.2,.8,.2,1), opacity 120ms ease',
  })
  document.body.appendChild(indicator)
  moveDropIndicator(indicator, targetElement, position)
  requestAnimationFrame(() => {
    indicator.style.opacity = '1'
  })
  return indicator
}

export const moveDropIndicator = (
  indicator: HTMLElement,
  targetElement: HTMLElement,
  position: 'before' | 'after',
) => {
  const rect = targetElement.getBoundingClientRect()
  const x = position === 'before' ? rect.left : rect.right
  indicator.style.top = `${rect.top}px`
  indicator.style.height = `${rect.height}px`
  indicator.style.transform = `translate3d(${x}px, 0, 0) translateX(-50%) scaleY(1)`
}

export const removeDropIndicator = (indicator: HTMLElement | null) => {
  if (indicator && indicator.parentNode) {
    if (prefersReducedMotion()) {
      indicator.remove()
      return
    }
    indicator.style.opacity = '0'
    indicator.style.transform += ' scaleY(0.45)'
    window.setTimeout(() => indicator.remove(), 140)
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
  /** Immutable rendered widths captured before any drag-time styles are applied. */
  initialWidths: number[]
  /** Last widths written to the header cells. */
  widths: number[]
  /** Reused per-frame calculation buffer to avoid allocations while dragging. */
  nextWidths: number[]
  locked: boolean[]
  activeIndex: number
  initialTotalWidth: number
  initialTableWidth: number
  totalWidth: number
  originalTableWidth: string
  originalTableMinWidth: string
  /** Whether drag-time table/cell styles have actually been written. */
  isApplied: boolean
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

const measureCellWidth = (cell: HTMLElement): number =>
  cell.getBoundingClientRect().width

/**
 * Keep the drag-time table width anchored to its rendered starting width.
 * Only actual content growth/shrink changes the outer table width.
 */
const setResizeTableWidth = (lock: ResizeLayoutLock, contentWidth: number) => {
  const contentDelta = contentWidth - lock.initialTotalWidth
  const tableWidth = Math.max(0, lock.initialTableWidth + contentDelta)
  const px = `${tableWidth}px`
  if (lock.table.style.width !== px) lock.table.style.width = px
  if (lock.table.style.minWidth !== px) lock.table.style.minWidth = px
}

/**
 * Keep pinned columns at their fixed widths; optionally pour leftover viewport
 * space into unlocked columns to the right of the active column. Columns on the
 * left stay anchored while a narrower active column is absorbed by the table.
 */
const syncResizeLayoutWidths = (
  lock: ResizeLayoutLock,
  activeWidth: number,
) => {
  // Derive every frame from the immutable starting geometry. This makes the
  // first frame a no-op and prevents cumulative drift when reversing a drag.
  const nextWidths = lock.nextWidths
  for (let index = 0; index < lock.initialWidths.length; index++) {
    nextWidths[index] = lock.initialWidths[index] ?? 0
  }
  const initialActiveWidth = lock.initialWidths[lock.activeIndex] ?? activeWidth
  nextWidths[lock.activeIndex] = activeWidth

  let total = lock.initialTotalWidth + (activeWidth - initialActiveWidth)

  if (activeWidth < initialActiveWidth) {
    let flexibleCount = 0
    for (let index = lock.activeIndex + 1; index < nextWidths.length; index++) {
      if (!lock.locked[index]) flexibleCount += 1
    }

    if (flexibleCount > 0) {
      const slack = lock.initialTotalWidth - total
      const each = slack / flexibleCount
      for (let index = lock.activeIndex + 1; index < nextWidths.length; index++) {
        if (!lock.locked[index]) {
          nextWidths[index] = (nextWidths[index] ?? 0) + each
        }
      }
      total = lock.initialTotalWidth
    }
    // If no right-side column is flexible, shrink the table and leave free space.
  }

  for (let index = 0; index < lock.headerCells.length; index++) {
    const cell = lock.headerCells[index]
    if (!cell) continue
    const nextWidth = nextWidths[index] ?? 0
    if (!lock.isApplied || Math.abs(nextWidth - (lock.widths[index] ?? 0)) > 0.01) {
      applyColumnStyles(cell, nextWidth)
    }
    lock.widths[index] = nextWidth
  }

  lock.totalWidth = total
  setResizeTableWidth(lock, total)
  lock.isApplied = true
}

/** Capture the rendered header geometry for a potential resize drag. */
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
  const initialWidths = headerCells.map(measureCellWidth)
  const initialTotalWidth = initialWidths.reduce((sum, width) => sum + width, 0)

  const lock: ResizeLayoutLock = {
    table,
    headerCells,
    initialWidths,
    widths: [...initialWidths],
    nextWidths: [...initialWidths],
    locked,
    activeIndex,
    initialTotalWidth,
    initialTableWidth: table.getBoundingClientRect().width,
    totalWidth: initialTotalWidth,
    originalTableWidth: table.style.width,
    originalTableMinWidth: table.style.minWidth,
    isApplied: false,
  }

  // Mouse-down only captures geometry. The first actual pointer movement
  // applies the lock, so a click-and-release cannot mutate layout at all.
  return lock
}

/** Update the active column inside a layout lock and grow/shrink the table with it. */
export const applyLockedColumnResize = (
  lock: ResizeLayoutLock,
  activeWidth: number,
): number => {
  const clampedWidth = clampColumnWidth(activeWidth)
  if (lock.locked[lock.activeIndex]) return lock.widths[lock.activeIndex] ?? clampedWidth

  syncResizeLayoutWidths(lock, clampedWidth)
  return clampedWidth
}

/** Exact visible, unlocked column geometry to persist after a resize. */
export const getResizeLayoutColumnWidths = (
  lock: ResizeLayoutLock,
): Record<string, number> => {
  const snapshot: Record<string, number> = {}

  for (let index = 0; index < lock.headerCells.length; index++) {
    if (lock.locked[index]) continue
    const columnId = lock.headerCells[index]?.getAttribute('data-column-id')
    const width = lock.widths[index]
    if (!columnId || typeof width !== 'number' || !Number.isFinite(width) || width <= 0) continue
    snapshot[columnId] = width
  }

  return snapshot
}

/** Restore the table's React-owned inline sizing after a resize session. */
export const releaseTableResizeLayout = (lock: ResizeLayoutLock) => {
  if (!lock.isApplied) return
  lock.table.style.width = lock.originalTableWidth
  lock.table.style.minWidth = lock.originalTableMinWidth
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
  if (element.style.width !== px) element.style.width = px
  if (element.style.minWidth !== px) element.style.minWidth = px
  if (element.style.maxWidth !== px) element.style.maxWidth = px
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

// Get current column width from DOM
export const getCurrentColumnWidth = (columnId: string): number => {
  const headerCell = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (!headerCell) return 0
  return headerCell.getBoundingClientRect().width
}
