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

// Optimized DOM column width setting with batch updates (for non-drag operations)
export const applyColumnWidthToDom = (columnId: string, width: number) => {
  const clampedWidth = Math.max(RESIZE_CONSTRAINTS.MIN_WIDTH, Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, width))
  
  const headerCell = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (!headerCell) return clampedWidth
  
  const table = headerCell.closest('table')
  const columnIndex = Array.from(headerCell.parentElement?.children || []).indexOf(headerCell)
  
  // Batch DOM updates to reduce reflows
  requestAnimationFrame(() => {
    // Update header cell
    applyColumnStyles(headerCell, clampedWidth)
    
    // Update body cells if table exists
    if (table && columnIndex >= 0) {
      const bodyCells = table.querySelectorAll(`tbody td:nth-child(${columnIndex + 1})`)
      bodyCells.forEach(cell => {
        applyColumnStyles(cell as HTMLElement, clampedWidth)
      })
    }
    
    // Force layout recalculation only once
    headerCell.offsetWidth
  })
  
  return clampedWidth
}

// Immediate DOM column width setting for real-time drag feedback (no requestAnimationFrame)
export const applyColumnWidthToDomImmediate = (columnId: string, width: number) => {
  const clampedWidth = Math.max(RESIZE_CONSTRAINTS.MIN_WIDTH, Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, width))
  
  const headerCell = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (!headerCell) return clampedWidth
  
  const table = headerCell.closest('table')
  const columnIndex = Array.from(headerCell.parentElement?.children || []).indexOf(headerCell)
  
  // Apply styles immediately for real-time feedback
  applyColumnStyles(headerCell, clampedWidth)
  
  // Update body cells immediately
  if (table && columnIndex >= 0) {
    const bodyCells = table.querySelectorAll(`tbody td:nth-child(${columnIndex + 1})`)
    bodyCells.forEach(cell => {
      applyColumnStyles(cell as HTMLElement, clampedWidth)
    })
  }
  
  // Force immediate layout recalculation
  headerCell.offsetWidth
  
  return clampedWidth
}

// Utility to apply consistent column styles
const applyColumnStyles = (element: HTMLElement, width: number) => {
  element.style.width = `${width}px`
  element.style.minWidth = `${width}px`
  element.style.maxWidth = `${width}px`
}

// Optimized function to clear column styles
export const clearColumnStyles = (columnId: string) => {
  const headerCell = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (!headerCell) return
  
  const table = headerCell.closest('table')
  const columnIndex = Array.from(headerCell.parentElement?.children || []).indexOf(headerCell)
  
  // Clear header styles
  clearElementStyles(headerCell)
  
  // Clear body cell styles
  if (table && columnIndex >= 0) {
    const bodyCells = table.querySelectorAll(`tbody td:nth-child(${columnIndex + 1})`)
    bodyCells.forEach(cell => {
      clearElementStyles(cell as HTMLElement)
    })
  }
  
  // Force layout recalculation
  headerCell.offsetWidth
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