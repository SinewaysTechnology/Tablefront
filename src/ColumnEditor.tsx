import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'

// Header alignment options
export type HeaderAlignment = 'left' | 'center' | 'right'

// Simplified column override system
export interface ColumnOverrides<TData = any> {
  [columnId: string]: {
    // Core properties
    visible?: boolean                           // Show/hide column
    header?: string | (() => React.ReactNode)  // Header content with full styling control
    cell?: (info: any) => React.ReactNode      // Cell content with full styling control
    headerAlignment?: HeaderAlignment          // Header text and sort icon alignment
    /**
     * Lock column width — hides the resize handle and ignores user resize/store widths.
     * Pair with `width` or `meta.style` width/minWidth/maxWidth.
     */
    lockWidth?: boolean
    /** Convenience fixed width (number = px). Applied when set; use with `lockWidth`. */
    width?: number | string
    meta?: {                                    // Column-level styling (width, etc.)
      className?: string                        // Applied to both header and cells
      lockWidth?: boolean
      [key: string]: any
    }
  }
}

export const isColumnWidthLocked = <TData,>(
  columnOverrides: ColumnOverrides<TData> | undefined,
  columnId: string,
): boolean => {
  const override = columnOverrides?.[columnId]
  if (!override) return false
  return override.lockWidth === true || override.meta?.lockWidth === true
}

const toCssWidth = (width: number | string): string =>
  typeof width === 'number' ? `${width}px` : width

/**
 * Applies simplified column overrides with 4 essential props
 * @param baseColumns - The original columns to modify
 * @param columnOverrides - Simple override settings for columns
 * @returns Modified columns with overrides applied
 */
export function applyColumnOverrides<TData>(
  baseColumns: ColumnDef<TData, any>[],
  columnOverrides: ColumnOverrides<TData> = {}
): ColumnDef<TData, any>[] {
  // Skip override processing if no overrides provided
  if (!columnOverrides || Object.keys(columnOverrides).length === 0) {
    return baseColumns;
  }
  
  // Apply column overrides
  return baseColumns.map(col => {
    const columnId = col.id || String(((col as { accessorKey?: string })?.accessorKey) || '')
    const override = columnOverrides[columnId]
    
    if (!override) return col;
    
    // Create updated column with overrides
    const updatedCol = { ...col };
    
    // Apply header - use directly without any processing
    if (override.header !== undefined) {
      updatedCol.header = override.header;
    }
    
    if (override.cell !== undefined) {
      updatedCol.cell = override.cell;
    }
    
    // Handle visibility (sets enableHiding for column visibility controls)
    if (override.visible === false) {
      updatedCol.enableHiding = true;
    }
    
    // Handle meta - merge with existing
    const existingMeta = (updatedCol.meta as {
      className?: string
      style?: React.CSSProperties
      lockWidth?: boolean
      [key: string]: unknown
    } | undefined) || {}

    const nextMeta = {
      ...existingMeta,
      ...(override.meta || {}),
      style: {
        ...(existingMeta.style || {}),
        ...((override.meta?.style as React.CSSProperties | undefined) || {}),
      },
    }

    if (override.width !== undefined) {
      const cssWidth = toCssWidth(override.width)
      nextMeta.style = {
        ...nextMeta.style,
        width: cssWidth,
        minWidth: cssWidth,
        maxWidth: cssWidth,
      }
    }

    if (override.lockWidth === true || override.meta?.lockWidth === true) {
      nextMeta.lockWidth = true
      // TanStack flag (harmless if unused); documents non-resizable intent
      ;(updatedCol as { enableResizing?: boolean }).enableResizing = false
    }

    updatedCol.meta = nextMeta
    
    return updatedCol;
  });
}

// Separate interface for simple visibility overrides
export interface ColumnVisibilityOverrides {
  [columnId: string]: boolean
}

export type InitialColumnVisibilityLike = {
  byId?: { [columnId: string]: boolean }
  hideAll?: boolean
}

const getColumnId = <TData,>(col: ColumnDef<TData, any>): string =>
  col.id || String(((col as { accessorKey?: string })?.accessorKey) || '')

/**
 * Resolve the configured default visibility preset.
 * Order: hideAll baseline → initialColumnVisibility.byId → columnOverrides.visible
 */
export function buildDefaultColumnVisibility<TData>(
  columns: ColumnDef<TData, any>[],
  initialColumnVisibility?: InitialColumnVisibilityLike,
  columnOverrides: ColumnOverrides<TData> = {},
): Record<string, boolean> {
  const byId = initialColumnVisibility?.byId ?? {}
  const hideAll = initialColumnVisibility?.hideAll === true
  const next: Record<string, boolean> = {}

  for (const col of columns) {
    const columnId = getColumnId(col)
    if (!columnId) continue
    next[columnId] = hideAll ? false : true
  }

  for (const [columnId, visible] of Object.entries(byId)) {
    next[columnId] = visible
  }

  for (const [columnId, override] of Object.entries(columnOverrides)) {
    if (override?.visible !== undefined) {
      next[columnId] = override.visible
    }
  }

  // Columns that cannot be hidden stay visible
  for (const col of columns) {
    const columnId = getColumnId(col)
    if (columnId && (col as { enableHiding?: boolean }).enableHiding === false) {
      next[columnId] = true
    }
  }

  return next
}

/**
 * Applies column visibility overrides to column visibility state
 * @param baseVisibility - The base visibility state
 * @param columns - The columns to check
 * @param visibilityOverrides - Simple visibility overrides (columnId: boolean)
 * @returns Updated visibility state with overrides applied
 */
export function applyColumnVisibilityOverrides<TData>(
  baseVisibility: Record<string, boolean>,
  columns: ColumnDef<TData, any>[],
  visibilityOverrides: ColumnVisibilityOverrides = {}
): Record<string, boolean> {
  const enforced = { ...baseVisibility };
  
  // Apply column visibility overrides
  Object.keys(visibilityOverrides).forEach(columnId => {
    enforced[columnId] = visibilityOverrides[columnId];
  });
  
  // Force visibility for columns that cannot be hidden
  columns.forEach((column) => {
    const columnDef = column as { id?: string; accessorKey?: string; enableHiding?: boolean };
    const columnId = columnDef.id || String(columnDef.accessorKey || '');
    
    if (columnDef.enableHiding === false && columnId) {
      enforced[columnId] = true;
    }
  });
  
  return enforced;
}
