import React, { useState, ReactNode, useMemo, useCallback } from 'react'
import { Table } from '@tanstack/react-table'
import { cn } from './utils'
import type { DataTableUIComponents } from './types/DataTableTypes'
import type { DataTableIcons } from './icons'
import { 
  SimpleButton,
  SimplePopover,
  SimplePopoverTrigger,
  SimplePopoverContent,
  SimpleTooltip,
  SimpleTooltipTrigger,
  SimpleTooltipContent,
  SimpleSwitch,
  SimpleLabel,
  SimpleSeparator,
  SimpleSettings02Icon
} from './defaultUIComponents';

interface ColumnVisibilityPopoverProps {
  table: Table<unknown>
  className?: string
  uiComponents?: DataTableUIComponents
  icons?: DataTableIcons
  styles?: {
    trigger?: string
    triggerIcon?: string
    content?: string
    header?: string
    toggleAllButton?: string
    itemList?: string
    item?: string
    checkbox?: string
  }
}

export const ColumnVisibilityPopover = ({
  table,
  className,
  uiComponents = {},
  icons,
  styles = {}
}: ColumnVisibilityPopoverProps) => {
  const [open, setOpen] = useState(false)
  
  // Memoize UI components to prevent recreation on every render
  const {
    Button,
    ColumnButton,
    Popover = SimplePopover,
    PopoverTrigger = SimplePopoverTrigger,
    PopoverContent = SimplePopoverContent,
    Tooltip = SimpleTooltip,
    TooltipTrigger = SimpleTooltipTrigger,
    TooltipContent = SimpleTooltipContent,
    Switch = SimpleSwitch,
    Label = SimpleLabel,
    Separator = SimpleSeparator,
    Settings02Icon = SimpleSettings02Icon,
  } = useMemo(() => uiComponents, [uiComponents])
  
  // Memoize icon to prevent recreation
  const SettingsIcon = useMemo(() => icons?.ColumnSettings || Settings02Icon, [icons?.ColumnSettings, Settings02Icon])
  
  // Memoize button component to prevent recreation
  const TriggerButton = useMemo(() => ColumnButton || Button || SimpleButton, [ColumnButton, Button])

  // Memoize default styles to prevent recreation
  const defaultStyles = useMemo(() => ({
    trigger: "h-10 w-10",
    triggerIcon: "size-5",
    content: "min-w-64 p-4",
    header: "space-y-4",
    toggleAllButton: "text-sm font-medium cursor-pointer",
    itemList: "space-y-1 max-h-[60vh] overflow-y-auto",
    item: "flex items-center justify-between space-x-2",
    checkbox: "cursor-pointer"
  }), [])

  // Memoize final styles to prevent recreation
  const finalStyles = useMemo(() => ({ ...defaultStyles, ...styles }), [defaultStyles, styles])
  
  // Get current table state - this ensures we always have the latest data
  const allColumns = table.getAllColumns().filter(column => column.getCanHide())
  const columnVisibility = table.getState().columnVisibility
  const visibleColumnsCount = allColumns.filter(column => columnVisibility[column.id] !== false).length
  const areAllVisible = allColumns.every(column => columnVisibility[column.id] !== false)
  
  // Memoize callback functions to prevent recreation
  const toggleColumnVisibility = useCallback((columnId: string) => {
    const currentVisibility = table.getState().columnVisibility;
    const isCurrentlyVisible = currentVisibility[columnId] !== false;
    const newState = { ...currentVisibility };
    
    if (isCurrentlyVisible) {
      newState[columnId] = false;
    } else {
      delete newState[columnId];
    }
    
    table.setColumnVisibility(newState);
    table.getRowModel();
  }, [table])
  
  const toggleAllColumns = useCallback(() => {
    const currentVisibility = table.getState().columnVisibility;
    const currentColumns = table.getAllColumns().filter(column => column.getCanHide());
    const currentAllVisible = currentColumns.every(column => currentVisibility[column.id] !== false);
    const newState = { ...currentVisibility };
    
    if (currentAllVisible) {
      currentColumns.forEach(column => {
        newState[column.id] = false;
      });
    } else {
      // Explicitly mark all as visible to avoid empty state which would
      // re-trigger initialColumnVisibility defaults
      currentColumns.forEach(column => {
        newState[column.id] = true;
      });
    }
    
    table.setColumnVisibility(newState);
    setTimeout(() => {
      table.getRowModel();
    }, 0);
  }, [table])

  // Memoize popover content className to prevent recalculation
  const popoverContentClassName = useMemo(() => cn(
    "z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    "max-h-[var(--radix-popper-available-height)] overflow-y-auto",
    finalStyles.content
  ), [finalStyles.content])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <TriggerButton 
              className={cn(finalStyles.trigger, className)}
            >
              <SettingsIcon className={finalStyles.triggerIcon} />
            </TriggerButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Column Settings</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent 
        className={popoverContentClassName}
        align="end"
      >
        <div 
          className={finalStyles.header}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className={cn(
              finalStyles.item, 
              "cursor-pointer hover:bg-accent/50 rounded-md p-1"
            )}
            onClick={toggleAllColumns}
          >
            <Label 
              className="text-sm cursor-pointer flex-1"
            >
              Toggle All Columns
            </Label>
            <Switch
              id="toggle-all-columns"
              checked={allColumns.length > 0 && visibleColumnsCount === allColumns.length}
              onCheckedChange={toggleAllColumns}
              className={finalStyles.checkbox}
            />
          </div>
          
          <Separator />
          
          <div 
            className={cn(finalStyles.itemList, 'mt-4')}
            onClick={(e) => e.stopPropagation()}
          >
            {allColumns.map((column) => {
              let headerText = column.id;
              
              if (typeof column.columnDef.header === 'string') {
                headerText = column.columnDef.header;
              } else if (column.id) {
                headerText = column.id
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase());
              }
              
              const isVisible = columnVisibility[column.id] !== false;

              return (
                                  <div 
                    key={column.id}
                    className={cn(
                      finalStyles.item, 
                      "cursor-pointer hover:bg-accent/50 rounded-md p-1"
                    )}
                    onClick={() => toggleColumnVisibility(column.id)}
                  >
                  <Label 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {headerText}
                  </Label>
                  <Switch
                    id={`column-toggle-${column.id}`}
                    checked={isVisible}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                    className={finalStyles.checkbox}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

ColumnVisibilityPopover.displayName = 'ColumnVisibilityPopover'