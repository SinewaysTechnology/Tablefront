/**
 * Internal filter store creation utilities
 * 
 * These functions are used internally by createDataTable to manage filter and search state.
 * They are not part of the public API.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FilterField, FilterOption, FilterProcessor } from '../filters'
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
  isFilterActive: (filterId: string) => boolean
  clearFilters: () => void
  syncFiltersFromSearchValue: () => void
  
  // Feature extensions
  [key: string]: any
}

// Helper to extract field and operator from a filter ID
const parseFilterId = (id: string) => {
  const parts = id.split(':')
  return { 
    field: parts[0], 
    operator: parts.length > 1 ? parts[1] : undefined 
  }
}

// Get the preferred display identifier for a field
const getPreferredFieldIdentifier = (field: string, filterProcessor: FilterProcessor): string => {
  const fieldDef = filterProcessor.getFilterField(field)
  if (!fieldDef) return field
  
  // Always prefer the first alias if available
  if (fieldDef.aliases?.length) return fieldDef.aliases[0]
  
  // Use displayName if available
  if (fieldDef.displayName) return fieldDef.displayName
  
  // Fall back to the field ID
  return field
}

// Helper function to format dates without external dependencies
const formatDateValue = (date: Date): string => {
  // Use client-side only date comparison to prevent hydration mismatches
  if (typeof window === 'undefined') {
    // On server, always format as YYYY-M-D to avoid dynamic comparisons
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month}-${day}`
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const inputDate = new Date(date)
  inputDate.setHours(0, 0, 0, 0)
  
  if (inputDate.getTime() === today.getTime()) {
    return 'today'
  } else if (inputDate.getTime() === yesterday.getTime()) {
    return 'yesterday'
  } else if (inputDate.getTime() === tomorrow.getTime()) {
    return 'tomorrow'
  } else {
    // Format as YYYY-M-D (without leading zeros for month/day)
    const year = inputDate.getFullYear()
    const month = inputDate.getMonth() + 1
    const day = inputDate.getDate()
    return `${year}-${month}-${day}`
  }
}

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
  
  // Create alias map for faster lookups
  const fieldAliasMap = new Map<string, string>()
  
  // Build alias map
  ;[...filterFields, ...searchFields].forEach(field => {
    if (field.aliases?.length) {
      // Set the preferred display name (first alias) for this field
      fieldAliasMap.set(field.id, field.aliases[0])
      
      // Map all aliases back to the field ID
      field.aliases.forEach(alias => {
        fieldAliasMap.set(alias, field.id)
      })
    } else if (field.displayName) {
      fieldAliasMap.set(field.id, field.displayName)
    }
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
      
      // Clear all filters
      clearFilters: () => set({ 
        filters: [],
        appliedFilters: new Set(),
        searchValue: '',
        filterSearchTerms: new Map()
      }),
      
      // Toggle a filter on/off
      toggleFilter: (filter) => {
        const state = get()
        const filterId = filter.id
        const isActive = state.isFilterActive(filterId)
        
        if (isActive) {
          // Remove filter
          const { field } = parseFilterId(filterId)
          const newFilters = state.filters.filter(f => {
            const id = f.id as string
            return !id.startsWith(field + ':') && id !== field
          })
          
          // Update appliedFilters
          const newApplied = new Set(state.appliedFilters)
          newApplied.delete(filterId)
          
          // Get the search term to remove
          const searchTerm = state.filterSearchTerms.get(filterId) || ''
          
          // Update search value and filter search terms
          const newSearchValue = state.searchValue
            .replace(searchTerm, '')
            .replace(/\s+/g, ' ')
            .trim()
            
          const newSearchTerms = new Map(state.filterSearchTerms)
          newSearchTerms.delete(filterId)
          
          set({ 
            filters: newFilters,
            appliedFilters: newApplied,
            searchValue: newSearchValue,
            filterSearchTerms: newSearchTerms
          })
        } else {
          // Add filter
          const { field, operator } = parseFilterId(filterId)
          
          // Create filter object - important to use original field ID for internal filter
          const newFilter = {
            id: operator ? `${field}:${operator}` : field,
            value: filter.value
          }
          
          // Format for search using the preferred field identifier (alias)
          // Always use the alias from our map if available, fall back to getPreferredFieldIdentifier
          const displayField = fieldAliasMap.get(field) || getPreferredFieldIdentifier(field, filterProcessor)
          
          // Format the value based on field type for search term display
          let displayValue: string;
          const fieldDef = filterProcessor.getFilterField(field);
          
          if (fieldDef?.type === 'date' && filter.value instanceof Date) {
            // Format date value for display in search bar using our helper
            displayValue = formatDateValue(filter.value)
          } else {
            displayValue = String(filter.value);
          }
          
          // Create the search term with the display field
          let searchTerm
          if (operator) {
            searchTerm = `${displayField}:${operator}${displayValue}`
          } else {
            searchTerm = `${displayField}:${displayValue}`
          }
          
          // Update appliedFilters
          const newApplied = new Set(state.appliedFilters)
          newApplied.add(filterId)
          
          // Update search terms map
          const newSearchTerms = new Map(state.filterSearchTerms)
          newSearchTerms.set(filterId, searchTerm)
          
          // Update search value
          const newSearchValue = state.searchValue
            ? `${state.searchValue} ${searchTerm}`
            : searchTerm
          
          set({ 
            filters: [...state.filters, newFilter],
            appliedFilters: newApplied,
            searchValue: newSearchValue,
            filterSearchTerms: newSearchTerms
          })
        }
      },
      
      // Check if a filter is active
      isFilterActive: (filterId) => {
        const { appliedFilters, filters } = get()
        
        // Check if directly applied
        if (appliedFilters.has(filterId)) return true
        
        // Check if filter ID matches a filter in the list
        const { field, operator } = parseFilterId(filterId)
        
        return filters.some(f => {
          const id = f.id as string
          if (operator) {
            return id === `${field}:${operator}`
          } else {
            return id === field || id.startsWith(`${field}:`)
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
        partialize: (state) => ({ 
          filters: state.filters,
          searchValue: state.searchValue,
          appliedFilters: Array.from(state.appliedFilters),
          filterSearchTerms: Array.from(state.filterSearchTerms.entries())
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert arrays back to Sets and Maps
            state.appliedFilters = new Set(state.appliedFilters || [])
            state.filterSearchTerms = new Map(state.filterSearchTerms || [])
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