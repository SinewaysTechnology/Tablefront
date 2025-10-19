import type { FilterField, FilterDataType } from './filters'

const formatFieldName = (field: string): string => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim()
}

// Infer data type from sample values
const inferDataType = (values: any[]): FilterDataType => {
  const nonNullValues = values.filter(v => v != null && v !== '')
  
  if (nonNullValues.length === 0) return 'string'
  
  // Check if all values are numbers
  const allNumbers = nonNullValues.every(v => 
    typeof v === 'number' || (!isNaN(Number(v)) && !isNaN(parseFloat(String(v))))
  )
  if (allNumbers) return 'number'
  
  // Check if all values are dates
  const allDates = nonNullValues.every(v => {
    if (v instanceof Date) return true
    if (typeof v === 'string') {
      const dateValue = new Date(v)
      return !isNaN(dateValue.getTime()) && v.match(/^\d{4}-\d{2}-\d{2}/)
    }
    return false
  })
  if (allDates) return 'date'
  
  return 'string'
}

const extractPreferredValues = (values: any[], maxValues = 20): string[] | undefined => {
  const nonNullValues = values.filter(v => v != null && v !== '')
  const uniqueValues = Array.from(new Set(nonNullValues.map(v => String(v))))
  
  if (uniqueValues.length <= maxValues && uniqueValues.length <= nonNullValues.length * 0.8) {
    return uniqueValues.sort()
  }
  
  return undefined
}

export interface FieldOverrides<TData = any> {
  [fieldId: string]: {
    filterable?: boolean
    searchable?: boolean
    label?: string
    displayName?: string
    type?: FilterDataType
    description?: string
    path?: string | ((item: TData) => any)
    aliases?: string[]
    preferredValues?: string[]
    defaultNumericValue?: number
    defaultOperator?: '>' | '<' | '>=' | '<=' | '=' | '!=' | '*' | '!*'
    isPercentage?: boolean
    suggestedValue?: string
    filterOnly?: boolean
    searchOnly?: boolean
  }
}

export function autoGenerateFields<TData>(
  data: TData[],
  options?: {
    idField?: keyof TData
    sampleSize?: number
    maxPreferredValues?: number
    excludeFields?: (keyof TData)[]
  }
): { filters: FilterField[], searches: FilterField[] } {
  if (!data.length) return { filters: [], searches: [] }
  
  const {
    idField = 'id' as keyof TData,
    sampleSize = 100,
    maxPreferredValues = 20,
    excludeFields = []
  } = options || {}
  
  const sampleData = data.slice(0, sampleSize)
  
  const fields = new Set<keyof TData>()
  sampleData.forEach(row => {
    Object.keys(row as object).forEach(key => {
      if (!excludeFields.includes(key as keyof TData)) {
        fields.add(key as keyof TData)
      }
    })
  })
  
  const filters: FilterField[] = []
  const searches: FilterField[] = []
  
  Array.from(fields).forEach(field => {
    const fieldStr = String(field)
    const isIdField = field === idField
    
    const sampleValues = sampleData.map(row => (row as unknown as Record<string, unknown>)[fieldStr])
    
    const dataType = inferDataType(sampleValues)
    
    const baseField: FilterField = {
      id: fieldStr,
      label: formatFieldName(fieldStr),
      type: dataType,
      description: `Filter by ${formatFieldName(fieldStr).toLowerCase()}`
    }
    
    if (dataType === 'string') {
      const preferredValues = extractPreferredValues(sampleValues, maxPreferredValues)
      if (preferredValues) {
        baseField.preferredValues = preferredValues
      }
    } else if (dataType === 'number') {
      baseField.defaultOperator = '>'
      baseField.defaultNumericValue = 0
    }
    
    if (!isIdField) {
      filters.push(baseField)
      
      if (dataType === 'string' || 
          fieldStr.toLowerCase().includes('name') ||
          fieldStr.toLowerCase().includes('title') ||
          fieldStr.toLowerCase().includes('email') ||
          fieldStr.toLowerCase().includes('description')) {
        searches.push({
          ...baseField,
          description: `Search by ${formatFieldName(fieldStr).toLowerCase()}`
        })
      }
    }
  })
  
  return { filters, searches }
}

export function applyFieldOverrides<TData>(
  generatedFields: { filters: FilterField[], searches: FilterField[] },
  fieldOverrides: FieldOverrides<TData> = {}
): { filters: FilterField[], searches: FilterField[] } {
  const { filters: baseFilters, searches: baseSearches } = generatedFields
  
  const filters = baseFilters
    .map(field => {
      const override = fieldOverrides[field.id]
      if (!override) return field
      
      if (override.filterable === false || override.searchOnly === true) {
        return null
      }
      
      const updatedField: FilterField = {
        ...field,
        ...(override.label && { label: override.label }),
        ...(override.displayName && { displayName: override.displayName }),
        ...(override.type && { type: override.type }),
        ...(override.description && { description: override.description }),
        ...(override.path && { path: override.path }),
        ...(override.aliases && { aliases: override.aliases }),
        ...(override.preferredValues && { preferredValues: override.preferredValues }),
        ...(override.defaultNumericValue !== undefined && { defaultNumericValue: override.defaultNumericValue }),
        ...(override.defaultOperator && { defaultOperator: override.defaultOperator }),
        ...(override.isPercentage !== undefined && { isPercentage: override.isPercentage }),
        ...(override.suggestedValue && { suggestedValue: override.suggestedValue })
      }
      
      return updatedField
    })
    .filter((field): field is FilterField => field !== null)
  
  const searches = baseSearches
    .map(field => {
      const override = fieldOverrides[field.id]
      if (!override) return field
      
      if (override.searchable === false || override.filterOnly === true) {
        return null
      }
      
      const updatedField: FilterField = {
        ...field,
        ...(override.label && { label: override.label }),
        ...(override.displayName && { displayName: override.displayName }),
        ...(override.type && { type: override.type }),
        ...(override.description && { description: override.description }),
        ...(override.path && { path: override.path }),
        ...(override.aliases && { aliases: override.aliases }),
        ...(override.preferredValues && { preferredValues: override.preferredValues }),
        ...(override.defaultNumericValue !== undefined && { defaultNumericValue: override.defaultNumericValue }),
        ...(override.defaultOperator && { defaultOperator: override.defaultOperator }),
        ...(override.isPercentage !== undefined && { isPercentage: override.isPercentage }),
        ...(override.suggestedValue && { suggestedValue: override.suggestedValue })
      }
      
      return updatedField
    })
    .filter((field): field is FilterField => field !== null)
  
  Object.entries(fieldOverrides).forEach(([fieldId, override]) => {
    const existsInFilters = filters.some(f => f.id === fieldId)
    const existsInSearches = searches.some(s => s.id === fieldId)
    
    if ((override.filterable === true || override.filterOnly === true) && !existsInFilters) {
      const newField: FilterField = {
        id: fieldId,
        label: override.label || formatFieldName(fieldId),
        type: override.type || 'string',
        description: override.description || `Filter by ${(override.label || formatFieldName(fieldId)).toLowerCase()}`,
        ...(override.displayName && { displayName: override.displayName }),
        ...(override.path && { path: override.path }),
        ...(override.aliases && { aliases: override.aliases }),
        ...(override.preferredValues && { preferredValues: override.preferredValues }),
        ...(override.defaultNumericValue !== undefined && { defaultNumericValue: override.defaultNumericValue }),
        ...(override.defaultOperator && { defaultOperator: override.defaultOperator }),
        ...(override.isPercentage !== undefined && { isPercentage: override.isPercentage }),
        ...(override.suggestedValue && { suggestedValue: override.suggestedValue })
      }
      filters.push(newField)
    }
    
    if ((override.searchable === true || override.searchOnly === true) && !existsInSearches) {
      const newField: FilterField = {
        id: fieldId,
        label: override.label || formatFieldName(fieldId),
        type: override.type || 'string',
        description: override.description || `Search by ${(override.label || formatFieldName(fieldId)).toLowerCase()}`,
        ...(override.displayName && { displayName: override.displayName }),
        ...(override.path && { path: override.path }),
        ...(override.aliases && { aliases: override.aliases }),
        ...(override.preferredValues && { preferredValues: override.preferredValues }),
        ...(override.defaultNumericValue !== undefined && { defaultNumericValue: override.defaultNumericValue }),
        ...(override.defaultOperator && { defaultOperator: override.defaultOperator }),
        ...(override.isPercentage !== undefined && { isPercentage: override.isPercentage }),
        ...(override.suggestedValue && { suggestedValue: override.suggestedValue })
      }
      searches.push(newField)
    }
  })
  
  return { filters, searches }
}

export function buildFields<TData>(
  data: TData[],
  fieldOverrides: FieldOverrides<TData> = {},
  options?: {
    idField?: keyof TData
    sampleSize?: number
    maxPreferredValues?: number
    excludeFields?: (keyof TData)[]
  }
): { filters: FilterField[], searches: FilterField[] } {
  const generatedFields = autoGenerateFields(data, options)
  
  return applyFieldOverrides(generatedFields, fieldOverrides)
} 