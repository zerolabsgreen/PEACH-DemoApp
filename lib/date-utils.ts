/**
 * Date utility functions for consistent date formatting across the app
 * All dates should be displayed in YYYY-MM-DD format
 */

/**
 * Formats a date string or Date object to YYYY-MM-DD format
 * @param date - Date string or Date object
 * @returns Formatted date string in YYYY-MM-DD format, or '-' if invalid
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return '-'
    
    // Use local date components to avoid timezone issues
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return '-'
  }
}

/**
 * Formats a date string or Date object to YYYY-MM-DD HH:MM format
 * @param date - Date string or Date object
 * @returns Formatted date string in YYYY-MM-DD HH:MM format, or '-' if invalid
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return '-'
    
    const dateStr = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
    const timeStr = dateObj.toTimeString().split(' ')[0].slice(0, 5) // HH:MM
    return `${dateStr} ${timeStr}`
  } catch {
    return '-'
  }
}

/**
 * Formats a date range for display
 * @param startDate - Start date string or Date object
 * @param endDate - End date string or Date object (optional)
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: string | Date | null | undefined, endDate?: string | Date | null | undefined): string {
  const start = formatDate(startDate)
  if (start === '-') return '-'
  
  const end = endDate ? formatDate(endDate) : null
  if (!end || end === '-') return start
  
  return `${start} — ${end}`
}

/**
 * Converts a date to YYYY-MM-DD format for HTML date inputs
 * @param date - Date string or Date object
 * @returns Date string in YYYY-MM-DD format for HTML date inputs
 */
export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ''
    
    // Use local date components to avoid timezone issues
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}

/**
 * Parses a date from YYYY-MM-DD format (from HTML date inputs)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 */
export function parseDateInput(dateString: string): Date | null {
  if (!dateString) return null
  
  try {
    // Parse the date components to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}
