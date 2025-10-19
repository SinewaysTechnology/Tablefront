/**
 * Table store for managing sorting, pagination, column visibility and resize state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Updater, VisibilityState, SortingState, ColumnOrderState, PaginationState } from '@tanstack/react-table'
import { STANDARD_PAGE_SIZE } from '../constants/pagination'
import { RESIZE_CONSTRAINTS } from '../utils'

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
  getState: () => Omit<TableState, 'getState' | 'resetTableState' | 'setSorting' | 'setPagination' | 'setColumnVisibility' | 'setColumnOrder' | 'setColumnWidth' | 'resetColumnWidth'>
  // Actions
  setSorting: UpdaterFn<SortingState>
  setPagination: UpdaterFn<PaginationState>
  setColumnVisibility: UpdaterFn<VisibilityState>
  setColumnOrder: UpdaterFn<ColumnOrderState>
  setColumnWidth: (columnId: string, width: number) => void
  resetColumnWidth: (columnId: string) => void
  resetTableState: () => void
}

export interface TableStoreConfig {
  name: string
  initialColumnVisibility?: VisibilityState
  initialPageSize?: number
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
  
  // Helper function to reset pagination
  const resetPagination = (state: TableState) => ({
    pagination: {
      ...state.pagination,
      pageIndex: 0,
      pageSize: initialPageSize
    }
  })
  
  return create<TableState>()(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Selector to get current state (useful for memoization in components)
        getState: () => {
          const state = get()
          const { getState, resetTableState, setSorting, setPagination, setColumnVisibility, setColumnOrder, setColumnWidth, resetColumnWidth, ...rest } = state
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
          const clampedWidth = Math.max(
            RESIZE_CONSTRAINTS.MIN_WIDTH, 
            Math.min(RESIZE_CONSTRAINTS.MAX_WIDTH, width)
          );
          
          // Safeguard: ensure we never store invalid widths
          if (clampedWidth <= 0 || !Number.isFinite(clampedWidth)) {
            return;
          }
          
          set(state => ({
            columnWidths: {
              ...state.columnWidths,
              [columnId]: { width: clampedWidth, isUserSet: true }
            }
          }));
        },

        resetColumnWidth: (columnId: string) => {
          set(state => {
            // Only reset if the column actually has a stored width
            if (!(columnId in state.columnWidths)) {
              return state; // No change needed - already at automatic sizing
            }
            
            const { [columnId]: removed, ...remainingWidths } = state.columnWidths;
            return {
              columnWidths: remainingWidths
            };
          })
        },
          
        resetTableState: () => set(initialState),
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