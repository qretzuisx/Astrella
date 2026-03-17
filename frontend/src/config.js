    /**
 * Centralized app config. Use these instead of repeating env reads.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
export const CURRENCY = import.meta.env.VITE_CURRENCY || '₱'

// Reservation pricing: base includes 3 reserved days, then +fee per extra day.
export const EXTRA_DAY_FEE = Number(import.meta.env.VITE_EXTRA_DAY_FEE) || 50
