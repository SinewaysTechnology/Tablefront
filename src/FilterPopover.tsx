import React, { useState, ReactNode, useMemo, useCallback } from "react";
import type { DataTableUIComponents } from './types/DataTableTypes';
import type { DataTableIcons } from './icons';
import { startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { cn } from './utils';
import { 
  SimpleButton,
  SimplePopover,
  SimplePopoverTrigger,
  SimplePopoverContent,
  SimpleTooltip,
  SimpleTooltipTrigger,
  SimpleTooltipContent,
  SimpleScrollArea
} from './defaultUIComponents';

interface FilterOption {
  id: string
  label: string
  type: 'comparison' | 'categorical'
  field: string
  operator?: string
  value: number | string | RegExp
  originalDisplay?: string
}

interface FilterPopoverProps {
  children?: ReactNode
  filterStore?: any
  uiComponents?: DataTableUIComponents
  icons?: DataTableIcons
  styles?: {
    trigger?: string
    triggerIcon?: string
    content?: string
    title?: string
    grid?: string
    column?: string
    filterButton?: string
    filterButtonActive?: string
    filterButtonInactive?: string
    filterLabel?: string
  }
}

// Memoized FilterItem component to prevent re-renders of individual filter items
const FilterItem = React.memo<{
  filter: FilterOption
  isActive: boolean
  buttonText: string
  filterName: string
  onFilterClick: (filter: FilterOption) => void
  styles: {
    filterButton: string
    filterButtonActive: string
    filterButtonInactive: string
    filterLabel: string
  }
  FilterItemBtn: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>
}>(({ filter, isActive, buttonText, filterName, onFilterClick, styles, FilterItemBtn }) => (
  <div className="flex items-center gap-2">
    <FilterItemBtn
      onClick={(e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onFilterClick(filter)
      }}
      className={cn(
        styles.filterButton,
        isActive 
          ? styles.filterButtonActive
          : styles.filterButtonInactive
      )}
      title={isActive ? `Click to remove "${buttonText}" from filters` : `Click to add "${buttonText}" to filters`}
    >
      {buttonText}
    </FilterItemBtn>
    <div className={cn(styles.filterLabel, 'overflow-hidden text-ellipsis')}>
      {filterName}
    </div>
  </div>
))

FilterItem.displayName = 'FilterItem'

export const FilterPopover = React.memo<FilterPopoverProps>(({
  children,
  filterStore,
  uiComponents = {},
  icons,
  styles = {}
}) => {
  const [open, setOpen] = useState(false)
  
  // Memoize UI components to prevent recreation on every render
  const {
    Button, // General button component for all buttons (fallback)
    FilterButton, // Specific filter button component
    FilterItemButton, // Specific filter item button component
    Popover = SimplePopover,
    PopoverTrigger = SimplePopoverTrigger,
    PopoverContent = SimplePopoverContent,
    Tooltip = SimpleTooltip,
    TooltipTrigger = SimpleTooltipTrigger,
    TooltipContent = SimpleTooltipContent,
    ScrollArea = SimpleScrollArea,
  } = useMemo(() => uiComponents, [uiComponents])
  
  // Memoize icon to prevent recreation
  const FilterIcon = useMemo(() => icons?.Filter || (() => null), [icons?.Filter])

  // Memoize button components to prevent recreation
  const TriggerButton = useMemo(() => FilterButton || Button || SimpleButton, [FilterButton, Button])
  const FilterItemBtn = useMemo(() => FilterItemButton || Button || SimpleButton, [FilterItemButton, Button])

  // Memoize default styles to prevent recreation
  const defaultStyles = useMemo(() => ({
    trigger: "h-10 w-10",
    triggerIcon: "size-5",
    content: "max-w-[95vw] p-4",
    title: "text-sm font-medium mb-3",
    grid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    column: "space-y-1.5",
    filterButton: "min-w-[150px] rounded-lg py-2 px-3 text-center text-xs",
    filterButtonActive: "bg-primary/15 text-primary font-medium shadow-sm",
    filterButtonInactive: "bg-foreground/5 hover:bg-foreground/10",
    filterLabel: "text-xs whitespace-nowrap"
  }), [])

  // Memoize final styles to prevent recreation
  const finalStyles = useMemo(() => ({ ...defaultStyles, ...styles }), [defaultStyles, styles])

  // Get state and actions from the filter store - call this at the top level
  const storeData = filterStore ? filterStore() : null

  // Memoize utility functions to prevent recreation - call these unconditionally
  const getFilterName = useCallback((filter: FilterOption): string => {
    if (!storeData?.filterProcessor) return filter.label
    // Extract the field name from the filter ID (before any colon)
    const fieldId = filter.id.split(':')[0]
    const filterField = storeData.filterProcessor.getFilterField(fieldId)
    
    // Use displayName from field definition, fall back to label or original filter label
    return filterField?.displayName || filterField?.label || filter.label
  }, [storeData?.filterProcessor])
  
  // Memoize utility function to truncate long values for display
  const truncateValue = useCallback((value: string, maxLength: number = 15): string => {
    if (value.length <= maxLength) return value
    return value.substring(0, maxLength) + '...'
  }, [])

  // Memoize utility function to truncate entire button text for consistent sizing
  const truncateButtonText = useCallback((text: string, maxLength: number = 18): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }, [])

  // Memoize the expensive getFilterButtonText function
  const getFilterButtonText = useCallback((filter: FilterOption): string => {
    if (!storeData) return filter.label
    
    const active = storeData.isFilterActive(filter.id)
    
    // If the filter is active, get the exact search text
    if (active) {
      const searchTerm = storeData.filterSearchTerms.get(filter.id)
      if (searchTerm) {
        // For active filters, get field type to determine display format
        const [field] = searchTerm.split(':')
        const filterField = storeData.filterProcessor.getFilterField(field)
        
        if (filterField && filterField.type === 'string') {
          // For string filters, convert value to lowercase and truncate
          const [prefix, value] = searchTerm.split(/:(.*)/);
          const truncatedValue = truncateValue(value.toLowerCase())
          const fullText = `${prefix}:${truncatedValue}`
          return truncateButtonText(fullText)
        } else if (filterField && filterField.type === 'date') {
          // For date filters, format the display using the actual filter value
          const filterParts = filter.id.split(':')
          const operator = filterParts.length > 1 ? filterParts[1] : ''
          const displayField = filterField?.aliases?.[0] || field
          
          // Format date value for display
          let dateDisplay: string
          
          if (filter.value instanceof Date) {
            // Create a date normalized to UTC midnight for comparison
            const today = toDate(startOfDay(new Date()), { timeZone: 'UTC' })
            
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayUTC = toDate(startOfDay(yesterday), { timeZone: 'UTC' })
            
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowUTC = toDate(startOfDay(tomorrow), { timeZone: 'UTC' })
            
            const filterTime = filter.value.getTime()
            
            if (filterTime === today.getTime()) {
              dateDisplay = 'today'
            } else if (filterTime === yesterdayUTC.getTime()) {
              dateDisplay = 'yesterday'
            } else if (filterTime === tomorrowUTC.getTime()) {
              dateDisplay = 'tomorrow'
            } else {
              // Format as YYYY-M-D (without leading zeros for month/day)
              const year = filter.value.getUTCFullYear()
              const month = filter.value.getUTCMonth() + 1 // getUTCMonth() is 0-based
              const day = filter.value.getUTCDate()
              dateDisplay = `${year}-${month}-${day}`
            }
          } else {
            dateDisplay = String(filter.value)
          }
          
          const fullText = `${displayField}:${operator}${dateDisplay}`
          return truncateButtonText(fullText)
        }
        return truncateButtonText(searchTerm)
      }
    }
    
    // For inactive filters, format display text
    const filterParts = filter.id.split(':')
    const field = filterParts[0]
    const operator = filterParts.length > 1 ? filterParts[1] : undefined
    
    // Get preferred display name (use alias if available)
    const filterField = storeData.filterProcessor.getFilterField(field)
    const displayField = filterField?.aliases?.[0] || field
    
    // For numeric fields with operators, construct display with operator + value
    if (filterField?.type === 'number' && operator && filter.value !== undefined) {
      const fullText = `${displayField}:${operator}${filter.value}`
      return truncateButtonText(fullText)
    }
    
    // For date fields with operators, construct display with operator + value
    if (filterField?.type === 'date' && operator && filter.value !== undefined) {
      // Format date value for display
      let dateDisplay: string
      
      if (filter.value instanceof Date) {
        // Create a date normalized to UTC midnight for comparison
        const today = toDate(startOfDay(new Date()), { timeZone: 'UTC' })
        
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayUTC = toDate(startOfDay(yesterday), { timeZone: 'UTC' })
        
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowUTC = toDate(startOfDay(tomorrow), { timeZone: 'UTC' })
        
        const filterTime = filter.value.getTime()
        
        if (filterTime === today.getTime()) {
          dateDisplay = 'today'
        } else if (filterTime === yesterdayUTC.getTime()) {
          dateDisplay = 'yesterday'
        } else if (filterTime === tomorrowUTC.getTime()) {
          dateDisplay = 'tomorrow'
        } else {
          // Format as YYYY-M-D (without leading zeros for month/day)
          const year = filter.value.getUTCFullYear()
          const month = filter.value.getUTCMonth() + 1 // getUTCMonth() is 0-based
          const day = filter.value.getUTCDate()
          dateDisplay = `${year}-${month}-${day}`
        }
      } else {
        dateDisplay = String(filter.value)
      }
      
      const fullText = `${displayField}:${operator}${dateDisplay}`
      return truncateButtonText(fullText)
    }
    
    // For string fields or fields without operators - display value in lowercase and truncate
    const valueStr = filter.value?.toString() || ''
    const truncatedValue = truncateValue(valueStr.toLowerCase())
    const fullText = `${displayField}:${truncatedValue}`
    return truncateButtonText(fullText)
  }, [storeData, truncateValue, truncateButtonText])

  // Memoize callback functions to prevent recreation
  const handleFilterClick = useCallback((filter: FilterOption) => {
    if (storeData?.toggleFilter) {
      storeData.toggleFilter(filter)
    }
  }, [storeData?.toggleFilter])

  // Memoize clear filters callback
  const clearFilters = useCallback(() => {
    if (storeData?.clearFilters) {
      storeData.clearFilters()
      setOpen(false)
    }
  }, [storeData?.clearFilters])

  // Memoize layout calculations to prevent recalculation
  const { filtersCount, useTwoColumns, filtersColumn1, filtersColumn2, gridClass } = useMemo(() => {
    const availableFilters = storeData?.availableFilters || []
    const count = availableFilters.length
    const useTwoCols = count > 8
    
    let col1: FilterOption[] = []
    let col2: FilterOption[] = []
    
    if (useTwoCols) {
      const middleIndex = Math.ceil(count / 2)
      col1 = availableFilters.slice(0, middleIndex)
      col2 = availableFilters.slice(middleIndex)
    } else {
      col1 = availableFilters
    }

    const grid = useTwoCols ? finalStyles.grid : "grid grid-cols-1 gap-3"
    
    return {
      filtersCount: count,
      useTwoColumns: useTwoCols,
      filtersColumn1: col1,
      filtersColumn2: col2,
      gridClass: grid
    }
  }, [storeData?.availableFilters, finalStyles.grid])

  // Memoize popover content className to prevent recalculation
  const popoverContentClassName = useMemo(() => cn(
    "z-50 rounded-lg border text-card-foreground shadow-md outline-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    "max-h-[var(--radix-popper-available-height)] overflow-y-auto",
    finalStyles.content,
    useTwoColumns ? 'min-w-[600px]' : 'min-w-[300px]'
  ), [finalStyles.content, useTwoColumns])

  // Early return after all hooks have been called
  if (!storeData || !storeData.availableFilters || storeData.availableFilters.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {children ? (
              children
            ) : (
              <TriggerButton
                className={finalStyles.trigger}
              >
                <FilterIcon className={finalStyles.triggerIcon} />
              </TriggerButton>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Filters</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent 
        className={popoverContentClassName}
        align="end"
      >
        <div 
          className={finalStyles.title}
          onClick={(e) => e.stopPropagation()}
        >
          Available filters
        </div>
        <div 
          className={gridClass}
          onClick={(e) => e.stopPropagation()}
        >
          {/* First column (or single column when filters <= 8) */}
          <div className={finalStyles.column}>
            {filtersColumn1.map((filter: FilterOption) => {
              const isActive = storeData.isFilterActive(filter.id)
              const buttonText = getFilterButtonText(filter)
              const filterName = getFilterName(filter)
              
              return (
                <FilterItem
                  key={filter.id}
                  filter={filter}
                  isActive={isActive}
                  buttonText={buttonText}
                  filterName={filterName}
                  onFilterClick={handleFilterClick}
                  styles={finalStyles}
                  FilterItemBtn={FilterItemBtn}
                />
              )
            })}
          </div>
          
          {/* Second column (only when filters > 8) */}
          {useTwoColumns && (
            <div className={finalStyles.column}>
              {filtersColumn2.map((filter: FilterOption) => {
                const isActive = storeData.isFilterActive(filter.id)
                const buttonText = getFilterButtonText(filter)
                const filterName = getFilterName(filter)
                
                return (
                  <FilterItem
                    key={filter.id}
                    filter={filter}
                    isActive={isActive}
                    buttonText={buttonText}
                    filterName={filterName}
                    onFilterClick={handleFilterClick}
                    styles={finalStyles}
                    FilterItemBtn={FilterItemBtn}
                  />
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})

FilterPopover.displayName = 'FilterPopover' 