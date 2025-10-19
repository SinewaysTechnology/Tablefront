/**
 * Internal entity store creation utilities
 * 
 * These functions are used internally by createDataTable to manage entity data,
 * selection state, and data fetching hooks. They are not part of the public API.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { FilterState } from './createFilterStore'
import { TableState } from './createTableStore'
import { StoreApi, UseBoundStore } from 'zustand'
import { STANDARD_PAGE_SIZE } from '../constants/pagination'

export interface EntityStoreOptions<T> {
  name: string
  idField?: string
}

export interface EntityState<T> {
  // State
  data: {
    items: T[]
    total: number
  }
  isLoading: boolean
  error: Error | null
  lastUpdated: number | null
  
  // Actions
  setData: (data: T[]) => void
  appendData: (data: T[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void
  resetStore: () => void
}

// Separate interface for selection state
export interface SelectionState<T> {
  selectedItem: T | null
  setSelectedItem: (item: T | null) => void
}

export interface EntityStoreHook<T> {
  data: T[]
  isLoading: boolean
  error: Error | null
  totalResults: number
  fetchData: (params?: Record<string, any>) => Promise<void>
} 

// Type for Zustand store
type SelectionStore<T> = UseBoundStore<StoreApi<SelectionState<T>>>

// Type-erased selection store for heterogeneous map storage
type ErasedSelectionStore = UseBoundStore<StoreApi<SelectionState<unknown>>>

function eraseSelectionStore<T>(store: SelectionStore<T>): ErasedSelectionStore {
  return store as unknown as ErasedSelectionStore
}

// Map to store selection stores by entity name (type-erased)
const selectionStoresMap = new Map<string, {
  store: ErasedSelectionStore,
  lastAccessed: number,
  subscribers: number
}>()

// Define a maximum store age in milliseconds (e.g., 30 minutes)
const MAX_STORE_AGE = 30 * 60 * 1000

// Cache cleanup function - call this periodically to remove unused stores
export function cleanupSelectionStores() {
  const now = Date.now()
  const keysToRemove: string[] = []
  
  selectionStoresMap.forEach((entry, key) => {
    // Remove stores that haven't been accessed in a while and have no subscribers
    if (entry.subscribers === 0 && now - entry.lastAccessed > MAX_STORE_AGE) {
      keysToRemove.push(key)
    }
  })
  
  keysToRemove.forEach(key => selectionStoresMap.delete(key))
}

// Set up a periodic cleanup every 5 minutes
let cleanupInterval: NodeJS.Timeout | null = null
if (typeof window !== 'undefined') {
  cleanupInterval = setInterval(cleanupSelectionStores, 5 * 60 * 1000)
}

export function createTypeEntityStore<T>(
  entityName: string,
  options: {
    idField?: string
  } = {}
) {
  const {
    idField = 'id',
  } = options
  
  const storeResult = createEntityStore<T>({
    name: `${entityName.toLowerCase()}-store`,
    idField
  })
  
  // Create the selection store for this entity type
  const selectionStoreName = `${entityName.toLowerCase()}-selection`
  
  // Create or update the selection store entry
  if (!selectionStoresMap.has(selectionStoreName)) {
    const selectionStore = create<SelectionState<T>>((set) => ({
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item })
    }))
    
    selectionStoresMap.set(selectionStoreName, {
      store: eraseSelectionStore(selectionStore),
      lastAccessed: Date.now(),
      subscribers: 0
    })
  } else {
    // Update last accessed time
    const entry = selectionStoresMap.get(selectionStoreName)!
    entry.lastAccessed = Date.now()
  }
  
  return storeResult
} 

// Helper function to get the selection hook for a specific entity type
export function createSelectionHook<T>(entityName: string, idField = 'id') {
  const selectionStoreName = `${entityName.toLowerCase()}-selection`
  
  // Get or create the selection store
  if (!selectionStoresMap.has(selectionStoreName)) {
    const selectionStore = create<SelectionState<T>>((set) => ({
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item })
    }))
    
    selectionStoresMap.set(selectionStoreName, {
      store: eraseSelectionStore(selectionStore),
      lastAccessed: Date.now(),
      subscribers: 0
    })
  } else {
    // Update last accessed time
    const entry = selectionStoresMap.get(selectionStoreName)!
    entry.lastAccessed = Date.now()
  }
  
  // Get the store from the map
  const entry = selectionStoresMap.get(selectionStoreName)!
  const selectionStore = entry.store as SelectionStore<T>
  
  // Create a wrapper function that tracks subscribers
  const useWrappedSelectionStore = () => {
    // Increment subscriber count on mount
    useEffect(() => {
      entry.subscribers++
      
      // Decrement subscriber count on unmount
      return () => {
        entry.subscribers--
        // Optional: trigger immediate cleanup if subscriber count reaches 0
        if (entry.subscribers === 0 && cleanupInterval) {
          clearInterval(cleanupInterval)
          cleanupSelectionStores()
          cleanupInterval = setInterval(cleanupSelectionStores, 5 * 60 * 1000)
        }
      }
    }, [])
    
    // Return the actual store hook
    return selectionStore()
  }
  
  return useWrappedSelectionStore
}

// Helper function to get selection state outside of React components
export function getSelection<T>(entityName: string): SelectionState<T> {
  const selectionStoreName = `${entityName.toLowerCase()}-selection`
  
  // Get or create the selection store
  if (!selectionStoresMap.has(selectionStoreName)) {
    const selectionStore = create<SelectionState<T>>((set) => ({
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item })
    }))
    
    selectionStoresMap.set(selectionStoreName, {
      store: eraseSelectionStore(selectionStore),
      lastAccessed: Date.now(),
      subscribers: 0
    })
  } else {
    // Update last accessed time
    const entry = selectionStoresMap.get(selectionStoreName)!
    entry.lastAccessed = Date.now()
  }
  
  // Get the store from the map
  const entry = selectionStoresMap.get(selectionStoreName)!
  const selectionStore = entry.store as SelectionStore<T>
  
  return {
    selectedItem: selectionStore.getState().selectedItem,
    setSelectedItem: selectionStore.getState().setSelectedItem
  }
}

export function createEntityStore<T>(options: EntityStoreOptions<T>) {
  const {
    name,
    idField = 'id'
  } = options

  const initialState: EntityState<T> = {
    data: {
      items: [],
      total: 0
    },
    isLoading: false,
    error: null,
    lastUpdated: null,
    
    // Basic state setters
    setData: () => {},
    appendData: () => {},
    setLoading: () => {},
    setError: () => {},
    resetStore: () => {}
  }

  return create<EntityState<T>>()(
    persist(
      (set) => ({
        ...initialState,

        // Basic setters
        setData: (items) => set({
          data: { items, total: items?.length || 0 },
          lastUpdated: Date.now()
        }),
        
        appendData: (newItems) => set(state => {
          // Combine items, avoiding duplicates by ID
          const existingIds = new Set(state.data.items.map(item => (item as unknown as Record<string, unknown>)[idField as string]))
          const uniqueNewItems = newItems.filter(item => !existingIds.has((item as unknown as Record<string, unknown>)[idField as string]))
          
          const combinedItems = [...state.data.items, ...uniqueNewItems]
          
          return {
            data: {
              items: combinedItems,
              total: combinedItems.length
            },
            lastUpdated: Date.now()
          }
        }),
        
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        
        // Reset store to initial state
        resetStore: () => set(initialState)
      }),
      {
        name,
        partialize: (state) => ({
          // Don't persist any state for better performance
          // We're just keeping the persistence in place for backward compatibility
        })
      }
    )
  )
}

/**
 * Creates a hook for accessing entities with filter and pagination support
 * @param entityStore The entity store to use
 * @param filterStore The filter store for applying filters
 * @param tableStore Optional table store for pagination and sorting
 * @param fetchDataCallback External callback function for fetching data
 * @returns A hook that returns filtered and paginated data
 */
export function createStoreEntitiesHook<T>(
  entityStore: ReturnType<typeof createEntityStore<T>>,
  filterStore: { getState: () => FilterState; subscribe: StoreApi<FilterState>['subscribe'] },
  tableStore?: { getState: () => TableState; subscribe: StoreApi<TableState>['subscribe'] },
  fetchDataCallback?: (params: Record<string, any>) => Promise<void>
): () => EntityStoreHook<T> {
  return () => {
    // Get state from stores
    const { 
      data, 
      isLoading, 
      error
    } = entityStore()
    
    // Subscribe to filter store changes directly
    const [filterStoreState, setFilterStoreState] = useState(() => filterStore.getState())
    
    useEffect(() => {
      const unsubscribe = filterStore.subscribe(state => setFilterStoreState(state))
      return () => unsubscribe()
    }, [filterStore])
    
    // Get current filter state from subscribed state
    const filters = filterStoreState.filters
    const searchValue = filterStoreState.searchValue
    const filterProcessor = filterStoreState.filterProcessor
    
    // Subscribe to table store changes if it exists
    const [tableStoreState, setTableStoreState] = useState(() => 
      tableStore ? tableStore.getState() : { 
        pagination: { pageIndex: 0, pageSize: STANDARD_PAGE_SIZE },
        sorting: [] 
      }
    )
    
    useEffect(() => {
      if (!tableStore) return
      const unsubscribe = tableStore.subscribe(state => setTableStoreState(state))
      return () => unsubscribe()
    }, [tableStore])
    
    const pagination = tableStoreState.pagination
    const sorting = tableStoreState.sorting
    
    // Track whether we need to refetch data
    const [lastParams, setLastParams] = useState<string>('')
    
    // Convert filters to params
    const params = useMemo(() => {
      const baseParams: Record<string, any> = {}
      
      // Add text search
      if (searchValue && !searchValue.includes(':')) {
        baseParams.search = searchValue
      }
      
      // Add filters
      if (filters.length > 0) {
        filters.forEach((filter: { id: string, value: any }) => {
          if (typeof filter.id === 'string') {
            // Handle special filter formats
            if (filter.id.includes(':')) {
              const [field, operator] = filter.id.split(':')
              baseParams[field] = {
                operator,
                value: filter.value
              }
            } else {
              baseParams[filter.id] = filter.value
            }
          }
        })
      }
      
      // Add pagination
      if (tableStore) {
        baseParams.page = pagination.pageIndex
        baseParams.pageSize = pagination.pageSize
        
        // Add sorting
        if (sorting.length > 0) {
          baseParams.sort = sorting.map((sort: { id: string, desc: boolean }) => {
            return sort.desc ? `-${sort.id}` : sort.id
          }).join(',')
        }
      }
      
      return baseParams
    }, [filters, searchValue, pagination, sorting, tableStore])
    
    // Define fetch data function that uses the callback if provided
    const fetchData = useCallback(async (fetchParams = {}) => {
      if (fetchDataCallback) {
        return fetchDataCallback({...params, ...fetchParams})
      }
      console.warn('No fetchDataCallback provided to createStoreEntitiesHook')
      return Promise.resolve()
    }, [fetchDataCallback, params])
    
    // Fetch data when params change
    useEffect(() => {
      if (!fetchDataCallback) return
      
      const paramsString = JSON.stringify(params)
      if (paramsString !== lastParams) {
        fetchData(params)
        setLastParams(paramsString)
      }
    }, [params, lastParams, fetchData, fetchDataCallback])
    
    // Apply client-side filtering and search
    const filteredData = useMemo(() => {
      if (!data.items.length) return data.items
      
      let result = data.items
      
      // Apply text search first (searches across multiple fields)
      if (searchValue && filterProcessor) {
        if (searchValue.includes(':')) {
          // If search value contains filters, extract them and apply
          const extractedFilters = filterProcessor.extractFilters(searchValue)
          if (extractedFilters.length > 0) {
            result = filterProcessor.applyFilters(result, extractedFilters)
          }
                 } else {
           // Simple text search across search fields
           const searchLower = searchValue.toLowerCase()
           result = result.filter((item: any) => {
             return filterProcessor.getSearchFields().some(field => {
               const value = String(item[field.id] || '').toLowerCase()
               return value.includes(searchLower)
             })
           })
         }
      }
      
      // Apply additional filters if they exist
      if (filters.length > 0 && filterProcessor) {
        result = filterProcessor.applyFilters(result, filters)
      }
      
      return result
    }, [data.items, filters, searchValue, filterProcessor])
    
    return {
      data: filteredData,
      isLoading,
      error,
      totalResults: filteredData.length, // Use filtered data length for accurate count
      fetchData
    }
  }
}

// Cleanup when window unloads (for SPA navigation)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }
  })
} 