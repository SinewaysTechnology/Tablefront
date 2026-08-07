# @sineways/react-tablefront

A premium, feature-rich DataTable component that works out of the box with zero configuration.

For more information and licensing, visit our [website](https://tablefront.sineways.tech). For a live demo, see [demo page](https://tablefront.sineways.tech/demo).


## Features

- **Zero Configuration** - Works out of the box
- **Multiple Display Modes** - Table, Grid, and Masonry layouts
- **Advanced Interactions** - Column drag-and-drop, resizing, expandable rows
- **Smart Auto-Generation** - Columns, filters, and searches auto-generated
- **Responsive Design** - Mobile-first approach
- **Performance Optimized** - Virtual scrolling, debounced search
- **Type Safe** - Full TypeScript support
- **State Persistence** - User preferences saved automatically
- **Composable UI** - Override UI components, icons, and styles
- **Predictable Filters** - Structured search and field-level filters

## Quick Start

### 1) Install Package
```bash
npm install @sineways/react-tablefront
```

### 2) Activate License (optional)
Tablefront works without a key, but shows a small watermark. To remove it, provide a key and run activation at build time.

Add your key to `.env` (or `.env.local` / `.env.production` — activation reads all of them):
```bash
TABLEFRONT_LICENSE=your-license-key
```

Ensure activation runs during your build (example for Next.js):
```json
{
  "scripts": {
    "dev": "tablefront activate && next dev",
    "build": "tablefront activate && next build"
  }
}
```

Notes:
- Activation must run **before** `next build` / `next dev` so the key is baked into the bundle. Running it only on `next start` is too late for the client bundle.
- If the key is missing or invalid, the build prints guidance and the library still works with a watermark.
- No runtime calls are made; activation writes a small globals file used by the components.
- Hosting providers: set `TABLEFRONT_LICENSE` as a build-time environment variable (not only a runtime secret).

### 3) Basic Usage
Styles are bundled and applied automatically when you import the package — no CSS import required.

```tsx
import { DataTable } from '@sineways/react-tablefront'

function UsersPage () {
  const [users, setUsers] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)

  return (
    <DataTable
      data={users}
      isLoading={isLoading}
      storeId='userTable'
    />
  )
}
```

Optional: if your bundler strips CSS side-effects, import styles once:
```ts
import '@sineways/react-tablefront/styles.css'
```

## API Reference

### <DataTable TData>(props)

Required props:
```ts
{
  data: TData[]
}
```

Key optional props (selected):
```ts
{
  // Columns & fields
  columns?: ColumnDef<TData, any>[]
  columnOverrides?: ColumnOverrides<TData>
  // First-use default column visibility (persisted via storeId)
  initialColumnVisibility?: { hideAll?: boolean, byId?: Record<string, boolean> }
  fieldOverrides?: FieldOverrides<TData>

  // Styling & UI
  customStyles?: PartialTableStyles
  uiComponents?: DataTableUIComponents
  icons?: DataTableIcons
  storeId?: string

  // Row interaction
  onRowClick?: (row: TData) => void
  selectedRow?: TData | null
  autoSelect?: boolean

  // Expandable rows
  expandable?: boolean
  expandedRows?: Record<string, boolean>
  onToggleExpand?: (row: TData) => void
  onExpansionChange?: (expandedRows: Record<string, boolean>) => void
  renderExpandedContent?: (row: TData) => React.ReactNode
  // Width clamping (table mode)
  clampExpandedContentToContainer?: boolean // default: true
  clampStaticRowsToContainer?: boolean // default: true

  // Custom rendering
  headerRightElement?: React.ReactNode
  customRenderGridItem?: (row: TData, index: number, isSelected: boolean) => React.ReactNode
  customStaticRows?: React.ReactNode[]
  customStaticRowsSticky?: boolean

  // Text & states
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

  // Pagination & infinite scroll
  paginationConfig?: {
    autoFit?: boolean
    pageSize?: number
  }
  infiniteScrollConfig?: {
    enabled?: boolean
    adaptive?: boolean
    loadThreshold?: number
    pageSize?: number
    increment?: number
    maxItems?: number
  }

  // Feature toggles
  enableColumnDrag?: boolean
  enableColumnResize?: boolean
  resizeTimingConfig?: ResizeTimingConfig
}
```

### Default column visibility (first-use)
You can control which columns are shown on first use. The initial state is persisted per `storeId`.

```tsx
<DataTable
  data={products}
  storeId='products'
  initialColumnVisibility={{
    hideAll: true,
    byId: { name: true, price: true }
  }}
/>
```

Notes:
- When `hideAll` is true, all columns are hidden by default and only the `byId` entries marked `true` are shown.
- Once the user changes visibility, it persists and overrides the initial defaults on subsequent renders.


## Filters & Search
`FilterProcessor` powers structured filters and free-text search.
- Field types: `number`, `string`, `date`
- Operators: `> < >= <= = != * !*`
- Field overrides support `path`, `aliases`, `preferredValues`, `defaultOperator`, `defaultNumericValue`, `isPercentage`, etc.

Examples:
```txt
- impressions:>100
- createdAt:>=2024-01-01
- status:active  (string contains)
- -status:active (negated)
```


## UI Overrides
You can replace internal UI with your components via `uiComponents`:
```ts
export type DataTableUIComponents = {
  Button?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  FilterButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  ColumnButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  ClearButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  ClearSearchButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  PaginationButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  FilterItemButton?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>
  ScrollArea?: ComponentType<{ className?: string; children?: ReactNode }>
  Popover?: ComponentType<{ children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }>
  PopoverTrigger?: ComponentType<{ children: ReactNode; asChild?: boolean }>
  PopoverContent?: ComponentType<{ children: ReactNode; className?: string; align?: 'center' | 'start' | 'end'; sideOffset?: number }>
  Tooltip?: ComponentType<{ children: ReactNode }>
  TooltipTrigger?: ComponentType<{ children: ReactNode; asChild?: boolean }>
  TooltipContent?: ComponentType<{ children: ReactNode; className?: string }>
  Switch?: ComponentType<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; className?: string; id?: string }>
  Label?: ComponentType<{ children?: ReactNode; htmlFor?: string; className?: string }>
  Separator?: ComponentType<{ className?: string }>
  Settings02Icon?: ComponentType<{ className?: string }>
}
```


## Icon Overrides
Override any default icon:
```ts
export type DataTableIcons = {
  Loader?: ComponentType<IconProps>
  PaginationPrevious?: ComponentType<IconProps>
  PaginationNext?: ComponentType<IconProps>
  SortAscending?: ComponentType<IconProps>
  SortDescending?: ComponentType<IconProps>
  SortUnsorted?: ComponentType<IconProps>
  ExpandIcon?: ComponentType<IconProps>
  CollapseIcon?: ComponentType<IconProps>
  ClearFilters?: ComponentType<IconProps>
  Search?: ComponentType<IconProps>
  X?: ComponentType<IconProps>
  Filter?: ComponentType<IconProps>
  ColumnSettings?: ComponentType<IconProps>
}
```
Also available: `DefaultIcons`, `useDataTableIcons()` hook.


## Styling
- Pass `customStyles` to override any style slot. See `PartialTableStyles` in `variants` for structure.
- Presets: `defaultTableStyles`, `modernTableStyles`, `compactTableStyles`
- Helpers: `useTableStyles(customStyles)`, `tableStylePresets`, `getTableStylePreset('modern')`
Example preset usage:
```ts
import { DataTable, modernTableStyles } from '@sineways/react-tablefront'

<DataTable data={rows} customStyles={modernTableStyles} />
```


## Layout Modes
- **Table**: default rich table with sorting, resizing, column visibility
- **Grid**: card-like layout via `customRenderGridItem`
- **Masonry**: variable height multi-column layout

Grid example:
```tsx
<DataTable
  data={products}
  layout={{ displayMode: 'grid', gridColumns: 3 }}
  customRenderGridItem={(p) => (
    <div className='product-card'>
      <img src={p.image} alt={p.name} />
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
    <div className='p-4 bg-gray-50'>
      <h3>User Details</h3>
      <p>Email: {u.email}</p>
    </div>
  )}
  // Expanded content and custom static rows are clamped to the scroll container
  // width by default. Disable if you want them to span the full table content width.
  clampExpandedContentToContainer
  clampStaticRowsToContainer
/>
```

Content width clamping (table mode):
- By default, expanded row content and custom static rows are sized to the table's scroll container width, so they align with the container instead of the full table content width.
- To allow full-width content, set `clampExpandedContentToContainer={false}` and/or `clampStaticRowsToContainer={false}`.


## Named Exports
```ts
// Core
export { DataTable }

// Subcomponents
export { SmartHeader }
export { DataTableStates, LoadingState, EmptyState }
export { DataTablePagination, PaginationInfo, PaginationControls }
export { DataTableHeader, ClearFiltersButton, SearchInput }
export { DataTableBody, TableRow, TableCell, ExpandButton }
export { DataGrid, GridItem, GridField }
export { DataMasonry, MasonryItem, MasonryField }

// Icons
export { DefaultIcons, useDataTableIcons }

// Column & field tools
export { applyColumnOverrides, applyColumnVisibilityOverrides }
export { quickColumns, applySmartSizing }
export { autoGenerateFields, applyFieldOverrides, buildFields }

// Stores
export { createDataTable, createAutoDataTable, createSimpleDataTable }

// Styles
export { useTableStyles }
export { defaultTableStyles, modernTableStyles, compactTableStyles, tableStylePresets, getTableStylePreset }

// Utils
export { cn }
export { generateStableStoreId, getFirstField, isValidId, safeStringId, safeEquals }
export { DEFAULT_RESIZE_DOUBLE_CLICK_DELAY, DEFAULT_RESIZE_RESET_DEBOUNCE }
```

Key types are exported from `types/DataTableTypes` (e.g., `DataTableProps`, `DataTableLayout`, `DataTableUIComponents`, `DataTableIcons`, `PartialTableStyles`, `ResizeTimingConfig`, etc.).


## Licensing
This is a commercial product.

Simplified activation:
- Add `TABLEFRONT_LICENSE` to your `.env`
- Run `tablefront activate` as part of your build (e.g., `"build": "tablefront activate && next build"`)

Behavior:
- Missing/invalid key: library works with a small watermark; build and browser consoles show helpful messages
- Valid key: watermark is removed automatically


## Support
- **Email**: info@sineways.tech
- **Website**: https://tablefront.sineways.tech

## License
Commercial license required. See `LICENSE.md` for details.