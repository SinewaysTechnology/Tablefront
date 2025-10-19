import type { ColumnDef } from '@tanstack/react-table'
import React from 'react'

// Header alignment options
export type HeaderAlignment = 'left' | 'center' | 'right'

// Simplified column override system - 5 essential props for maximum flexibility
export interface ColumnOverrides<TData = any> {
  [columnId: string]: {
    // Core properties
    visible?: boolean                           // Show/hide column
    header?: string | (() => React.ReactNode)  // Header content with full styling control
    cell?: (info: any) => React.ReactNode      // Cell content with full styling control
    headerAlignment?: HeaderAlignment          // Header text and sort icon alignment
    meta?: {                                    // Column-level styling (width, etc.)
      className?: string                        // Applied to both header and cells
      [key: string]: any
    }
  }
}

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
    if (override.meta) {
      const existingMeta = (updatedCol.meta as { [key: string]: unknown } | undefined) || {};
      updatedCol.meta = {
        ...existingMeta,
        ...override.meta
      };
    }
    
    return updatedCol;
  });
}

// Separate interface for simple visibility overrides
export interface ColumnVisibilityOverrides {
  [columnId: string]: boolean
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