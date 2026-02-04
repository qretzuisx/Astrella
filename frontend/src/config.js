    /**
 * Centralized app config. Use these instead of repeating env reads.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const CURRENCY = import.meta.env.VITE_CURRENCY || '₱'
