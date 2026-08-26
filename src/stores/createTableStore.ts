/**
 * Table store for managing sorting, pagination, column visibility and resize state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Updater, VisibilityState, SortingState, ColumnOrderState, PaginationState } from '@tanstack/react-table'
import { STANDARD_PAGE_SIZE } from '../constants/pagination'
import { clampColumnWidth } from '../utils'

export type UpdaterFn<T> = (updaterOrValue: Updater<T>) => void

// Column width state with user resize tracking
export interface ColumnWidthInfo {
  width: number
  isUserSet: boolean
}

export interface ColumnWidthState {
  [columnId: string]: ColumnWidthInfo
}

export interface TableState {
  sorting: SortingState
  pagination: PaginationState
  columnVisibility: VisibilityState
  columnOrder: ColumnOrderState
  columnWidths: ColumnWidthState
  // Selectors
  getState: () => Omit<
    TableState,
    | 'getState'
    | 'resetTableState'
    | 'resetToDefaults'
    | 'setSorting'
    | 'setPagination'
    | 'setColumnVisibility'
    | 'setColumnOrder'
    | 'setColumnWidth'
    | 'setColumnWidths'
    | 'resetColumnWidth'
  >
  // Actions
  setSorting: UpdaterFn<SortingState>
  setPagination: UpdaterFn<PaginationState>
  setColumnVisibility: UpdaterFn<VisibilityState>
  setColumnOrder: UpdaterFn<ColumnOrderState>
  setColumnWidth: (columnId: string, width: number) => void
  /** Atomically persist an exact rendered-width snapshot. */
  setColumnWidths: (widths: Record<string, number>) => void
  resetColumnWidth: (columnId: string, pinWidths?: Record<string, number>) => void
  resetTableState: () => void
  /**
   * Atomic reset of persisted table chrome to defaults.
   * Visibility is set explicitly (never left empty) so override presets stick.
   */
  resetToDefaults: (defaultColumnVisibility: VisibilityState) => void
}

export interface TableStoreConfig {
  name: string
  initialColumnVisibility?: VisibilityState
  initialPageSize?: number
}

const toUserColumnWidth = (width: number): number | undefined => {
  const clampedWidth = clampColumnWidth(width)
  if (!Number.isFinite(clampedWidth) || clampedWidth <= 0) return undefined
  return clampedWidth
}

const createInitialState = (
  initialColumnVisibility = {}, 
  initialPageSize = STANDARD_PAGE_SIZE
) => ({
  sorting: [] as SortingState,
  pagination: {
    pageIndex: 0,
    pageSize: initialPageSize,
  },
  columnVisibility: initialColumnVisibility,
  columnOrder: [] as ColumnOrderState,
  columnWidths: {} as ColumnWidthState,
})

export function createEntityTableStore(
  entityName: string,
  options: {
    initialColumnVisibility?: VisibilityState
    initialPageSize?: number
  } = {}
) {
  return createTableStore({
    name: `${entityName}-table-settings`,
    ...options
  })
}

export function createTableStore(options: TableStoreConfig) {
  const { 
    name, 
    initialColumnVisibility = {},
    initialPageSize = STANDARD_PAGE_SIZE
  } = options
  
  const initialState = createInitialState(initialColumnVisibility, initialPageSize)
  
  // Reset to first page but keep pageSize.
  // Infinite scroll grows pageSize; wiping it on sort/visibility changes feels broken.
  const resetPagination = (state: TableState) => ({
    pagination: {
      ...state.pagination,
      pageIndex: 0,
    }
  })
  
  return create<TableState>()(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Selector to get current state (useful for memoization in components)
        getState: () => {
          const state = get()
          const {
            getState,
            resetTableState,
            resetToDefaults,
            setSorting,
            setPagination,
            setColumnVisibility,
            setColumnOrder,
            setColumnWidth,
            setColumnWidths,
            resetColumnWidth,
            ...rest
          } = state
          return rest
        },
        
        setSorting: (updaterOrValue) => {
          set(state => {
            const newSorting = typeof updaterOrValue === 'function'
              ? updaterOrValue(state.sorting)
              : updaterOrValue

            return { 
              sorting: newSorting,
              ...resetPagination(state)
            }
          })
        },
        
        setPagination: (updaterOrValue) => {
          set(state => ({
            pagination: typeof updaterOrValue === 'function'
              ? updaterOrValue(state.pagination)
              : updaterOrValue,
          }))
        },
        
        setColumnVisibility: (updaterOrValue) => {  
          set(state => {
            const newVisibility = typeof updaterOrValue === 'function'
              ? updaterOrValue(state.columnVisibility)
              : updaterOrValue

            return { 
              columnVisibility: newVisibility,
              ...resetPagination(state)
            }
          })
        },
        
        setColumnOrder: (updaterOrValue) =>
          set(state => {
            return {
              columnOrder: typeof updaterOrValue === 'function'
                ? updaterOrValue(state.columnOrder)
                : updaterOrValue,
              ...resetPagination(state)
            }
          }),

        setColumnWidth: (columnId: string, width: number) => {
          const clampedWidth = toUserColumnWidth(width)
          if (clampedWidth == null) return

          set(state => ({
            columnWidths: {
              ...state.columnWidths,
              [columnId]: { width: clampedWidth, isUserSet: true }
            }
          }));
        },

        setColumnWidths: (widths: Record<string, number>) => {
          set(state => {
            const nextWidths = { ...state.columnWidths }
            let changed = false

            for (const [columnId, width] of Object.entries(widths)) {
              const clampedWidth = toUserColumnWidth(width)
              if (clampedWidth == null) continue

              const current = nextWidths[columnId]
              if (current?.isUserSet && current.width === clampedWidth) continue

              nextWidths[columnId] = { width: clampedWidth, isUserSet: true }
              changed = true
            }

            return changed ? { columnWidths: nextWidths } : state
          })
        },

        resetColumnWidth: (columnId: string, pinWidths?: Record<string, number>) => {
          set(state => {
            // Pins only exist to hold neighbors still while THIS column leaves
            // the store. If it was never user-resized, do not persist others.
            if (!(columnId in state.columnWidths)) {
              return state
            }

            const nextWidths = { ...state.columnWidths }
            delete nextWidths[columnId]

            if (pinWidths) {
              for (const [id, width] of Object.entries(pinWidths)) {
                if (id === columnId) continue
                const clampedWidth = toUserColumnWidth(width)
                if (clampedWidth == null) continue

                const current = nextWidths[id]
                if (current?.isUserSet && current.width === clampedWidth) continue
                nextWidths[id] = { width: clampedWidth, isUserSet: true }
              }
            }

            return { columnWidths: nextWidths }
          })
        },
          
        resetTableState: () => set(initialState),

        resetToDefaults: (defaultColumnVisibility: VisibilityState) => {
          const currentPageSize = get().pagination?.pageSize || initialPageSize
          // One write. Always set the resolved preset (never `{}`).
          set({
            sorting: [],
            columnOrder: [],
            columnWidths: {},
            columnVisibility: { ...defaultColumnVisibility },
            pagination: {
              pageIndex: 0,
              pageSize: currentPageSize,
            },
          })
        },
      }),
      {
        name,
        partialize: (state) => ({ 
          columnVisibility: state.columnVisibility,
          sorting: state.sorting,
          columnOrder: state.columnOrder,
          columnWidths: state.columnWidths
        }),
      }
    )
  )
}
