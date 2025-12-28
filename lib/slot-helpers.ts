/**
 * Slot Management Helper Utilities
 * Utilities for integrating the slot manager with API routes
 */
import { prisma } from "@/lib/prisma";
import { SlotManager, PrismaStorageAdapter } from "@/slots";
import type { Slot } from "@/slots/types";

/**
 * Format database Date object to HH:MM string
 * Uses local time to avoid timezone shifts
 */
export function formatTimeFromDB(date: Date): string {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

/**
 * Parse HH:MM string to database Date object
 * Creates a date in local timezone on epoch day (1970-01-01)
 * This ensures the time component is preserved without timezone conversion
 */
export function parseTimeForDB(time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
    return date;
}

/**
 * Format database Date to YYYY-MM-DD string
 */
export function formatDateFromDB(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * Get SlotManager instance configured with Prisma adapter
 */
export function getSlotManager(interviewerId?: number): SlotManager {
    const storage = new PrismaStorageAdapter(prisma, {
        interviewerId,
    });

    return new SlotManager(storage, {
        allowOverlap: false, // Prevent double-booking by default
    });
}

/**
 * Generate bookable time slots from an availability block
 * Splits a large availability slot into smaller bookable chunks
 */
export function generateBookableSlots(
    date: string,
    startTime: string,
    endTime: string,
    slotDuration: number = 30
): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let currentMinutes = startMinutes;
    
    while (currentMinutes + slotDuration <= endMinutes) {
        const slotStart = formatMinutesToTime(currentMinutes);
        const slotEnd = formatMinutesToTime(currentMinutes + slotDuration);
        
        slots.push({
            startTime: slotStart,
            endTime: slotEnd,
        });
        
        currentMinutes += slotDuration;
    }
    
    return slots;
}

/**
 * Format minutes since midnight to HH:MM string
 */
function formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Convert Slot to API response format
 */
export function slotToAPIResponse(slot: Slot) {
    return {
        id: slot.id,
        date: slot.date,
        start_time: slot.startTime,
        end_time: slot.endTime,
        duration: slot.metadata?.duration || 30,
        notes: slot.metadata?.notes || null,
    };
}

/**
 * Validate if a time string is on allowed boundaries (15-min intervals)
 */
export function isValidTimeInterval(time: string): boolean {
    const [, minutes] = time.split(":").map(Number);
    return minutes % 15 === 0;
}

/**
 * Generate time slots array based on slot duration
 * Returns array of time strings (HH:MM format) based on duration
 */
export function generateTimeSlots(slotDuration: number = 30): string[] {
    const slots: string[] = [];
    const totalMinutesInDay = 24 * 60;
    
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += slotDuration) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
    }
    
    return slots;
}

/**
 * Get time slot index based on duration
 */
export function getTimeSlotIndex(time: string, slotDuration: number = 30): number {
    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;
    return Math.floor(totalMinutes / slotDuration);
}
