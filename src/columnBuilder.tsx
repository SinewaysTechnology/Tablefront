import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { 
  truncateAtWords, 
  getSmartTruncationLength,
  RESIZE_CONSTRAINTS
} from './utils'

// Use different constants for initial column sizing vs resize constraints
const COLUMN_MIN_WIDTH = 70  // Minimum for initial auto-sizing
const COLUMN_MAX_WIDTH = 400  // Maximum for initial auto-sizing
// Note: RESIZE_CONSTRAINTS (50-800) are used for manual resize operations

// Convert camelCase/snake_case field names to readable labels
const formatFieldName = (field: string): string => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

let measureElement: HTMLSpanElement | null = null

function getMeasureElement(): HTMLSpanElement | null {
  if (typeof window === 'undefined') return null
  
  if (!measureElement) {
    measureElement = document.createElement('span')
    measureElement.style.position = 'absolute'
    measureElement.style.visibility = 'hidden'
    measureElement.style.whiteSpace = 'nowrap'
    measureElement.style.left = '-9999px'
    measureElement.style.top = '-9999px'
    document.body.appendChild(measureElement)
  }
  
  return measureElement
}

function measureText(text: string): number {
  if (typeof window === 'undefined') return text.length * 7
  
  const el = getMeasureElement()
  if (!el) return text.length * 7
  
  el.textContent = text
  return el.getBoundingClientRect().width
}

function truncateToFit(text: string, maxWidth: number): string {
  if (!text) return text;
  
  const fullWidth = measureText(text);
  if (fullWidth <= maxWidth) return text;
  
  const ellipsis = '...';
  const ellipsisWidth = measureText(ellipsis);
  const availableWidth = maxWidth - ellipsisWidth;
  
  if (availableWidth <= 0) return ellipsis;
  
  let low = 0;
  let high = text.length;
  let best = 0;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = measureText(text.substring(0, mid));
    if (width <= availableWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return text.substring(0, best) + ellipsis;
}

// Calculate optimal column width based on content and header
function calculateColumnWidth<TData>(
  data: TData[],
  fieldName: string,
  headerText: string,
  canSort: boolean = false
): number {
  const minWidth = COLUMN_MIN_WIDTH
  const maxWidth = COLUMN_MAX_WIDTH
  
  if (!data.length) return minWidth
  
  let contentWidth = Math.min(maxWidth - 50, measureText(headerText))
  
  // Sample first 20 rows to determine content width
  data.slice(0, 20).forEach(row => {
    const value = (row as unknown as Record<string, unknown>)[fieldName]
    if (value != null) {
      const { text } = formatCellValue(value)
      const width = Math.min(maxWidth - 50, measureText(text))
      if (width > contentWidth) contentWidth = width
    }
  })
  
  const sortIconWidth = canSort ? 24 : 0
  
  const finalWidth = contentWidth + 30 + sortIconWidth
  
  const result = Math.min(maxWidth, Math.max(minWidth, finalWidth))
  
  if (result > maxWidth) {
    console.warn(`Width calculation error: ${result} exceeds ${maxWidth}`)
    return maxWidth
  }
  
  return result
}

const calculateSmartColumnWidth = <TData,>(
  column: ColumnDef<TData, any>, 
  data: TData[], 
  columnId: string
): number => {
  if (!data.length) return COLUMN_MIN_WIDTH * 2
  
  const headerText = getColumnHeaderText(column, columnId)
  const canSort = column.enableSorting !== false
  const width = calculateColumnWidth(data, columnId, headerText, canSort)
  
  return width
}

const getColumnHeaderText = <TData,>(column: ColumnDef<TData, any>, columnId: string): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  if (typeof column.header === 'function') {
    return columnId;
  }
  return columnId;
}

const getCellValue = <TData,>(row: TData, column: ColumnDef<TData, any>, columnId: string): unknown => {
  const accessorKey = (column as { accessorKey?: string }).accessorKey
  if (accessorKey) {
    return (row as unknown as Record<string, unknown>)[accessorKey]
  }
  return (row as unknown as Record<string, unknown>)[columnId]
}

export function applySmartSizing<TData>(
  columns: ColumnDef<TData, any>[],
  data: TData[]
): ColumnDef<TData, any>[] {
  if (!data.length) return columns
  
  return columns.map(col => {
    const columnId = col.id || String(((col as { accessorKey?: string })?.accessorKey) || '');
    const existingMeta = (col.meta as { style?: React.CSSProperties } | undefined) || {};
    
    if (existingMeta.style?.width || existingMeta.style?.minWidth) {
      return col;
    }
    
    const width = calculateSmartColumnWidth(col, data, columnId);
    
    return {
      ...col,
      meta: {
        ...existingMeta,
        style: {
          ...existingMeta.style,
          // Prefer width/minWidth only — omit maxWidth so unlocked columns can
          // grow and fill the table when the viewport is wider than content.
          width: `${width}px`,
          minWidth: `${width}px`,
        }
      }
    };
  });
}

// Helper function to detect data type and format value appropriately
const formatCellValue = (value: any): { text: string; isComplex: boolean } => {
  if (value == null || value === '') {
    return { text: '', isComplex: false }
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { text: 'Empty', isComplex: false }
    }
    
    // Check if it's an array of objects (complex)
    if (typeof value[0] === 'object' && value[0] !== null) {
      return { text: `${value.length} items`, isComplex: true }
    }
    
    // Simple array - show first few items
    const displayItems = value.slice(0, 3)
    const text = displayItems.join(', ')
    const suffix = value.length > 3 ? ` +${value.length - 3} more` : ''
    return { text: text + suffix, isComplex: false }
  }
  
  // Handle objects
  if (typeof value === 'object') {
    // Check if it's a date
    if (value instanceof Date) {
      return { text: value.toLocaleDateString(), isComplex: false }
    }
    
    // Check if it has common object properties that indicate it's a complex object
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return { text: 'Empty object', isComplex: false }
    }
    
    // If it has many properties or nested objects, treat as complex
    const hasNestedObjects = keys.some(key => 
      typeof value[key] === 'object' && value[key] !== null && !Array.isArray(value[key])
    )
    
    if (hasNestedObjects || keys.length > 5) {
      return { text: `${keys.length} properties`, isComplex: true }
    }
    
    // Simple object - show key-value pairs
    const displayPairs = keys.slice(0, 2).map(key => `${key}: ${value[key]}`)
    const text = displayPairs.join(', ')
    const suffix = keys.length > 2 ? ` +${keys.length - 2} more` : ''
    return { text: text + suffix, isComplex: false }
  }
  
  // Handle primitive types
  if (typeof value === 'boolean') {
    return { text: value ? 'Yes' : 'No', isComplex: false }
  }
  
  if (typeof value === 'number') {
    // Check if it looks like currency
    if (value >= 1000 && value % 1 === 0) {
      return { text: value.toLocaleString(), isComplex: false }
    }
    return { text: String(value), isComplex: false }
  }
  
  // Default to string
  return { text: String(value), isComplex: false }
}

export function quickColumns<TData>(
  data: TData[],
  options?: { idField?: keyof TData; autoSize?: boolean }
): ColumnDef<TData, any>[] {
  if (!data.length) return []
  
  const autoSize = options?.autoSize ?? true
  
  const fields = new Set<keyof TData>()
  data.slice(0, 5).forEach(row => {
    Object.keys(row as object).forEach(key => {
      fields.add(key as keyof TData)
    })
  })
  
  let columns: ColumnDef<TData, any>[] = Array.from(fields).map(field => {
    const fieldStr = String(field)
    
    return ({
      id: fieldStr,
      accessorKey: fieldStr,
      header: formatFieldName(fieldStr),
      enableHiding: true,
      enableSorting: true,
      cell: ({ getValue, column }: { getValue: () => any; column: any }) => {
        const value = getValue()
        const { text, isComplex } = formatCellValue(value)
        
        if (!text) return <div></div>
        
        // For complex objects, show a more compact display
        if (isComplex) {
          return (
            <div 
              className="overflow-hidden text-ellipsis whitespace-nowrap w-full text-xs text-muted-foreground"
              title={text}
              style={{ 
                maxWidth: '100%',
                minWidth: 0
              }}
            >
              {text}
            </div>
          )
        }
        
        // For simple values, use normal display
        return (
          <div 
            className="overflow-hidden text-ellipsis whitespace-nowrap w-full"
            title={text.length > 30 ? text : undefined}
            style={{ 
              maxWidth: '100%',
              minWidth: 0
            }}
          >
            {text}
          </div>
        )
      }
    }) as ColumnDef<TData, any>
  })
  
  if (autoSize) {
    columns = applySmartSizing(columns, data)
  }
  
  return columns
} 