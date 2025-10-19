import { useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { createEntityStore, createSelectionHook, createStoreEntitiesHook } from './createEntityStore'
import { createEntityTableStore } from './createTableStore'
import { createEntityFilterStore } from './createFilterStore'
import { FilterField } from '../filters'
import { buildFields, type FieldOverrides } from '../fieldBuilder'

// Generate a stable store ID to prevent conflicts between multiple tables
function generateStableStoreId(idField: string): string {
  return `tablefront-${idField}`
}

export interface CreateDataTableConfig<TData> {
  idField?: keyof TData
  filters?: FilterField[]
  searches?: FilterField[]
  initialPageSize?: number
  fieldOverrides?: FieldOverrides<TData>
  fieldOptions?: {
    sampleSize?: number
    maxPreferredValues?: number
    excludeFields?: (keyof TData)[]
  }
}

export interface DataTableSetup<TData> {
  // Pre-configured props for DataTable component
  dataTableProps: {
    tableStore: any
    filterStore: any
  }
  
  // Selection management
  selectedItem: TData | null
  setSelectedItem: (item: TData | null) => void
  onRowClick: (row: TData) => void
  
  // Manual refresh capability
  refresh: () => Promise<TData[]>
  
  // Direct store access for advanced usage
  stores: {
    entityStore: any
    tableStore: any
    filterStore: any
  }
}


export function createDataTable<TData>({
  idField = 'id' as keyof TData,
  filters = [],
  searches = [],
  initialPageSize,
  fieldOverrides,
  fieldOptions
}: CreateDataTableConfig<TData>) {
  
  const storeId = generateStableStoreId(String(idField))
  
  const tableStore = createEntityTableStore(storeId, { 
    initialPageSize 
  })
  
  const filterStore = createEntityFilterStore(
    `${storeId}-filters`, 
    filters, 
    searches
  )
  
  const useSelection = createSelectionHook<TData>(storeId, String(idField))
  
  return function useDataTable(): DataTableSetup<TData> {
    const { selectedItem, setSelectedItem } = useSelection()
    
    const onRowClick = useCallback((row: TData) => {
      setSelectedItem(row)
    }, [setSelectedItem])
    
      const refresh = useCallback(async () => {
    // Placeholder - implement data refetching in your component
    console.warn('refresh() should be handled by re-fetching data in your component')
    return []
  }, [])
    
    return {
      dataTableProps: {
        tableStore,
        filterStore
      },
      selectedItem,
      setSelectedItem,
      onRowClick,
      refresh,
      stores: {
        entityStore: null,
        tableStore,
        filterStore
      }
    }
  }
}


export function createAutoDataTable<TData>({
  data,
  idField = 'id' as keyof TData,
  fieldOverrides = {},
  initialPageSize,
  fieldOptions
}: {
  data: TData[]
  idField?: keyof TData
  fieldOverrides?: FieldOverrides<TData>
  initialPageSize?: number
  fieldOptions?: {
    sampleSize?: number
    maxPreferredValues?: number
    excludeFields?: (keyof TData)[]
  }
}) {
  
  const { filters, searches } = buildFields(data, fieldOverrides, {
    idField,
    ...fieldOptions
  })
  
  return createDataTable({
    idField,
    filters,
    searches,
    initialPageSize
  })
}


export function createSimpleDataTable<TData>(
  idField: keyof TData = 'id' as keyof TData
) {
  return createDataTable({
    idField,
    filters: [],
    searches: []
  })
} 