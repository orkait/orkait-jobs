/**
 * Helper utilities for slot operations
 * ID generation, slot transformations, and overlap detection
 */
import { CONFIG } from "../constants";
import type { Slot, SlotInternal } from "../types";
import { timeToIndex } from "./time";

/**
 * Generate a UUID v4 for slot identification
 * Using inline implementation to avoid external dependencies
 */
export function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Convert a Slot to internal representation with time indices
 * Makes overlap detection and time calculations more efficient
 */
export function toInternal(slot: Slot): SlotInternal {
    return {
        ...slot,
        startIndex: timeToIndex(slot.startTime),
        endIndex: timeToIndex(slot.endTime),
    };
}

/**
 * Check if two slots overlap in time
 * Slots must be on the same date to overlap
 */
export function isOverlapping(slot1: Slot, slot2: Slot): boolean {
    if (slot1.date !== slot2.date) return false;

    const s1 = toInternal(slot1);
    const s2 = toInternal(slot2);

    // Classic interval overlap: start1 < end2 AND end1 > start2
    return s1.startIndex < s2.endIndex && s1.endIndex > s2.startIndex;
}

/**
 * Calculate overlap duration in minutes between two slots
 * Returns 0 if slots don't overlap
 */
export function getOverlapMinutes(slot1: Slot, slot2: Slot): number {
    if (!isOverlapping(slot1, slot2)) return 0;

    const s1 = toInternal(slot1);
    const s2 = toInternal(slot2);

    const overlapStart = Math.max(s1.startIndex, s2.startIndex);
    const overlapEnd = Math.min(s1.endIndex, s2.endIndex);

    return (overlapEnd - overlapStart) * CONFIG.INTERVAL_MINUTES;
}
