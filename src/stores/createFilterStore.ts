/**
 * Internal filter store creation utilities
 * 
 * These functions are used internally by createDataTable to manage filter and search state.
 * They are not part of the public API.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type ComparisonOperator,
  FilterField,
  FilterOption,
  FilterProcessor,
  parseFilterId,
  tokenizeFilterInput,
} from '../filters'
import { ColumnFiltersState } from '@tanstack/react-table'

// Simple feature extension type
export type Feature = {
  state?: Record<string, any>
  actions?: Record<string, (
    set: (fn: (state: any) => any) => void, 
    get: () => any
  ) => any>
}

export interface FilterState {
  // Core state
  filters: ColumnFiltersState
  searchValue: string
  availableFilters: FilterOption[]
  appliedFilters: Set<string>
  filterSearchTerms: Map<string, string>
  filterProcessor: FilterProcessor
  
  // Actions
  setFilters: (filters: ColumnFiltersState) => void
  setSearchValue: (value: string) => void
  setAvailableFilters: () => void
  toggleFilter: (filter: FilterOption) => void
  setFieldFilter: (fieldId: string, operator: ComparisonOperator, value: unknown) => boolean
  removeFieldFilter: (fieldId: string) => void
  isFilterActive: (filterId: string) => boolean
  clearFilters: () => void
  syncFiltersFromSearchValue: () => void
  
  // Feature extensions
  [key: string]: any
}

const removeFieldTokens = (
  searchValue: string,
  fieldId: string,
  filterProcessor: FilterProcessor,
): string => tokenizeFilterInput(searchValue)
  .filter(token => {
    const parsed = filterProcessor.parseFilterToken(token)
    return !parsed || parseFilterId(parsed.id).field !== fieldId
  })
  .join(' ')
  .trim()

// Simpler filter store creation without persistence
export function createFilterStore(
  name: string,
  filterFields: FilterField[],
  searchFields: FilterField[],
  options: {
    features?: Record<string, Feature>
  } = {}
) {
  const { features = {} } = options
  
  // Create the filter processor
  const filterProcessor = new FilterProcessor({
    filterFields,
    searchFields
  })
  
  return create<FilterState>()(
    persist(
      (set, get) => {
        // Generate initial filter suggestions
        const initialAvailableFilters = filterProcessor.generateFilterSuggestions();
        
        // Base state
        const state: FilterState = {
      // Core state
      filters: [],
      searchValue: '',
      availableFilters: initialAvailableFilters,
      appliedFilters: new Set<string>(),
      filterSearchTerms: new Map<string, string>(),
      filterProcessor,
      
      // Regenerate filter suggestions if needed
      setAvailableFilters: () => {
        set({ 
          availableFilters: filterProcessor.generateFilterSuggestions() 
        })
      },
      
      // Simple setters
      setFilters: (filters) => set({ filters }),
      setSearchValue: (value) => {
        set({ searchValue: value })
        // Immediately sync filters when search value changes
        get().syncFiltersFromSearchValue()
      },
      
      // Clear structured column filters while preserving the quick-search text.
      clearFilters: () => {
        const searchValue = tokenizeFilterInput(get().searchValue)
          .filter(token => !filterProcessor.parseFilterToken(token))
          .join(' ')
          .trim()
        set({
          filters: filterProcessor.extractFilters(searchValue),
          appliedFilters: new Set(),
          searchValue,
          filterSearchTerms: new Map(),
        })
      },
      
      // Toggle a filter on/off
      toggleFilter: (filter) => {
        const state = get()
        const field = filter.field || filter.id.split(':')[0]
        if (state.isFilterActive(filter.id)) state.removeFieldFilter(field)
        else state.setFieldFilter(
          field,
          (filter.operator || filterProcessor.getFilterField(field)?.defaultOperator || '*') as ComparisonOperator,
          filter.value,
        )
      },

      setFieldFilter: (fieldId, operator, value) => {
        const state = get()
        const newFilter = filterProcessor.createFilter(fieldId, operator, value)
        if (!newFilter) return false

        const canonicalField = parseFilterId(newFilter.id).field
        const searchTerm = filterProcessor.serializeFilter(newFilter)
        if (!searchTerm) return false

        const filters = state.filters.filter(filter => parseFilterId(String(filter.id)).field !== canonicalField)
        const searchWithoutField = removeFieldTokens(state.searchValue, canonicalField, filterProcessor)
        const filterId = newFilter.id

        set({
          filters: [...filters, newFilter],
          appliedFilters: new Set([
            ...Array.from(state.appliedFilters).filter(id => parseFilterId(id).field !== canonicalField),
            filterId,
          ]),
          filterSearchTerms: new Map([
            ...Array.from(state.filterSearchTerms.entries()).filter(([id]) => parseFilterId(id).field !== canonicalField),
            [filterId, searchTerm],
          ]),
          searchValue: searchWithoutField ? `${searchWithoutField} ${searchTerm}` : searchTerm,
        })
        return true
      },

      removeFieldFilter: (fieldId) => {
        const state = get()
        const field = filterProcessor.getFilterField(fieldId)?.id || fieldId
        set({
          filters: state.filters.filter(filter => parseFilterId(String(filter.id)).field !== field),
          appliedFilters: new Set(
            Array.from(state.appliedFilters).filter(id => parseFilterId(id).field !== field),
          ),
          filterSearchTerms: new Map(
            Array.from(state.filterSearchTerms.entries()).filter(([id]) => parseFilterId(id).field !== field),
          ),
          searchValue: removeFieldTokens(state.searchValue, field, filterProcessor),
        })
      },
      
      // Check if a filter is active
      isFilterActive: (filterId) => {
        const { appliedFilters, filters } = get()
        
        // Check if directly applied
        if (appliedFilters.has(filterId)) return true
        
        // Check if filter ID matches a filter in the list
        const hasOperator = filterId.includes(':')
        const { field, operator } = parseFilterId(filterId)
        
        return filters.some(f => {
          const parsed = parseFilterId(String(f.id))
          if (hasOperator) {
            return parsed.field === field && parsed.operator === operator
          } else {
            return parsed.field === field
          }
        })
      },
      
      // Sync filters from search value
      syncFiltersFromSearchValue: () => {
        const { searchValue } = get()
        
        // Extract filters
        const filters = filterProcessor.extractFilters(searchValue)
        
        // Update filter state
        set({ filters })
        
        // Track active filters and search terms
        const appliedFilters = new Set<string>()
        const filterSearchTerms = new Map<string, string>()
        const availableFilters = get().availableFilters
        
        // Extract filter tokens from search
        const tokens = searchValue.split(/\s+/).filter(Boolean)
        const filterTokens = tokens.filter(t => 
          t.match(/^[\w.]+:/) && !t.match(/^[\w.]+:$/)
        )
        
        // Find matching filters from available options
        filterTokens.forEach(token => {
          // Parse token to field and operator
          const match = token.match(/^([\w.]+):(.*)$/)
          if (!match) return // Skip invalid tokens
          
          const [_, tokenField, rest] = match
          
          // Get canonical field ID from any alias
          const fieldDef = filterProcessor.getFilterField(tokenField)
          if (!fieldDef) return // Skip unknown fields
          
          // Lookup available filter that matches this field
          const matchingFilter = availableFilters.find(af => {
          const { field } = parseFilterId(af.id)
            return field === fieldDef.id
          })
          
          if (matchingFilter) {
            appliedFilters.add(matchingFilter.id)
            filterSearchTerms.set(matchingFilter.id, token)
          }
        })
        
        set({ 
          appliedFilters,
          filterSearchTerms
        })
      }
    }
    
    // Add features
    Object.entries(features).forEach(([key, feature]) => {
      // Add feature state
      if (feature.state) {
        Object.assign(state, feature.state)
      }
      
      // Add feature actions
      if (feature.actions) {
        Object.entries(feature.actions).forEach(([name, createAction]) => {
          state[name] = createAction(set, get)
        })
      }
    })
    
    return state
      },
      {
        name,
        // searchValue is the durable representation. Re-parsing it avoids
        // corrupted Date/RegExp values after JSON persistence.
        partialize: (state) => ({ searchValue: state.searchValue }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.appliedFilters = new Set()
            state.filterSearchTerms = new Map()
            state.syncFiltersFromSearchValue()
          }
        },
      }
    )
  )
}

// Simple wrapper around createFilterStore
export function createEntityFilterStore(
  entityName: string,
  filterFields: FilterField[],
  searchFields: FilterField[],
  options: {
    features?: Record<string, Feature>
  } = {}
) {
  return createFilterStore(
    entityName, 
    filterFields, 
    searchFields, 
    options
  )
}
