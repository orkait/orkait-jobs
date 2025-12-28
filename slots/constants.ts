/**
 * Slot configuration constants
 * Defines the granularity of time slots (30-minute intervals)
 */
export const CONFIG = {
    INTERVAL_MINUTES: 30,
    INTERVALS_PER_HOUR: 2,
    INTERVALS_PER_DAY: 48, // 24 hours * 2 intervals
} as const;

// Validation patterns
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format (24-hour)
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // YYYY-MM-DD format
