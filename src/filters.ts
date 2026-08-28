import { ColumnFiltersState } from "@tanstack/react-table";
import { parseDate } from './utils';

export type FilterDataType = 'number' | 'string' | 'date'

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | '*' | '!*'

export const FILTER_OPERATORS: Record<FilterDataType, ComparisonOperator[]> = {
    string: ['*', '=', '!*', '!='],
    number: ['=', '!=', '>', '>=', '<', '<='],
    date: ['=', '!=', '>', '>=', '<', '<='],
}

export const FILTER_OPERATOR_LABELS: Record<ComparisonOperator, string> = {
    '*': 'contains',
    '!*': 'does not contain',
    '=': 'equals',
    '!=': 'does not equal',
    '>': 'is greater than',
    '>=': 'is at least',
    '<': 'is less than',
    '<=': 'is at most',
}

export const parseFilterId = (id: string): { field: string, operator: ComparisonOperator } => {
    const [field, rawOperator] = id.split(':')
    const operator = FILTER_OPERATOR_LABELS[rawOperator as ComparisonOperator]
        ? rawOperator as ComparisonOperator
        : '='
    return { field, operator }
}

export const tokenizeFilterInput = (input: string): string[] =>
    input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []

const quoteFilterValue = (value: string): string =>
    /\s/.test(value) ? JSON.stringify(value) : value

const quoteFieldIdentifier = (field: string): string =>
    /\s/.test(field) ? JSON.stringify(field) : field

const startOfUtcDay = (date: Date): Date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const parseFilterDate = (value: unknown): Date | null => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : startOfUtcDay(value)
    }

    if (typeof value === 'number') {
        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? null : startOfUtcDay(date)
    }

    const input = String(value ?? '').trim()
    if (!input) return null

    const relative = input.toLowerCase()
    if (relative === 'today' || relative === 'yesterday' || relative === 'tomorrow') {
        const date = startOfUtcDay(new Date())
        date.setUTCDate(date.getUTCDate() + (relative === 'yesterday' ? -1 : relative === 'tomorrow' ? 1 : 0))
        return date
    }

    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(input)
        ? new Date(`${input}T00:00:00.000Z`)
        : parseDate(input, 'UTC')
    return parsed && !Number.isNaN(parsed.getTime()) ? startOfUtcDay(parsed) : null
}

export interface FilterOption {
    id: string;       // Unique identifier (e.g., "impressions:gt:0")
    label: string;    // User-friendly label (e.g., "Impressions > 0")
    type: 'comparison' | 'categorical';  // Type of filter
    field: string;    // Field name (e.g., "impressions")
    operator?: string; // Comparison operator (e.g., "gt", "contains")
    value: number | string | RegExp | Date; // Filter value
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
      map[field.id.toLowerCase()] = field;
      field.aliases?.forEach(alias => {
        map[alias] = field
        map[alias.toLowerCase()] = field
      });
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
        const field = this.fieldsById[fieldId] || this.fieldsById[fieldId.toLowerCase()];
        if (!field) return undefined;
        
        if (field.path) {
            if (typeof field.path === 'function') {
                return field.path(item);
            }
            
            return this.resolvePath(item, field.path);
        }
        
        return item[fieldId];
    }
    
    applyFilter(item: any, filter: { id: string, value: any }, context?: any): boolean {
        const id = filter.id as string;
        
        if (id === '_search') {
            const searchTerms = (Array.isArray(filter.value) ? filter.value : String(filter.value).split(/\s+/))
                .map(value => String(value).trim().toLocaleLowerCase())
                .filter(Boolean)
            if (!searchTerms.length) return true;

            const searchFields = this.config.searchFields;
            for (let termIndex = 0; termIndex < searchTerms.length; termIndex++) {
                let termMatched = false
                for (let fieldIndex = 0; fieldIndex < searchFields.length; fieldIndex++) {
                    const value = this.getFieldValue(item, searchFields[fieldIndex].id, context);
                    if (value != null && String(value).toLocaleLowerCase().includes(searchTerms[termIndex])) {
                        termMatched = true
                        break
                    }
                }
                if (!termMatched) return false
            }
            return true;
        }
        
        const [field, operator = '='] = id.split(':') as [string, ComparisonOperator];
        const fieldDef = this.fieldsById[field] || this.fieldsById[field.toLowerCase()];
        if (!fieldDef) return true;
        
        const rawValue = this.getFieldValue(item, field, context);
        const effectiveValue = rawValue;
        
        if (effectiveValue === undefined || effectiveValue === null) return operator === '!=' || operator === '!*';
        
        // Numeric comparisons
        if (fieldDef.type === 'number' && ['<', '>', '<=', '>=', '=', '!='].includes(operator)) {
            const numVal = typeof filter.value === 'number' ? filter.value : parseFloat(String(filter.value));
            if (isNaN(numVal)) return false;
            
            const fieldNumber = typeof effectiveValue === 'number' ? effectiveValue : Number(effectiveValue)
            if (!Number.isFinite(fieldNumber)) return false
            switch (operator) {
                case '<': return fieldNumber < numVal;
                case '>': return fieldNumber > numVal;
                case '<=': return fieldNumber <= numVal;
                case '>=': return fieldNumber >= numVal;
                case '=': return fieldNumber === numVal;
                case '!=': return fieldNumber !== numVal;
                default: return false;
            }
        }
        
        // Date comparisons
        if (fieldDef.type === 'date' && ['<', '>', '<=', '>=', '=', '!='].includes(operator)) {
            const fieldDate = parseFilterDate(effectiveValue)
            const filterDate = parseFilterDate(filter.value)
            if (!fieldDate || !filterDate) return false
            
            // Compare timestamps
            const fieldTime = fieldDate.getTime();
            const filterTime = filterDate.getTime();
            
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
            const normalizedValue = strValue.toLocaleLowerCase()
            const normalizedFilter = String(filter.value).toLocaleLowerCase()
            switch (operator) {
                case '=': return normalizedValue === normalizedFilter;
                case '!=': return normalizedValue !== normalizedFilter;
                case '*': 
                    if (filter.value instanceof RegExp) {
                        filter.value.lastIndex = 0
                        return filter.value.test(strValue)
                    }
                    return normalizedValue.includes(normalizedFilter);
                case '!*': 
                    if (filter.value instanceof RegExp) {
                        filter.value.lastIndex = 0
                        return !filter.value.test(strValue)
                    }
                    return !normalizedValue.includes(normalizedFilter);
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
        
        const match = normalizedToken.match(/^("[^"]+"|'[^']+'|[\w.-]+):(!\*|!=|>=|<=|>|<|=|\*)?(.+)$/);
        if (!match) return null;
        
        const fieldId = match[1].replace(/^(["'])(.*)\1$/, '$2');
        const operator = match[2] || '';
        const valueStr = match[3].replace(/^(["'])(.*)\1$/, '$2');
        
        const fieldDef = this.fieldsById[fieldId] || this.fieldsById[fieldId.toLowerCase()];
        if (!fieldDef) return null;
        
        const actualFieldId = fieldDef.id;
        let finalOperator: string;
        let finalValue: string | number | RegExp | Date;
        
        // Handle negation by mapping operators to their opposites
        const negatedOps: Record<string, string> = {
            '>': '<=', '<': '>=', '>=': '<', '<=': '>',
            '=': '!=', '!=': '=', '*': '!*', '!*': '*', '': '!*',
        };
        
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
            const dateValue = parseFilterDate(valueStr)
            if (!dateValue) return null
            
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
        return this.fieldsById[id] || this.fieldsById[id.toLowerCase()];
    }

    /** Build a validated, canonical filter from UI or API input. */
    createFilter(fieldId: string, operator: ComparisonOperator, rawValue: unknown): { id: string, value: any } | null {
        const field = this.getFilterField(fieldId)
        if (!field || !FILTER_OPERATORS[field.type].includes(operator)) return null

        let value: string | number | Date
        if (field.type === 'number') {
            const numberValue = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim())
            if (!Number.isFinite(numberValue)) return null
            value = field.isPercentage ? numberValue / 100 : numberValue
        } else if (field.type === 'date') {
            const dateValue = parseFilterDate(rawValue)
            if (!dateValue) return null
            value = dateValue
        } else {
            value = String(rawValue ?? '').trim()
            if (!value) return null
        }

        return { id: `${field.id}:${operator}`, value }
    }

    /** Convert a canonical filter into the backwards-compatible search token. */
    serializeFilter(filter: { id: string, value: any }): string | null {
        const { field, operator } = parseFilterId(filter.id)
        const fieldDef = this.getFilterField(field)
        if (!fieldDef) return null

        let value: string
        if (fieldDef.type === 'date') {
            const date = parseFilterDate(filter.value)
            if (!date) return null
            value = date.toISOString().slice(0, 10)
        } else if (fieldDef.type === 'number' && fieldDef.isPercentage) {
            value = String(Number(filter.value) * 100)
        } else {
            value = String(filter.value)
        }

        const preferredAlias =
          fieldDef.aliases?.find((alias) => /^[a-zA-Z0-9._-]+$/.test(alias)) || fieldDef.id
        return `${quoteFieldIdentifier(preferredAlias)}:${operator}${quoteFilterValue(value)}`
    }
    
    /**
     * Extracts filters from a search string
     */
    extractFilters(searchValue: string): ColumnFiltersState {
        const trimmedValue = searchValue.trim();
        if (!trimmedValue) return [];
        
        const tokens = tokenizeFilterInput(trimmedValue);
        const tokensLength = tokens.length;
        
        const structuredFilters: ColumnFiltersState = [];
        const searchTerms: string[] = [];

        for (let i = 0; i < tokensLength; i++) {
            const token = tokens[i];
            const parsedFilter = this.parseFilterToken(token);
            if (parsedFilter) {
                structuredFilters.push(parsedFilter);
                continue;
            }

            // Unknown/incomplete structured syntax remains ordinary quick-search
            // text instead of silently disappearing from the query.
            if (!token.startsWith('-')) {
                searchTerms.push(token.replace(/^(["'])(.*)\1$/, '$2'));
            }
        }
        
        const searchTermsString = searchTerms.join(' ').trim();
        if (searchTermsString) {
            structuredFilters.push({ id: '_search', value: searchTerms });
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

        return this.config.filterFields.reduce<FilterOption[]>((suggestions, field) => {
            const isNumeric = field.type === 'number'
            const isDate = field.type === 'date'
            const operator = field.defaultOperator ||
                (isNumeric ? '>' : isDate ? '=' : field.preferredValues?.length ? '=' : '*')
            
            // A one-click filter is only useful when its value comes from the
            // actual data or explicit field configuration. Do not invent one.
            let value: number | string | RegExp | Date
            if (isNumeric) {
                if (field.defaultNumericValue === undefined) return suggestions
                value = field.defaultNumericValue
            } else if (isDate) {
                if (!field.suggestedValue) return suggestions
                const suggestedDate = parseFilterDate(field.suggestedValue)
                if (!suggestedDate) return suggestions
                value = suggestedDate
            } else {
                const suggestedValue = field.suggestedValue || field.preferredValues?.[0]
                if (!suggestedValue) return suggestions
                value = suggestedValue
            }
                
            // Create labels based on field type
            let label: string
            if (isNumeric) {
                label = `${field.label} ${operator} ${value}`
            } else if (isDate) {
                label = `${field.label} ${operator} ${field.suggestedValue}`
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
            suggestions.push(filterOption)
            return suggestions
        }, [])
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
            
            // Positive categorical/text filters on one field use OR logic,
            // matching the familiar set-filter model. Negative conditions stay AND.
            if (fieldDef?.type === 'string') {
                let allPositive = true;
                for (let j = 0; j < fieldFilters.length; j++) {
                    const { operator } = parseFilterId(fieldFilters[j].id as string)
                    if (operator !== '*' && operator !== '=') {
                        allPositive = false;
                        break;
                    }
                }
                if (allPositive) fieldsWithOrLogic.add(field);
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
