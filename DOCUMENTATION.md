# @sineways/react-tablefront — Documentation

A premium, zero-config React DataTable with table, grid, and masonry layouts. Built on TanStack Table with TypeScript, Zustand state, and composable UI.

## Quick Start

```bash
npm install @sineways/react-tablefront
```

Licensing:
```bash
# .env (also reads .env.local / .env.production*)
TABLEFRONT_LICENSE=your-license-key

# package.json (activation must run before the framework build)
"scripts": {
  "dev": "tablefront activate && next dev",
  "build": "tablefront activate && next build"
}
```

Notes:
- If the key is missing or invalid, the build logs guidance and the library still works with a watermark.
- No network calls are made at runtime; activation writes a tiny globals file consumed by the package.
- Set `TABLEFRONT_LICENSE` as a build-time env var on hosts (Vercel, etc.). Running activate only on `next start` is too late for the client bundle.

Minimal setup (styles are auto-included — no CSS import needed):
```tsx
import { DataTable } from '@sineways/react-tablefront'

export default function UsersPage () {
  return <DataTable data={[]} />
}
```

## Features
- **Zero configuration**: columns/search/filters auto-generated
- **Layouts**: table, grid, masonry
- **Interactions**: column drag, resize, expandable rows
- **Search & filters**: field-aware, structured tokens, debounced search (~150ms)
- **Data loading**: pagination and infinite scroll (regular or adaptive)
- **Presets**: default, modern, compact
- **Overrides**: UI components, icons, styles
- **State**: persistence via `storeId`
- **Type Safe**: full TypeScript

## Core API (selected)
```ts
type DataTableProps<T> = {
  data: T[]
  columns?: ColumnDef<T, any>[]
  columnOverrides?: ColumnOverrides<T>
  // First-use default column visibility (persisted via storeId)
  initialColumnVisibility?: { hideAll?: boolean, byId?: Record<string, boolean> }
  fieldOverrides?: FieldOverrides<T>
  customStyles?: PartialTableStyles
  uiComponents?: DataTableUIComponents
  icons?: DataTableIcons
  storeId?: string

  // Interactions
  onRowClick?: (row: T) => void
  selectedRow?: T | null
  autoSelect?: boolean

  // Expandable
  expandable?: boolean
  expandedRows?: Record<string, boolean>
  onToggleExpand?: (row: T) => void
  onExpansionChange?: (rows: Record<string, boolean>) => void
  renderExpandedContent?: (row: T) => React.ReactNode
  /** Width clamping in table mode (defaults true) */
  clampExpandedContentToContainer?: boolean
  clampStaticRowsToContainer?: boolean

  // Rendering & labels
  headerRightElement?: React.ReactNode
  customRenderGridItem?: (row: T, index: number, isSelected: boolean) => React.ReactNode
  searchPlaceholder?: string
  emptyStateText?: string
  loadingText?: string
  isLoading?: boolean

  // Layout
  layout?: {
    showSearchBar?: boolean
    showHeader?: boolean
    showTableHeaders?: boolean
    showColumnVisibility?: boolean
    showFilterButton?: boolean
    displayMode?: 'table' | 'grid' | 'masonry'
    gridColumns?: number
    gridItemMinWidth?: number
    masonryColumns?: number
    masonryItemMinWidth?: number
    masonryGap?: number
  }

  // Paging & infinite scroll
  paginationConfig?: { autoFit?: boolean, pageSize?: number }
  infiniteScrollConfig?: { enabled?: boolean, adaptive?: boolean, loadThreshold?: number, pageSize?: number, increment?: number, maxItems?: number }

  // Column interactions
  enableColumnDrag?: boolean
  enableColumnResize?: boolean
  resizeTimingConfig?: ResizeTimingConfig
}
```

### Default column visibility (first-use)
Set which columns are visible on the initial render. This is applied only when there is no persisted state for the given `storeId`.

```tsx
<DataTable
  data={products}
  storeId='products'
  initialColumnVisibility={{
    hideAll: true,
    byId: { name: true, price: true, rating: true }
  }}
/>
```

Behavior:
- `hideAll: true` hides all columns by default; `byId` toggles specific columns on.
- After the first render, user changes persist and supersede the initial defaults.

## Layouts
- Table (default): rich headers, sorting, drag/resize
- Grid: card items via `customRenderGridItem`
- Masonry: variable-height multi-columns

Grid example:
```tsx
<DataTable
  data={products}
  layout={{ displayMode: 'grid', gridColumns: 3 }}
  customRenderGridItem={(p) => (
    <div className='p-4 border rounded'>
      <h3>{p.name}</h3>
      <p>${p.price}</p>
    </div>
  )}
/>
```

Expandable rows:
```tsx
<DataTable
  data={users}
  expandable
  renderExpandedContent={(u) => (
    <div className='p-4 bg-gray-50'>Email: {u.email}</div>
  )}
  // Clamp expanded content/static rows to container width (default behavior)
  clampExpandedContentToContainer
  clampStaticRowsToContainer
/>
```

### Content Width Clamping (Table Mode)
When a row is expanded, its content is rendered in a row below. In wide tables, this content could span beyond the visible container. Two props control this behavior:

- `clampExpandedContentToContainer` (default: true): Sizes expanded row content to the table's scroll container width so it aligns with the container, not the full table content width.
- `clampStaticRowsToContainer` (default: true): Applies the same container width clamping for `customStaticRows`.

Disable either prop to allow the respective content to span the full table content width:
```tsx
<DataTable
  data={rows}
  expandable
  renderExpandedContent={(r) => <div>Details...</div>}
  clampExpandedContentToContainer={false}
  clampStaticRowsToContainer={false}
/>
```

## Search & Filters
- Free text across searchable fields (search is debounced ~150ms internally)
- Structured tokens via `FilterProcessor`
- Field types: `string | number | date`
- Operators: `> < >= <= = != * !*`

Field overrides (examples):
```ts
const fieldOverrides = {
  status: { filterable: true, type: 'string', preferredValues: ['active','inactive'] },
  age: { filterable: true, type: 'number', defaultOperator: '>=', defaultNumericValue: 18 },
  createdAt: { filterable: true, type: 'date', defaultOperator: '>=' }
}
```

## Interactions
Enable column features:
```tsx
<DataTable data={rows} enableColumnDrag enableColumnResize resizeTimingConfig={{ doubleClickDelay: 300, resetDebounce: 1000 }} />
```

## Pagination & Infinite Scroll
- Pagination: set via `paginationConfig` (e.g., `pageSize`)
- Infinite scroll (two modes):
  - Regular: increases `pageSize` as you near the bottom
  - Adaptive: virtualized windowing for large lists (set `adaptive: true`)

Options (when `infiniteScrollConfig.enabled`):
- `adaptive` (boolean)
- `loadThreshold` (px from bottom to trigger)
- `pageSize` (initial items)
- `increment` (items to add per load)
- `maxItems` (adaptive mode memory cap)

Examples:
```tsx
// Regular infinite scroll
<DataTable
  data={big}
  paginationConfig={{ pageSize: 50 }}
  infiniteScrollConfig={{ enabled: true, increment: 50 }}
/>

// Adaptive (virtualized) infinite scroll
<DataTable
  data={big}
  paginationConfig={{ pageSize: 50 }}
  infiniteScrollConfig={{ enabled: true, adaptive: true, pageSize: 50, maxItems: 150 }}
/>
```

## UI Overrides
Supply your UI primitives:
```ts
const ui = {
  Button: MyButton,
  Popover: MyPopover,
  PopoverTrigger: MyPopover.Trigger,
  PopoverContent: MyPopover.Content,
  Tooltip: MyTooltip,
  TooltipTrigger: MyTooltip.Trigger,
  TooltipContent: MyTooltip.Content,
  ScrollArea: MyScrollArea,
  Switch: MySwitch,
  Label: MyLabel,
  Separator: MySeparator,
  Settings02Icon: MySettingsIcon
}

<DataTable data={rows} uiComponents={ui} />
```

## Icon Overrides
```ts
const icons = {
  Search: MySearchIcon,
  Filter: MyFilterIcon,
  SortAscending: MySortAsc,
  SortDescending: MySortDesc,
  SortUnsorted: MySortDefault,
  PaginationPrevious: MyPrev,
  PaginationNext: MyNext,
  ExpandIcon: MyExpand,
  CollapseIcon: MyCollapse,
  ClearFilters: MyClear,
  X: MyX,
  ColumnSettings: MyColumnSettings
}

<DataTable data={rows} icons={icons} />
```

## Styling
- Presets: `defaultTableStyles`, `modernTableStyles`, `compactTableStyles`
- Helpers: `useTableStyles(customStyles)`, `tableStylePresets`, `getTableStylePreset('modern')`
- Customize only what you need via `customStyles`

```tsx
import { modernTableStyles } from '@sineways/react-tablefront'

<DataTable data={rows} customStyles={modernTableStyles} />

<DataTable data={rows} customStyles={{
  container: 'bg-white',
  table: { tableHeader: 'sticky top-0 bg-background' },
  pagination: { container: 'border-t' }
}} />
```

## Custom Styling
Complete control over every visual element:

```tsx
<DataTable
  data={users}
  customStyles={{
    // Container
    container: "bg-gradient-to-br from-blue-50 to-indigo-100",

    // Search bar
    searchBar: {
      wrapper: "px-0 pt-0 mb-2",
      containerWrapper: "relative",
      container: "bg-white border-2 border-blue-200",
      icon: "text-blue-500",
      input: "text-blue-900 placeholder-blue-400",
      clearButton: "",
      clearButtonIcon: "w-4 h-4"
    },

    // Header area
    header: {
      container: "flex items-center justify-between py-2 px-3 bg-muted/30",
      leftSection: "flex items-center gap-2",
      resultCount: "text-xs text-muted-foreground",
      clearFiltersButton: "text-xs",
      clearFiltersIcon: "size-4",
      rightSection: "flex items-center gap-1"
    },

    // Table (rows, cells, header)
    table: {
      scrollArea: "w-full flex-1 overflow-auto",
      table: "w-full text-sm",
      tableHeader: "sticky top-0 bg-background/90 backdrop-blur border-b",
      tableRow: "border-b hover:bg-muted/30",
      tableRowSelected: "bg-primary/10",
      tableRowHover: "hover:bg-accent/40",
      tableCell: "px-3 py-2 align-middle",
      tableHeaderCell: "h-10 px-3 font-medium text-muted-foreground",
      expandHeader: "w-10 text-center",
      expandButton: "w-10 px-0"
    },

    // Grid mode
    grid: {
      container: "grid gap-3 p-3",
      item: "bg-card border rounded-lg p-4",
      itemHover: "hover:bg-accent/40",
      itemSelected: "bg-primary/10 border-primary/30",
      itemContent: "space-y-2",
      expandButton: "w-8 h-8",
      itemFields: "space-y-1",
      field: "space-y-0.5",
      fieldLabel: "text-xs text-muted-foreground",
      fieldValue: "text-sm font-medium",
      expandedContent: "mt-3 pt-3 border-t"
    },

    // Masonry mode
    masonry: {
      container: "flex gap-3 p-3",
      column: "flex flex-col gap-3",
      item: "bg-card border rounded-lg p-4",
      itemHover: "hover:bg-accent/40",
      itemSelected: "bg-primary/10 border-primary/30",
      itemContent: "space-y-2",
      expandButton: "w-8 h-8",
      itemFields: "space-y-1",
      field: "space-y-0.5",
      fieldLabel: "text-xs text-muted-foreground",
      fieldValue: "text-sm font-medium",
      expandedContent: "mt-3 pt-3 border-t"
    },

    // States
    loadingState: {
      container: "flex items-center justify-center h-full p-6 text-muted-foreground",
      content: "space-y-1 text-center",
      icon: "h-6 w-6 animate-spin",
      text: "text-sm"
    },
    emptyState: {
      container: "flex items-center justify-center h-full p-6 text-muted-foreground",
      content: "space-y-1 text-center",
      text: "text-sm"
    },

    // Pagination
    pagination: {
      variant: "version2", // or "version1"
      container: "flex items-center justify-center px-2 py-1 border-t bg-background",
      info: "text-xs text-muted-foreground px-3",
      controls: "flex items-center gap-2",
      buttonGroup: "flex items-center gap-2",
      button: "h-8 w-8 p-0 hover:bg-muted",
      buttonIcon: "h-4 w-4"
    },

    // Column visibility popover
    columnVisibility: {
      trigger: "h-9 w-9",
      triggerIcon: "size-5",
      content: "w-72 p-4",
      header: "space-y-4",
      toggleAllButton: "text-sm font-medium",
      itemList: "space-y-1 pr-2",
      item: "flex items-center justify-between",
      checkbox: "cursor-pointer"
    },

    // Filter popover
    filterPopover: {
      trigger: "h-9 w-9",
      triggerIcon: "size-5",
      content: "max-w-[95vw] p-4 bg-card",
      container: "",
      header: "",
      title: "text-sm font-medium mb-3",
      grid: "grid grid-cols-1 sm:grid-cols-2 gap-3",
      column: "space-y-1.5",
      filterButton: "min-w-[170px] text-xs bg-foreground/5",
      filterButtonActive: "bg-primary/15 text-primary font-medium",
      filterButtonInactive: "bg-foreground/5",
      filterLabel: "text-xs whitespace-nowrap"
    },

    // Drag & drop
    dragDrop: {
      dragGhost: "pointer-events-none z-[9999] opacity-80 bg-background",
      dropIndicator: "absolute top-0 bottom-0 w-1 bg-primary",
      dragTarget: "bg-muted/50",
      dragSource: "opacity-50"
    },

    // Column resize
    resize: {
      handle: "absolute top-0 right-0 bottom-0 w-1 group-hover:bg-primary/20",
      indicator: "absolute top-1/2 right-0 w-1 h-4 bg-border group-hover:bg-primary/40 -translate-y-1/2 rounded-full",
      overlay: "fixed inset-0 z-[9999] cursor-col-resize",
      hitslop: "absolute top-0 right-0 bottom-0 w-2 cursor-col-resize group"
    }
  }}
/>
```

Style slots overview (for reference):
```ts
customStyles?: Partial<{
  container: string
  searchBar: { wrapper: string; containerWrapper: string; container: string; icon: string; input: string; clearButton: string; clearButtonIcon: string }
  header: { container: string; leftSection: string; resultCount: string; clearFiltersButton: string; clearFiltersIcon: string; rightSection: string }
  table: { scrollArea: string; table: string; tableHeader: string; tableRow: string; tableRowSelected: string; tableRowHover: string; tableCell: string; tableHeaderCell: string; expandHeader: string; expandButton: string }
  grid: { container: string; item: string; itemHover: string; itemSelected: string; itemContent: string; expandButton: string; itemFields: string; field: string; fieldLabel: string; fieldValue: string; expandedContent: string }
  masonry: { container: string; column: string; item: string; itemHover: string; itemSelected: string; itemContent: string; expandButton: string; itemFields: string; field: string; fieldLabel: string; fieldValue: string; expandedContent: string }
  loadingState: { container: string; content: string; icon: string; text: string }
  emptyState: { container: string; content: string; text: string }
  pagination: { variant?: 'version1' | 'version2'; container: string; info: string; controls: string; buttonGroup: string; button: string; buttonIcon: string }
  columnVisibility: { trigger: string; triggerIcon: string; content: string; header: string; toggleAllButton: string; itemList: string; item: string; checkbox: string }
  filterPopover: { trigger: string; triggerIcon: string; content: string; container: string; header: string; title: string; grid: string; column: string; filterButton: string; filterButtonActive: string; filterButtonInactive: string; filterLabel: string }
  dragDrop: { dragGhost: string; dropIndicator: string; dragTarget: string; dragSource: string }
  resize: { handle: string; indicator: string; overlay: string; hitslop: string }
}>
```

Tips:
- Use only the keys you need; unspecified slots fall back to sensible defaults.
- Set `pagination.variant` to switch between compact (v2) and detailed (v1) layouts.
- Keep sticky headers via `table.tableHeader` and adjust with `position: sticky` styles.

## Columns & Fields
- Column overrides per field:
```ts
const columnOverrides = {
  name: {
    visible: true,
    header: () => <span>Name</span>,
    cell: (info) => <strong>{info.getValue?.() ?? ''}</strong>,
    headerAlignment: 'left',
    meta: { className: 'min-w-40' }
  }
}
```

## Exports (high-level)
- Core: `DataTable`
- Subcomponents: `SmartHeader`, `DataGrid`, `DataMasonry`, `DataTableHeader`, `DataTableBody`, `DataTablePagination`, `DataTableStates`
- Icons: `DefaultIcons`, `useDataTableIcons`
- Builders: `applyColumnOverrides`, `applyColumnVisibilityOverrides`, `quickColumns`, `applySmartSizing`, `autoGenerateFields`, `applyFieldOverrides`, `buildFields`
- Stores: `createDataTable`, `createAutoDataTable`, `createSimpleDataTable`
- Styling: `useTableStyles`, presets & helpers
- Utils: `cn`, table utils, resize constants
- Licensing: `checkLicense(key, currentVersion)`

## Licensing
- Commercial license required
- Activation via `.env*` + build-time `tablefront activate` (build-time env required on hosts)
- Library functions with watermark if key is missing/invalid; valid key removes watermark automatically

## Support & Pricing
- Email: info@sineways.tech
- Website: https://tablefront.sineways.tech

