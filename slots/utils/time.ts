/**
 * Time conversion utilities for slot management
 * Converts between HH:MM format and interval indices
 */
import { CONFIG } from "../constants";

/**
 * Convert time string to interval index
 * @example timeToIndex("09:30") => 38 (9.5 hours * 4 intervals/hour)
 */
export function timeToIndex(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours * 60 + minutes) / CONFIG.INTERVAL_MINUTES;
}

/**
 * Convert interval index back to time string
 * @example indexToTime(38) => "09:30"
 */
export function indexToTime(index: number): string {
    const totalMinutes = index * CONFIG.INTERVAL_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
