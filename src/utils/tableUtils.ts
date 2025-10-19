/**
 * Table-specific utility functions
 */

/**
 * Generates a stable store ID for the DataTable
 * @param storeId - Optional custom store ID
 * @param idField - The ID field name
 * @returns A stable store ID string
 */
export function generateStableStoreId(storeId?: string, idField?: string): string {
  if (storeId) {
    return `tablefront-${storeId}`
  }
  return `tablefront-${idField || 'default'}`
}

/**
 * Gets the first field from a data array
 * @param data - The data array
 * @returns The first field name or null if no data
 */
export function getFirstField<TData>(data: TData[]): keyof TData | null {
  if (!data.length) return null
  
  const firstRow = data[0] as unknown as Record<string, unknown>
  const fields = Object.keys(firstRow)
  
  return fields.length > 0 ? (fields[0] as keyof TData) : null
}

/**
 * Determines if a value is a valid ID field
 * @param value - The value to check
 * @returns True if the value is a valid ID
 */
export function isValidId(value: any): boolean {
  return value != null && value !== '' && value !== undefined
}

/**
 * Safely converts a value to string for ID comparison
 * @param value - The value to convert
 * @returns String representation of the value
 */
export function safeStringId(value: any): string {
  return String(value || '')
}

/**
 * Compares two values for equality, handling null/undefined cases
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
export function safeEquals(a: any, b: any): boolean {
  return safeStringId(a) === safeStringId(b)
} 