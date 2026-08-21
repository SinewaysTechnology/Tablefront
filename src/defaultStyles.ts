import type { PartialTableStyles } from "./variants"

// Essential default styles - clean and minimal but with necessary structure
export const defaultTableStyles: PartialTableStyles = {
  container: "flex-1 w-full min-h-0 flex flex-col focus:outline-none",
  
  searchBar: {
    wrapper: "px-0 pt-0 mb-2",
    containerWrapper: "relative",
    container: "pr-1.5 relative flex items-center w-full h-12 rounded-lg bg-foreground/5 hover:bg-foreground/10 focus-within:ring-1 focus-within:ring-primary transition-colors",
    icon: "absolute left-3 w-5 h-5 text-muted-foreground",
    input: "w-full bg-transparent border-none focus:outline-none text-sm pl-10 pr-2 py-1.5 placeholder:text-muted-foreground",
    clearButton: "",
    clearButtonIcon: "w-4 h-4"
  },
  
  header: {
    container: "flex items-center justify-between py-1 pl-3 pr-1 border-b border-border shrink-0 bg-foreground/5 rounded-t-lg",
    leftSection: "flex items-center gap-2",
    resultCount: "text-xs font-medium text-muted-foreground",
    clearFiltersButton: "text-xs px-3",
    clearFiltersIcon: "size-5",
    rightSection: "flex items-center gap-1"
  },
  
  table: {
    scrollArea: "w-full flex-1 min-h-0 overflow-auto",
    table: "w-full caption-bottom text-sm bg-foreground/2",
    tableHeader: "h-10 sticky top-0 bg-background border-b border-border shadow-sm",
    tableRow: "border-b h-10",
    tableRowSelected: "bg-primary/10 hover:bg-primary/10",
    tableRowHover: "hover:bg-foreground/5",
    tableCell: "px-4 align-middle",
    tableHeaderCell: "h-10 px-4 font-medium text-muted-foreground cursor-pointer select-none hover:bg-foreground/5",
    expandHeader: "min-w-10 w-10 px-0 text-center",
    expandButton: "size-1 px-0"
  },
  
  grid: {
    container: "grid w-full h-full gap-1 py-1",
    item: "bg-card border border-border rounded-lg p-4 cursor-pointer transition-all duration-200",
    itemHover: "hover:bg-accent/50 hover:border-accent/50 hover:shadow-md",
    itemSelected: "bg-primary/10 border-primary/30 shadow-lg",
    itemContent: "space-y-3",
    expandButton: "w-8 h-8 flex items-center justify-center rounded hover:bg-foreground/5",
    itemFields: "space-y-2",
    field: "space-y-1",
    fieldLabel: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
    fieldValue: "text-sm font-medium text-foreground",
    expandedContent: "mt-4 pt-4 border-t border-border"
  },
  
  masonry: {
    container: "flex w-full h-full py-1 gap-1",
    column: "flex flex-col gap-1",
    item: "bg-card border border-border rounded-lg p-4 cursor-pointer transition-all duration-200",
    itemHover: "hover:bg-accent/50 hover:border-accent/50 hover:shadow-md",
    itemSelected: "bg-primary/10 border-primary/30 shadow-lg",
    itemContent: "space-y-3",
    expandButton: "w-8 h-8 flex items-center justify-center rounded hover:bg-foreground/5",
    itemFields: "space-y-2",
    field: "space-y-1",
    fieldLabel: "text-xs font-medium text-muted-foreground uppercase tracking-wide",
    fieldValue: "text-sm font-medium text-foreground",
    expandedContent: "mt-4 pt-4 border-t border-border"
  },
  
  loadingState: {
    container: "flex items-center justify-center h-full w-full p-6 text-muted-foreground",
    content: "space-y-1 text-center",
    icon: "h-6 w-6 animate-spin",
    text: "text-sm"
  },
  
  emptyState: {
    container: "flex items-center justify-center h-full w-full p-6 text-muted-foreground",
    content: "space-y-2 text-center",
    text: "text-sm"
  },
  
  pagination: {
    variant: "version2",
    container: "flex items-center justify-center px-2 py-1 border-t border-border bg-background",
    info: "text-xs text-muted-foreground px-3",
    controls: "flex items-center gap-2",
    buttonGroup: "flex items-center gap-2",
    button: "h-8 w-8 p-0 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
    buttonIcon: "h-4 w-4"
  },
  
  columnVisibility: {
    trigger: 'size-9',
    triggerIcon: "size-5",
    content: "w-72 p-4",
    header: "space-y-4",
    toggleAllButton: "text-sm font-medium cursor-pointer",
    itemList: "space-y-0",
    item: "flex items-center justify-between space-x-2",
    checkbox: "cursor-pointer"
  },
  
  filterPopover: {
    trigger: 'size-9',
    triggerIcon: "size-5",
    content: "w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-2 bg-card",
    container: "",
    header: "",
    title: "px-2 pb-2 pt-1 text-sm font-medium",
    grid: "grid min-w-0 grid-cols-1",
    column: "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5",
    filterButton: "col-span-2 !grid h-auto w-full min-w-0 grid-cols-subgrid items-center rounded-md px-2.5 py-1.5 text-xs cursor-pointer",
    filterButtonActive: "bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary",
    filterButtonInactive: "bg-transparent hover:bg-foreground/5",
    filterLabel: "text-xs whitespace-nowrap font-medium"
  },
  
  dragDrop: {
    dragGhost: "pointer-events-none z-[9999]",
    dropIndicator: "fixed w-1 bg-primary z-[9999] rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_14%,transparent),0_4px_14px_color-mix(in_srgb,currentColor_35%,transparent)]",
    dragTarget: "bg-primary/10 shadow-[inset_0_-2px_0_color-mix(in_srgb,currentColor_20%,transparent)]",
    dragSource: "opacity-25 bg-primary/5"
  },
  
  resize: {
    handle: "absolute top-0 right-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/25 z-10",
    indicator: "absolute top-1/2 right-0 w-0.5 h-4 bg-border/80 group-hover:bg-primary group-hover:w-1 transform -translate-y-1/2 rounded-full transition-[background-color,width]",
    overlay: "fixed inset-0 z-[9999] cursor-col-resize",
    hitslop: "absolute top-0 -right-1 bottom-0 w-3 cursor-col-resize group z-10 hover:bg-primary/10"
  }
}

// Modern variant - sleek design
export const modernTableStyles: PartialTableStyles = {
  container: "flex-1 w-full min-h-0 flex flex-col focus:outline-none bg-background",
  
  searchBar: {
    wrapper: "px-0 pt-0 mb-1",
    containerWrapper: "relative",
    container: "relative flex items-center w-full h-12 rounded-xl bg-gradient-to-r from-card to-card/80 hover:from-accent/5 hover:to-accent/10 focus-within:ring-2 focus-within:ring-primary transition-all duration-300 shadow-inner border border-border/50",
    icon: "absolute left-3 w-5 h-5 text-primary",
    input: "w-full bg-transparent border-none focus:outline-none text-sm pl-10 pr-4 py-1.5 placeholder:text-muted-foreground transition-all duration-200",
    clearButton: "absolute right-2",
    clearButtonIcon: "w-4 h-4"
  },
  
  header: {
    container: "flex items-center justify-between py-3 px-4 border-b border-border bg-gradient-to-r from-card/50 to-card/70 backdrop-blur-md shadow-sm",
    leftSection: "flex items-center gap-3",
    resultCount: "text-sm font-semibold text-foreground",
    clearFiltersButton: "",
    clearFiltersIcon: "size-5",
    rightSection: "flex items-center gap-1"
  },
  
  table: {
    scrollArea: "w-full flex-1 min-h-0 bg-card/20 overflow-auto",
    table: "w-full text-sm",
    tableHeader: "sticky top-0 bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-md border-b border-border shadow-md",
    tableRow: "border-b border-border/50 cursor-pointer transition-all duration-200",
    tableRowSelected: "bg-gradient-to-r from-primary/5 via-primary/15 to-primary/5 hover:from-primary/10 hover:via-primary/25 hover:to-primary/10 shadow-lg",
    tableRowHover: "hover:bg-gradient-to-r hover:from-accent/40 hover:via-accent/60 hover:to-accent/40",
    tableCell: "p-4 align-middle",
    tableHeaderCell: "h-12 px-4 text-left align-middle font-semibold text-card-foreground cursor-pointer select-none hover:bg-gradient-to-r hover:from-accent/40 hover:via-accent/60 hover:to-accent/40 transition-colors duration-200",
    expandHeader: "w-10 px-0 text-center",
    expandButton: "w-10 px-0"
  },
  
  grid: {
    container: "grid gap-6 p-6",
    item: "bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl",
    itemHover: "hover:bg-gradient-to-br hover:from-accent/20 hover:via-accent/30 hover:to-accent/20 hover:border-accent/50 hover:scale-105",
    itemSelected: "bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 border-primary/50 shadow-2xl scale-105",
    itemContent: "space-y-4",
    expandButton: "w-10 h-10 flex items-center justify-center rounded-lg hover:bg-foreground/10 transition-all duration-200",
    itemFields: "space-y-3",
    field: "space-y-1.5",
    fieldLabel: "text-xs font-semibold text-primary uppercase tracking-wider",
    fieldValue: "text-sm font-semibold text-foreground",
    expandedContent: "mt-6 pt-6 border-t border-border/50"
  },
  
  masonry: {
    container: "flex gap-6 p-6",
    column: "flex flex-col gap-6",
    item: "bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-xl p-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl",
    itemHover: "hover:bg-gradient-to-br hover:from-accent/20 hover:via-accent/30 hover:to-accent/20 hover:border-accent/50 hover:scale-105",
    itemSelected: "bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 border-primary/50 shadow-2xl scale-105",
    itemContent: "space-y-4",
    expandButton: "w-10 h-10 flex items-center justify-center rounded-lg hover:bg-foreground/10 transition-all duration-200",
    itemFields: "space-y-3",
    field: "space-y-1.5",
    fieldLabel: "text-xs font-semibold text-primary uppercase tracking-wider",
    fieldValue: "text-sm font-semibold text-foreground",
    expandedContent: "mt-6 pt-6 border-t border-border/50"
  },
  
  loadingState: {
    container: "flex items-center justify-center h-full w-full p-6 bg-gradient-to-br from-background to-background/80 text-muted-foreground",
    content: "space-y-1 text-center",
    icon: "h-6 w-6 animate-spin text-primary",
    text: "text-sm"
  },
  
  emptyState: {
    container: "flex items-center justify-center h-full w-full p-6 bg-gradient-to-br from-background to-background/80 text-muted-foreground",
    content: "space-y-2 text-center",
    text: "text-sm"
  },
  
  pagination: {
    container: "flex items-center justify-center px-4 py-2 border-t border-border bg-gradient-to-r from-background to-background/90",
    info: "text-xs text-muted-foreground px-3",
    controls: "flex items-center gap-2",
    buttonGroup: "flex items-center gap-2",
    button: "h-8 w-8 p-0 hover:bg-gradient-to-r hover:from-accent/20 hover:via-accent/30 hover:to-accent/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full",
    buttonIcon: "h-4 w-4"
  },
  
  columnVisibility: {
    trigger: 'h-10 w-10',
    triggerIcon: "size-5 text-primary",
    content: "w-80 p-6 bg-gradient-to-br from-card to-card/80 shadow-lg rounded-xl border border-border/50 backdrop-blur-md",
    header: "space-y-4",
    toggleAllButton: "text-sm font-medium cursor-pointer",
    itemList: "space-y-1 pr-2",
    item: "flex items-center justify-between space-x-2",
    checkbox: "cursor-pointer"
  },
  
  filterPopover: {
    trigger: 'h-10 w-10',
    triggerIcon: "size-5 text-primary",
    content: "w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-2 bg-gradient-to-br from-card to-card/80 shadow-lg rounded-xl border border-border/50 backdrop-blur-md",
    container: "p-0",
    header: "bg-gradient-to-r from-card/50 to-card/70 backdrop-blur-md rounded-t-xl p-3",
    title: "px-2 pb-2 pt-1 text-sm font-semibold text-foreground",
    grid: "grid min-w-0 grid-cols-1",
    column: "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5",
    filterButton: "col-span-2 !grid h-auto w-full min-w-0 grid-cols-subgrid items-center rounded-lg py-2 px-3 text-xs",
    filterButtonActive: "bg-gradient-to-r from-primary/15 via-primary/25 to-primary/15 text-primary font-semibold border border-primary/30",
    filterButtonInactive: "bg-gradient-to-r from-accent/40 via-accent/50 to-accent/40 hover:from-accent/50 hover:via-accent/60 hover:to-accent/50 text-foreground",
    filterLabel: "text-xs whitespace-nowrap text-muted-foreground font-medium"
  },
  
  dragDrop: {
    dragGhost: "pointer-events-none z-[9999]",
    dropIndicator: "fixed w-1 bg-primary z-[9999] rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,currentColor_14%,transparent),0_4px_14px_color-mix(in_srgb,currentColor_35%,transparent)]",
    dragTarget: "bg-primary/10 shadow-[inset_0_-2px_0_color-mix(in_srgb,currentColor_20%,transparent)]",
    dragSource: "opacity-25 bg-primary/5"
  },
  
  resize: {
    handle: "absolute top-0 right-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/25 z-10",
    indicator: "absolute top-1/2 right-0 w-0.5 h-4 bg-border group-hover:bg-primary group-hover:w-1 transform -translate-y-1/2 rounded-full transition-[background-color,width]",
    overlay: "fixed inset-0 z-[9999] cursor-col-resize",
    hitslop: "absolute top-0 -right-1 bottom-0 w-3 cursor-col-resize group z-10 hover:bg-primary/10"
  }
}

// Compact variant - dense layout
export const compactTableStyles: PartialTableStyles = {
  container: "flex-1 w-full min-h-0 flex flex-col focus:outline-none",
  
  searchBar: {
    wrapper: "px-0 pt-0 mb-1",
    containerWrapper: "relative",
    container: "relative flex items-center w-full h-8 rounded bg-muted hover:bg-accent focus-within:ring-1 focus-within:ring-primary transition-colors",
    icon: "absolute left-2 w-3.5 h-3.5 text-muted-foreground",
    input: "w-full bg-transparent border-none focus:outline-none text-xs pl-7 pr-3 py-1 placeholder:text-muted-foreground",
    clearButton: "absolute right-1",
    clearButtonIcon: "w-3 h-3"
  },
  
  header: {
    container: "flex items-center justify-between py-1 px-2 border-b border-border bg-muted/30 min-h-8",
    leftSection: "flex items-center gap-1",
    resultCount: "text-xs text-muted-foreground",
    clearFiltersButton: "",
    clearFiltersIcon: "size-4",
    rightSection: "flex items-center gap-1"
  },
  
  table: {
    scrollArea: "w-full flex-1 min-h-0 overflow-auto",
    table: "w-full text-xs",
    tableHeader: "sticky top-0 bg-muted/50 border-b border-border backdrop-blur-md",
    tableRow: "border-b transition-colors cursor-pointer",
    tableRowSelected: "bg-primary/10 hover:bg-primary/15",
    tableRowHover: "hover:bg-muted/30",
    tableCell: "p-2 align-middle text-xs",
    tableHeaderCell: "h-8 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer select-none hover:bg-muted/50 text-xs",
    expandHeader: "w-6 px-0 text-center",
    expandButton: "w-6 px-0"
  },
  
  grid: {
    container: "grid gap-2 p-2",
    item: "bg-card border border-border rounded p-2 cursor-pointer transition-colors",
    itemHover: "hover:bg-accent/30 hover:border-accent/50",
    itemSelected: "bg-primary/10 border-primary/30 shadow-sm",
    itemContent: "space-y-1.5",
    expandButton: "w-6 h-6 flex items-center justify-center rounded hover:bg-foreground/5",
    itemFields: "space-y-1",
    field: "space-y-0.5",
    fieldLabel: "text-xs font-medium text-muted-foreground",
    fieldValue: "text-xs font-medium text-foreground",
    expandedContent: "mt-2 pt-2 border-t border-border"
  },
  
  masonry: {
    container: "flex gap-2 p-2",
    column: "flex flex-col gap-2",
    item: "bg-card border border-border rounded p-2 cursor-pointer transition-colors",
    itemHover: "hover:bg-accent/30 hover:border-accent/50",
    itemSelected: "bg-primary/10 border-primary/30 shadow-sm",
    itemContent: "space-y-1.5",
    expandButton: "w-6 h-6 flex items-center justify-center rounded hover:bg-foreground/5",
    itemFields: "space-y-1",
    field: "space-y-0.5",
    fieldLabel: "text-xs font-medium text-muted-foreground",
    fieldValue: "text-xs font-medium text-foreground",
    expandedContent: "mt-2 pt-2 border-t border-border"
  },
  
  loadingState: {
    container: "flex items-center justify-center h-full w-full p-4 text-muted-foreground",
    content: "space-y-1 text-center",
    icon: "h-4 w-4 animate-spin",
    text: "text-xs"
  },
  
  emptyState: {
    container: "flex items-center justify-center h-full w-full p-4 text-muted-foreground",
    content: "space-y-1 text-center",
    text: "text-xs"
  },
  
  pagination: {
    container: "flex items-center justify-center px-2 py-1 border-t border-border bg-background",
    info: "text-xs text-muted-foreground px-2",
    controls: "flex items-center gap-1",
    buttonGroup: "flex items-center gap-1",
    button: "h-6 w-6 p-0 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
    buttonIcon: "h-3 w-3"
  },
  
  columnVisibility: {
    trigger: 'h-8 w-8',
    triggerIcon: "size-4",
    content: "min-w-64 p-4",
    header: "space-y-4",
    toggleAllButton: "text-sm font-medium cursor-pointer",
    itemList: "space-y-1 pr-2",
    item: "flex items-center justify-between space-x-2",
    checkbox: "cursor-pointer"
  },
  
  filterPopover: {
    trigger: 'h-8 w-8',
    triggerIcon: "size-4",
    content: "w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-2",
    container: "p-0",
    header: "bg-muted/30 rounded p-1.5",
    title: "px-2 pb-1.5 pt-1 text-xs font-medium",
    grid: "grid min-w-0 grid-cols-1",
    column: "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5",
    filterButton: "col-span-2 !grid h-auto w-full min-w-0 grid-cols-subgrid items-center rounded py-1.5 px-2 text-xs",
    filterButtonActive: "bg-primary/15 text-primary font-medium",
    filterButtonInactive: "bg-muted/50 hover:bg-muted/70 text-foreground",
    filterLabel: "text-xs whitespace-nowrap text-muted-foreground"
  },
  
  dragDrop: {
    dragGhost: "pointer-events-none z-[9999]",
    dropIndicator: "fixed w-0.5 bg-primary z-[9999] rounded-full shadow-[0_0_0_2px_color-mix(in_srgb,currentColor_12%,transparent),0_3px_10px_color-mix(in_srgb,currentColor_30%,transparent)]",
    dragTarget: "bg-primary/10 shadow-[inset_0_-1px_0_color-mix(in_srgb,currentColor_20%,transparent)]",
    dragSource: "opacity-25 bg-primary/5"
  },
  
  resize: {
    handle: "absolute top-0 right-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/25 z-10",
    indicator: "absolute top-1/2 right-0 w-0.5 h-4 bg-border group-hover:bg-primary group-hover:w-1 transform -translate-y-1/2 rounded-full transition-[background-color,width]",
    overlay: "fixed inset-0 z-[9999] cursor-col-resize",
    hitslop: "absolute top-0 -right-1 bottom-0 w-3 cursor-col-resize group z-10 hover:bg-primary/10"
  }
}

// Export preset options
export const tableStylePresets = {
  default: defaultTableStyles,
  modern: modernTableStyles,
  compact: compactTableStyles
}

// Helper function to get a preset by name
export function getTableStylePreset(preset: keyof typeof tableStylePresets) {
  return tableStylePresets[preset]
}
