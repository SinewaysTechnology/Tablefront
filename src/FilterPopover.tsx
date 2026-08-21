import React, { ReactNode, useCallback, useMemo, useState } from 'react'
import type { DataTableUIComponents } from './types/DataTableTypes'
import type { DataTableIcons } from './icons'
import type { ComparisonOperator, FilterOption } from './filters'
import { parseFilterId } from './filters'
import { cn } from './utils'
import {
  SimpleButton,
  SimplePopover,
  SimplePopoverContent,
  SimplePopoverTrigger,
  SimpleTooltip,
  SimpleTooltipContent,
  SimpleTooltipTrigger,
} from './defaultUIComponents'

/** Simple one-click filters popover. */
interface FilterPopoverProps {
  children?: ReactNode
  filterStore?: any
  /** Table column IDs that can be shown, including columns currently hidden by the user. */
  columnIds?: readonly string[]
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

const displayFilterValue = (query: string): string => {
  const separator = query.indexOf(':')
  const raw = separator >= 0 ? query.slice(separator + 1) : query
  const match = raw.match(/^(>=|<=|!=|!\*|>|<|=|\*)(.*)$/)
  if (!match) return raw
  const [, operator, value] = match
  return value ? `${operator} ${value}` : operator
}

const FilterItem = React.memo<{
  filter: FilterOption
  active: boolean
  query: string
  name: string
  onToggle: (filter: FilterOption) => void
  styles: {
    filterButton: string
    filterButtonActive: string
    filterButtonInactive: string
    filterLabel: string
  }
  ButtonComponent: React.ElementType
}>(({ filter, active, query, name, onToggle, styles, ButtonComponent }) => (
  <ButtonComponent
    type="button"
    data-tf-filter-item=""
    aria-pressed={active}
    className={cn(
      'min-w-0 cursor-pointer text-left focus-visible:outline-none',
      styles.filterButton,
      active ? styles.filterButtonActive : styles.filterButtonInactive,
    )}
    title={active ? `Remove ${query}` : `Add ${query}`}
    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      onToggle(filter)
    }}
  >
    <span className={cn(styles.filterLabel, 'max-w-[12rem] min-w-0 truncate text-left')}>
      {name}
    </span>
    <span
      className="min-w-0 truncate text-right font-mono text-[11px] font-normal tabular-nums text-muted-foreground"
      title={query}
    >
      {displayFilterValue(query)}
    </span>
  </ButtonComponent>
))

FilterItem.displayName = 'FilterItem'

export const FilterPopover = React.memo<FilterPopoverProps>(({
  children,
  filterStore,
  columnIds,
  uiComponents = {},
  icons,
  styles = {},
}) => {
  const [open, setOpen] = useState(false)
  const {
    Button,
    FilterButton,
    FilterItemButton: CustomFilterItemButton,
    Popover = SimplePopover,
    PopoverTrigger = SimplePopoverTrigger,
    PopoverContent = SimplePopoverContent,
    Tooltip = SimpleTooltip,
    TooltipTrigger = SimpleTooltipTrigger,
    TooltipContent = SimpleTooltipContent,
  } = useMemo(() => uiComponents, [uiComponents])

  const TriggerButton = useMemo(() => FilterButton || Button || SimpleButton, [FilterButton, Button])
  // Do not fall back to the shared Button: those are typically icon/flex
  // buttons and would break the type/value subgrid.
  const FilterItemButton = useMemo(
    () => CustomFilterItemButton || 'button',
    [CustomFilterItemButton],
  )
  const FilterIcon = icons?.Filter || (() => null)
  const storeData = filterStore ? filterStore() : null

  const finalStyles = useMemo(() => ({
    trigger: styles.trigger ?? 'size-9',
    triggerIcon: styles.triggerIcon ?? 'size-5',
    content: styles.content ?? 'w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] bg-card p-2',
    title: styles.title ?? 'px-2 pb-2 pt-1 text-sm font-medium',
    grid: styles.grid ?? 'grid min-w-0 grid-cols-1',
    column: styles.column ?? 'grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5',
    filterButton: styles.filterButton ?? 'col-span-2 !grid h-auto w-full min-w-0 grid-cols-subgrid items-center rounded-md px-2.5 py-1.5 text-xs',
    filterButtonActive: styles.filterButtonActive ?? 'bg-primary/10 font-medium text-primary hover:bg-primary/15',
    filterButtonInactive: styles.filterButtonInactive ?? 'bg-transparent hover:bg-foreground/5',
    filterLabel: styles.filterLabel ?? 'whitespace-nowrap text-xs font-medium',
  }), [styles])

  const availableFilters: FilterOption[] = useMemo(() => {
    const filters = (storeData?.availableFilters || []) as FilterOption[]
    if (!columnIds) return filters

    const orderById = new Map(columnIds.map((id, index) => [id, index]))
    return filters
      .filter((filter) => orderById.has(filter.field))
      .sort((left, right) => orderById.get(left.field)! - orderById.get(right.field)!)
  }, [columnIds, storeData?.availableFilters])
  const activeByField = useMemo(() => {
    const map = new Map<string, { id: string; value: unknown }>()
    ;(storeData?.filters || []).forEach((filter: { id: string; value: unknown }) => {
      const { field } = parseFilterId(filter.id)
      if (field !== '_search') map.set(field, filter)
    })
    return map
  }, [storeData?.filters])

  const getFilterName = useCallback((filter: FilterOption): string => {
    const field = storeData?.filterProcessor?.getFilterField(filter.field)
    return field?.displayName || field?.label || filter.label
  }, [storeData?.filterProcessor])

  const getFilterQuery = useCallback((filter: FilterOption): string => {
    if (!storeData?.filterProcessor) return filter.label
    const activeFilter = activeByField.get(filter.field)
    const operator = (filter.operator ||
      storeData.filterProcessor.getFilterField(filter.field)?.defaultOperator ||
      '*') as ComparisonOperator
    const canonicalFilter = activeFilter || {
      id: `${filter.field}:${operator}`,
      value: filter.value,
    }
    return storeData.filterProcessor.serializeFilter(canonicalFilter) || filter.label
  }, [activeByField, storeData?.filterProcessor])

  const toggleFilter = useCallback((filter: FilterOption) => {
    storeData?.toggleFilter?.(filter)
  }, [storeData?.toggleFilter])

  if (!storeData || availableFilters.length === 0) return null

  const renderFilter = (filter: FilterOption) => (
    <FilterItem
      key={filter.id}
      filter={filter}
      active={activeByField.has(filter.field)}
      query={getFilterQuery(filter)}
      name={getFilterName(filter)}
      onToggle={toggleFilter}
      styles={finalStyles}
      ButtonComponent={FilterItemButton}
    />
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {children || (
              <TriggerButton type="button" className={finalStyles.trigger} aria-label="Filters">
                <FilterIcon className={finalStyles.triggerIcon} />
              </TriggerButton>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent><p>Filters</p></TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn(
          'z-50 max-h-[var(--radix-popper-available-height)] overflow-x-hidden overflow-y-auto rounded-lg border text-card-foreground shadow-md outline-none',
          finalStyles.content,
        )}
      >
        <div data-tablefront-root="" className="min-w-0 max-w-full">
          <div className={finalStyles.title}>Filters</div>
          <div className={finalStyles.grid}>
            <div data-tf-filter-list="" className={finalStyles.column}>
              {availableFilters.map(renderFilter)}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

FilterPopover.displayName = 'FilterPopover'
