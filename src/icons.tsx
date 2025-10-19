import React from 'react'
import { 
  Loader2, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FilterX,
  Search,
  X,
  Filter,
  Settings,
  ChevronRight,
  ChevronDown as ChevronDownIcon
} from 'lucide-react'

// Icon component interface
export interface IconProps {
  className?: string
  size?: number
  [key: string]: any
}

// Default icon components
export const DefaultIcons = {
  // Loading and states
  Loader: Loader2,
  
  // Navigation and pagination
  PaginationPrevious: ChevronLeftIcon,
  PaginationNext: ChevronRightIcon,
  
  // Sorting
  SortAscending: ChevronUp,
  SortDescending: ChevronDown,
  SortUnsorted: ChevronsUpDown,
  
  // Expand/Collapse
  ExpandIcon: ChevronRight,
  CollapseIcon: ChevronDownIcon,
  
  // Actions
  ClearFilters: FilterX,
  Search: Search,
  X: X,
  Filter: Filter,
  ColumnSettings: Settings,
} as const

// Icon overrides interface
export interface DataTableIcons {
  Loader?: React.ComponentType<IconProps>
  PaginationPrevious?: React.ComponentType<IconProps>
  PaginationNext?: React.ComponentType<IconProps>
  SortAscending?: React.ComponentType<IconProps>
  SortDescending?: React.ComponentType<IconProps>
  SortUnsorted?: React.ComponentType<IconProps>
  ExpandIcon?: React.ComponentType<IconProps>
  CollapseIcon?: React.ComponentType<IconProps>
  ClearFilters?: React.ComponentType<IconProps>
  Search?: React.ComponentType<IconProps>
  X?: React.ComponentType<IconProps>
  Filter?: React.ComponentType<IconProps>
  ColumnSettings?: React.ComponentType<IconProps>
}

// Hook to get effective icons (defaults + overrides)
export function useDataTableIcons(iconOverrides?: DataTableIcons) {
  return React.useMemo(() => {
    if (!iconOverrides) {
      return DefaultIcons
    }
    
    return {
      ...DefaultIcons,
      ...iconOverrides
    }
  }, [iconOverrides])
}

// Type for the effective icons
export type EffectiveIcons = ReturnType<typeof useDataTableIcons> 