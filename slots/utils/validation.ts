/**
 * Validation utilities for slot booking inputs
 * Ensures dates, times, and slot configurations are valid
 */
import { CONFIG, TIME_REGEX, DATE_REGEX } from "../constants";
import { SlotValidationError } from "../errors";
import type { CreateSlotInput } from "../types";
import { timeToIndex } from "./time";

/**
 * Check if time string matches HH:MM format
 */
export function isValidTimeFormat(time: string): boolean {
    return TIME_REGEX.test(time?.trim?.() ?? "");
}

/**
 * Check if time falls on a 30-minute boundary
 * Required for consistent slot scheduling
 */
export function isOn15MinBoundary(time: string): boolean {
    if (!isValidTimeFormat(time)) return false;
    const minutes = parseInt(time.split(":")[1], 10);
    return minutes % CONFIG.INTERVAL_MINUTES === 0;
}

/**
 * Validate date string and ensure it represents a real date
 * Checks both format (YYYY-MM-DD) and validity (no Feb 30, etc.)
 */
export function isValidDate(dateStr: string): boolean {
    const trimmed = dateStr?.trim?.() ?? "";
    if (!DATE_REGEX.test(trimmed)) return false;

    // Verify the date is actually valid (catches invalid dates like 2024-02-30)
    const [year, month, day] = trimmed.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

/**
 * Validate and normalize slot input data
 * Throws SlotValidationError if any validation fails
 */
export function validateSlotInput(input: CreateSlotInput): {
    date: string;
    startTime: string;
    endTime: string;
} {
    const date = input.date?.trim?.() ?? "";
    const startTime = input.startTime?.trim?.() ?? "";
    const endTime = input.endTime?.trim?.() ?? "";

    if (!isValidDate(date)) {
        throw new SlotValidationError(
            `Invalid date: "${input.date}". Use YYYY-MM-DD format.`,
            "date"
        );
    }

    if (!isValidTimeFormat(startTime)) {
        throw new SlotValidationError(
            `Invalid start time: "${input.startTime}". Use HH:MM format.`,
            "startTime"
        );
    }

    if (!isValidTimeFormat(endTime)) {
        throw new SlotValidationError(
            `Invalid end time: "${input.endTime}". Use HH:MM format.`,
            "endTime"
        );
    }

    if (!isOn15MinBoundary(startTime)) {
        throw new SlotValidationError(
            `Start time must be on ${CONFIG.INTERVAL_MINUTES}-minute interval.`,
            "startTime"
        );
    }

    if (!isOn15MinBoundary(endTime)) {
        throw new SlotValidationError(
            `End time must be on ${CONFIG.INTERVAL_MINUTES}-minute interval.`,
            "endTime"
        );
    }

    const startIndex = timeToIndex(startTime);
    const endIndex = timeToIndex(endTime);

    if (endIndex <= startIndex) {
        throw new SlotValidationError(
            `End time (${endTime}) must be after start time (${startTime}).`,
            "range"
        );
    }

    return { date, startTime, endTime };
}
