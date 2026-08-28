import { useMemo } from 'react'
import { cn } from './utils'
import { defaultTableStyles } from './defaultStyles'

// Simplified style interface - focused on essential styling points but maintaining necessary structure
export interface TableStyles {
  // Core layout
  container: string
  
  // Search bar section
  searchBar: {
    wrapper: string
    containerWrapper: string
    container: string
    icon: string
    input: string
    clearButton: string
    clearButtonIcon: string
  }
  
  // Header section with controls
  header: {
    container: string
    leftSection: string
    resultCount: string
    clearFiltersButton: string
    clearFiltersIcon: string
    rightSection: string
  }
  
  // Table area
  table: {
    scrollArea: string
    table: string
    tableHeader: string
    tableRow: string
    tableRowSelected: string
    tableRowHover: string
    tableCell: string
    tableHeaderCell: string
    tableBodyRefreshing: string
    expandHeader: string
    expandButton: string
  }
  
  // Grid area
  grid: {
    container: string
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
  
  // Masonry area
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
  
  // States
  loadingState: {
    container: string
    content: string
    icon: string
    text: string
  }
  
  emptyState: {
    container: string
    content: string
    text: string
  }
  
  // Pagination
  pagination: {
    variant?: "version1" | "version2"
    container: string
    info: string
    controls: string
    buttonGroup: string
    button: string
    buttonIcon: string
  }
  
  // Column visibility popover
  columnVisibility: {
    trigger: string
    triggerIcon: string
    content: string
    header: string
    toggleAllButton: string
    itemList: string
    item: string
    checkbox: string
  }
  
  // Filter popover
  filterPopover: {
    trigger: string
    triggerIcon: string
    content: string
    container: string
    header: string
    title: string
    grid: string
    column: string
    filterButton: string
    filterButtonActive: string
    filterButtonInactive: string
    filterLabel: string
  }
  
  // Interactive features
  dragDrop: {
    dragGhost: string
    dropIndicator: string
    dragTarget: string
    dragSource: string
  }
  
  resize: {
    handle: string
    indicator: string
    overlay: string
    hitslop: string
  }
}

// Partial interface for custom overrides
export type PartialTableStyles = Partial<TableStyles>

// Minimal base styles - just structure, no visual styling
const baseStyles: TableStyles = {
  container: "flex-1 w-full min-h-0 flex flex-col",
  searchBar: {
    wrapper: "",
    containerWrapper: "",
    container: "",
    icon: "",
    input: "",
    clearButton: "",
    clearButtonIcon: ""
  },
  header: {
    container: "",
    leftSection: "",
    resultCount: "",
    clearFiltersButton: "",
    clearFiltersIcon: "",
    rightSection: ""
  },
  table: {
    scrollArea: "",
    table: "",
    tableHeader: "",
    tableRow: "",
    tableRowSelected: "",
    tableRowHover: "",
    tableCell: "",
    tableHeaderCell: "",
    tableBodyRefreshing: "",
    expandHeader: "",
    expandButton: ""
  },
  grid: {
    container: "",
    item: "",
    itemHover: "",
    itemSelected: "",
    itemContent: "",
    expandButton: "",
    itemFields: "",
    field: "",
    fieldLabel: "",
    fieldValue: "",
    expandedContent: ""
  },
  masonry: {
    container: "",
    column: "",
    item: "",
    itemHover: "",
    itemSelected: "",
    itemContent: "",
    expandButton: "",
    itemFields: "",
    field: "",
    fieldLabel: "",
    fieldValue: "",
    expandedContent: ""
  },
  loadingState: {
    container: "",
    content: "",
    icon: "",
    text: ""
  },
  emptyState: {
    container: "",
    content: "",
    text: ""
  },
  pagination: {
    variant: "version1",
    container: "",
    info: "",
    controls: "",
    buttonGroup: "",
    button: "",
    buttonIcon: ""
  },
  columnVisibility: {
    trigger: "",
    triggerIcon: "",
    content: "",
    header: "",
    toggleAllButton: "",
    itemList: "",
    item: "",
    checkbox: ""
  },
  filterPopover: {
    trigger: "",
    triggerIcon: "",
    content: "",
    container: "",
    header: "",
    title: "",
    grid: "",
    column: "",
    filterButton: "",
    filterButtonActive: "",
    filterButtonInactive: "",
    filterLabel: ""
  },
  dragDrop: {
    dragGhost: "",
    dropIndicator: "",
    dragTarget: "",
    dragSource: ""
  },
  resize: {
    handle: "",
    indicator: "",
    overlay: "",
    hitslop: ""
  }
}

// Deep merge helper
function mergeStyles(base: TableStyles, custom: PartialTableStyles): TableStyles {
  const result = { ...base }
  
  Object.entries(custom).forEach(([key, value]) => {
    if (value === undefined) return
    
    if (typeof value === 'string') {
      ;(result as unknown as Record<string, unknown>)[key] = value
    } else if (typeof value === 'object' && value !== null) {
      const r = result as unknown as Record<string, unknown>
      const existing = (r[key] as Record<string, unknown>) || {}
      r[key] = { ...existing, ...(value as Record<string, unknown>) }
    }
  })
  
  return result
}

// Main function to get table styles
export function getTableStyles(customStyles?: PartialTableStyles): TableStyles {
  return customStyles 
    ? mergeStyles(baseStyles, customStyles) 
    : mergeStyles(baseStyles, defaultTableStyles)
}

// Hook for memoized styles
export function useTableStyles(customStyles?: PartialTableStyles) {
  return useMemo(() => getTableStyles(customStyles), [customStyles])
} 