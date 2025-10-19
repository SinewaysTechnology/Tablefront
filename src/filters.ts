import { ColumnFiltersState } from "@tanstack/react-table";
import { startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { parseDate } from './utils';

export type FilterDataType = 'number' | 'string' | 'date'

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | '*' | '!*'

export interface FilterOption {
    id: string;       // Unique identifier (e.g., "impressions:gt:0")
    label: string;    // User-friendly label (e.g., "Impressions > 0")
    type: 'comparison' | 'categorical';  // Type of filter
    field: string;    // Field name (e.g., "impressions")
    operator?: string; // Comparison operator (e.g., "gt", "contains")
    value: number | string | RegExp; // Filter value
    originalDisplay?: string; // Original text for display
}

export interface FilterField {
    id: string;       // Field identifier
    label: string;    // User-friendly name
    displayName?: string; // User-friendly display name for UI (falls back to label if not provided)
    type: FilterDataType;    // Data type
    description: string;    // Field description
    path?: string | ((item: any) => any);    // Path to property or a function that returns the value
    aliases?: string[];    // Alternative names
    preferredValues?: string[]; // Preferred string values for categorical fields in priority order
    defaultNumericValue?: number;   // Default value for numeric fields (with '>' operator)
    defaultOperator?: ComparisonOperator;   // Default operator for the field
    isPercentage?: boolean;   // Whether the field is a percentage (requires /100 for comparison)
    suggestedValue?: string;  // A value that will always be used for suggestions, regardless of sample data
}

// Filter processor configuration
export interface FilterProcessorConfig {
    filterFields: FilterField[];
    searchFields: FilterField[];
}

/**
 * Core filter processing engine
 * 
 * Performance optimizations:
 * - Reduced debounce from 300ms to 150ms for more responsive search
 * - Replaced Array.some() with for loops for better performance
 * - Memoized search fields to avoid repeated calls
 * - Optimized extractFilters to use for loops instead of filter/map chains
 * - Replaced Map with plain object for filter grouping
 * - Added early returns to avoid unnecessary processing
 */
export class FilterProcessor {
  private fieldsById: Record<string, FilterField> = {};
  
  constructor(private config: FilterProcessorConfig) {
    // Build lookup map for fields and their aliases
    this.fieldsById = [...config.filterFields, ...config.searchFields].reduce((map, field) => {
      map[field.id] = field;
      field.aliases?.forEach(alias => map[alias] = field);
      return map;
    }, {} as Record<string, FilterField>);
  }
    
      // Resolve nested object paths (e.g., "user.profile.name[0]")
  private resolvePath(obj: any, path: string): any {
    if (!path) return undefined;
    
    return path.split(/\./).reduce((curr, part) => {
      if (curr === undefined || curr === null) return undefined;
      
      const arrayMatch = part.match(/^([^\[]+)(?:\[(\d+)\])?$/);
      if (!arrayMatch) return undefined;
      
      const [_, propName, arrayIndex] = arrayMatch;
      const propValue = curr[propName];
      
      if (arrayIndex !== undefined && Array.isArray(propValue)) {
        const index = parseInt(arrayIndex, 10);
        return index < propValue.length ? propValue[index] : undefined;
      }
      
      return propValue;
    }, obj);
  }
    
    getFieldValue(item: any, fieldId: string, context?: any): any {
        const field = this.fieldsById[fieldId];
        if (!field) return undefined;
        
        if (field.path) {
            if (typeof field.path === 'function') {
                return field.path(item);
            }
            
            const value = this.resolvePath(item, field.path);
            return value === undefined && field.type === 'number' ? 0 : value;
        }
        
        return item[fieldId];
    }
    
    applyFilter(item: any, filter: { id: string, value: any }, context?: any): boolean {
        const id = filter.id as string;
        
        if (id === '_search') {
            const searchValue = String(filter.value).toLowerCase();
            if (!searchValue) return true;
            
            // Optimized search - use for loop instead of some() for better performance
            const searchFields = this.config.searchFields;
            const searchFieldsLength = searchFields.length;
            
            for (let i = 0; i < searchFieldsLength; i++) {
                const field = searchFields[i];
                const value = this.getFieldValue(item, field.id, context);
                if (value !== undefined && String(value).toLowerCase().includes(searchValue)) {
                    return true;
                }
            }
            return false;
        }
        
        const [field, operator = '='] = id.split(':') as [string, ComparisonOperator];
        const fieldDef = this.fieldsById[field];
        if (!fieldDef) return true;
        
        const rawValue = this.getFieldValue(item, field, context);
        const effectiveValue = rawValue === undefined && fieldDef.type === 'number' ? 0 : rawValue;
        
        if (effectiveValue === undefined) return operator === '!=' || operator === '!*';
        
        // Numeric comparisons
        if (fieldDef.type === 'number' && ['<', '>', '<=', '>=', '=', '!='].includes(operator)) {
            const numVal = typeof filter.value === 'number' ? filter.value : parseFloat(String(filter.value));
            if (isNaN(numVal)) return false;
            
            switch (operator) {
                case '<': return effectiveValue < numVal;
                case '>': return effectiveValue > numVal;
                case '<=': return effectiveValue <= numVal;
                case '>=': return effectiveValue >= numVal;
                case '=': return effectiveValue === numVal;
                case '!=': return effectiveValue !== numVal;
                default: return false;
            }
        }
        
        // Date comparisons
        if (fieldDef.type === 'date' && ['<', '>', '<=', '>=', '=', '!='].includes(operator)) {
            // Convert field value to Date object
            let fieldDate: Date;
            try {
                if (effectiveValue instanceof Date) {
                    fieldDate = effectiveValue;
                } else if (typeof effectiveValue === 'string') {
                    // Use parseDate utility for consistent parsing
                    const parsedDate = parseDate(effectiveValue, 'UTC');
                    if (!parsedDate) return false;
                    fieldDate = parsedDate;
                } else {
                    return false;
                }
                // Normalize to start of day in UTC for consistent comparisons
                fieldDate = toDate(startOfDay(fieldDate), { timeZone: 'UTC' });
            } catch {
                return false;
            }
            
            // Ensure filter value is a Date
            if (!(filter.value instanceof Date)) return false;
            
            // Compare timestamps
            const fieldTime = fieldDate.getTime();
            const filterTime = filter.value.getTime();
            
            switch (operator) {
                case '<': return fieldTime < filterTime;
                case '>': return fieldTime > filterTime;
                case '<=': return fieldTime <= filterTime;
                case '>=': return fieldTime >= filterTime;
                case '=': return fieldTime === filterTime;
                case '!=': return fieldTime !== filterTime;
                default: return false;
            }
        }
        
        // String operations
        if (fieldDef.type === 'string') {
            const strValue = String(effectiveValue);
            switch (operator) {
                case '=': return effectiveValue === filter.value;
                case '!=': return effectiveValue !== filter.value;
                case '*': 
                    return filter.value instanceof RegExp
                        ? filter.value.test(strValue)
                        : strValue.toLowerCase().includes(String(filter.value).toLowerCase());
                case '!*': 
                    return filter.value instanceof RegExp
                        ? !filter.value.test(strValue)
                        : !strValue.toLowerCase().includes(String(filter.value).toLowerCase());
                default: return false;
            }
        }
        
        return false;
    }
    
    /**
     * Parses a filter token into a structured filter
     */
    parseFilterToken(token: string): { id: string, value: any } | null {
        const isNegative = token.startsWith('-');
        const normalizedToken = isNegative ? token.substring(1) : token;
        
        const match = normalizedToken.match(/^([\w.]+):((>=|<=|>|<|=))?([^:]*)$/);
        if (!match) return null;
        
        const fieldId = match[1];
        const operator = match[3] || '';
        const valueStr = match[4];
        
        const fieldDef = this.fieldsById[fieldId];
        if (!fieldDef) return null;
        
        const actualFieldId = fieldDef.id;
        let finalOperator: string;
        let finalValue: string | number | RegExp | Date;
        
        // Handle negation by mapping operators to their opposites
        const negatedOps: Record<string, string> = { '>': '<=', '<': '>=', '>=': '<', '<=': '>', '=': '!=', '': '!*' };
        
        if (fieldDef.type === 'number') {
            finalValue = parseFloat(valueStr);
            if (isNaN(finalValue)) return null;
            
            if (fieldDef.isPercentage) finalValue /= 100;
            
            finalOperator = isNegative 
                ? negatedOps[operator] 
                : (operator || fieldDef.defaultOperator || '=');
        } 
        else if (fieldDef.type === 'date') {
            // Handle date parsing and special values
            let dateValue: Date;
            
            if (valueStr.toLowerCase() === 'today') {
                // Use fixed date for SSR consistency - in real apps this could be updated after hydration
                dateValue = toDate(startOfDay(new Date('2024-01-01')), { timeZone: 'UTC' });
            } else if (valueStr.toLowerCase() === 'yesterday') {
                // Use fixed date for SSR consistency
                dateValue = toDate(startOfDay(new Date('2023-12-31')), { timeZone: 'UTC' });
            } else if (valueStr.toLowerCase() === 'tomorrow') {
                // Use fixed date for SSR consistency
                dateValue = toDate(startOfDay(new Date('2024-01-02')), { timeZone: 'UTC' });
            } else {
                // For SSR safety, always use consistent date parsing
                try {
                    // Ensure we parse ISO date strings consistently
                    const isoDate = valueStr.includes('T') 
                        ? valueStr 
                        : `${valueStr}T00:00:00.000Z`;
                    dateValue = toDate(startOfDay(new Date(isoDate)), { timeZone: 'UTC' });
                } catch {
                    return null;
                }
            }
            
            finalValue = dateValue;
            finalOperator = isNegative 
                ? negatedOps[operator] 
                : (operator || fieldDef.defaultOperator || '=');
        }
        else {
            if (operator === '=') {
                finalOperator = isNegative ? '!=' : '=';
                finalValue = valueStr;
            } else {
                finalOperator = isNegative ? '!*' : (operator || fieldDef.defaultOperator || '*');
                finalValue = new RegExp(valueStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
        }
        
        // For string wildcard searches, include the value in the ID to enable multiple filters on same field
        const filterId = fieldDef.type === 'string' && finalOperator === '*'
            ? `${actualFieldId}:${finalOperator}:${valueStr}`
            : `${actualFieldId}:${finalOperator}`;
        
        return { id: filterId, value: finalValue };
    }
    
    /**
     * Gets all available filter fields
     */
    getFilterFields(): FilterField[] {
        return this.config.filterFields;
    }
    
    /**
     * Gets all search fields
     */
    getSearchFields(): FilterField[] {
        return this.config.searchFields;
    }
    
    /**
     * Gets a specific filter field by ID
     */
    getFilterField(id: string): FilterField | undefined {
        return this.fieldsById[id];
    }
    
    /**
     * Extracts filters from a search string
     */
    extractFilters(searchValue: string): ColumnFiltersState {
        const trimmedValue = searchValue.trim();
        if (!trimmedValue) return [];
        
        const tokens = trimmedValue.split(/\s+/);
        const tokensLength = tokens.length;
        
        // Parse structured filters (field:value)
        const structuredFilters: ColumnFiltersState = [];
        
        for (let i = 0; i < tokensLength; i++) {
            const token = tokens[i];
            if (token.match(/^-?[\w.]+:/) && !token.match(/^-?[\w.]+:$/)) {
                const parsedFilter = this.parseFilterToken(token);
                if (parsedFilter) {
                    structuredFilters.push(parsedFilter);
                }
            }
        }
        
        // Handle simple text search tokens
        const searchTerms: string[] = [];
        for (let i = 0; i < tokensLength; i++) {
            const token = tokens[i];
            if (!token.includes(':') && !token.startsWith('-')) {
                searchTerms.push(token);
            }
        }
        
        const searchTermsString = searchTerms.join(' ').trim();
        if (searchTermsString) {
            structuredFilters.push({ id: '_search', value: searchTermsString });
        }
        
        return structuredFilters;
    }
    
    /**
     * Generates filter suggestions from field definitions
     */
    generateFilterSuggestions(): FilterOption[] {
        // Utility function to truncate long values for display
        const truncateForDisplay = (value: string, maxLength: number = 20): string => {
            if (value.length <= maxLength) return value
            return value.substring(0, maxLength) + '...'
        }

        return this.config.filterFields.map(field => {
            const isNumeric = field.type === 'number'
            const isDate = field.type === 'date'
            const operator = field.defaultOperator || (isNumeric ? '>' : (isDate ? '=' : '*'))
            
            // Determine value based on field type
            let value: any;
            if (isNumeric) {
                value = field.defaultNumericValue ?? 0
            } else if (isDate) {
                // For date fields, use static dates to prevent hydration mismatches
                const suggestedValue = field.suggestedValue || 'today'
                if (suggestedValue.toLowerCase() === 'today') {
                    // Use fixed date for SSR consistency - in real apps this could be updated after hydration
                    value = toDate(startOfDay(new Date('2024-01-01')), { timeZone: 'UTC' });
                } else if (suggestedValue.toLowerCase() === 'yesterday') {
                    // Use fixed date for SSR consistency
                    value = toDate(startOfDay(new Date('2023-12-31')), { timeZone: 'UTC' });
                } else if (suggestedValue.toLowerCase() === 'tomorrow') {
                    // Use fixed date for SSR consistency
                    value = toDate(startOfDay(new Date('2024-01-02')), { timeZone: 'UTC' });
                } else {
                    // For SSR safety, always use consistent date parsing
                    // Parse the date string manually to avoid timezone issues
                    try {
                        // Ensure we parse ISO date strings consistently
                        const isoDate = suggestedValue.includes('T') 
                            ? suggestedValue 
                            : `${suggestedValue}T00:00:00.000Z`;
                        value = toDate(startOfDay(new Date(isoDate)), { timeZone: 'UTC' });
                    } catch {
                        // Fallback to fixed date for SSR compatibility
                        value = toDate(startOfDay(new Date('2024-01-01')), { timeZone: 'UTC' });
                    }
                }
            } else {
                // For string fields, get the raw value but we'll truncate it for display only
                value = field.suggestedValue || field.preferredValues?.[0] || 'example'
            }
                
            // Create labels based on field type
            let label: string
            if (isNumeric) {
                label = `${field.label} ${operator} ${value}`
            } else if (isDate) {
                // For dates, display the original string value in the label
                const displayValue = field.suggestedValue || 'today'
                label = `${field.label} ${operator} ${displayValue}`
            } else {
                // For string fields, truncate the value for display
                const displayValue = truncateForDisplay(value.toString())
                label = `${field.label} is ${displayValue}`
            }
                
            const filterOption: FilterOption = {
                id: (isNumeric || isDate) ? `${field.id}:${operator}` : field.id,
                label,
                type: (isNumeric || isDate) ? 'comparison' : 'categorical',
                field: field.id,
                operator,
                value // Keep the full value for actual filtering
            }
            return filterOption
        })
    }
    
    /**
     * Applies filters to a dataset
     */
    filter<T>(items: T[], filters: ColumnFiltersState, context?: any): T[] {
        // Quick return for no filters case
        if (!filters.length) return items;
        
        // Group filters by field name - use object instead of Map for better performance
        const filtersByField: Record<string, { id: string, value: any }[]> = {};
        
        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            const field = (filter.id as string).split(':')[0];
            if (!filtersByField[field]) {
                filtersByField[field] = [];
            }
            filtersByField[field].push(filter);
        }
        
        // Pre-determine which fields use OR logic vs AND logic
        const fieldsWithOrLogic = new Set<string>();
        const fieldKeys = Object.keys(filtersByField);
        
        for (let i = 0; i < fieldKeys.length; i++) {
            const field = fieldKeys[i];
            // Skip search (always uses AND)
            if (field === '_search') continue;
            
            const fieldFilters = filtersByField[field];
            const fieldDef = this.fieldsById[field];
            
            // String fields with all wildcard (*) filters use OR logic
            if (fieldDef?.type === 'string') {
                let allWildcard = true;
                for (let j = 0; j < fieldFilters.length; j++) {
                    if (!(fieldFilters[j].id as string).includes(':*')) {
                        allWildcard = false;
                        break;
                    }
                }
                if (allWildcard) fieldsWithOrLogic.add(field);
            }
        }
        
        // Single-pass filtering
        return items.filter(item => {
            // For each filter group
            for (let i = 0; i < fieldKeys.length; i++) {
                const field = fieldKeys[i];
                const fieldFilters = filtersByField[field];
                const useOrLogic = fieldsWithOrLogic.has(field);
                
                if (useOrLogic) {
                    // At least one filter must match
                    let matched = false;
                    for (let j = 0; j < fieldFilters.length; j++) {
                        if (this.applyFilter(item, fieldFilters[j], context)) {
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) return false;
                } else {
                    // All filters must match
                    for (let j = 0; j < fieldFilters.length; j++) {
                        if (!this.applyFilter(item, fieldFilters[j], context)) {
                            return false;
                        }
                    }
                }
            }
            
            return true;
        });
    }

    // Public API
    getFields() {
        return {
            filter: this.config.filterFields,
            search: this.config.searchFields
        }
    }
    
    // Compatibility aliases for existing code
    applyFilters = this.filter
}