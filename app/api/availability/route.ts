import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getSlotManager,
    formatTimeFromDB,
    formatDateFromDB,
    parseTimeForDB,
} from "@/lib/slot-helpers";
import { SlotValidationError, SlotConflictError } from "@/slots";

/**
 * GET availability slots with optional filtering
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const interviewerId = searchParams.get('interviewer_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const where: {
            interviewer_id?: number;
            date?: { gte?: Date; lte?: Date };
        } = {};

        // Validate interviewer_id
        if (interviewerId) {
            const parsedInterviewerId = parseInt(interviewerId, 10);
            if (isNaN(parsedInterviewerId) || parsedInterviewerId <= 0) {
                return NextResponse.json(
                    { error: "Invalid interviewer_id" },
                    { status: 400 }
                );
            }
            where.interviewer_id = parsedInterviewerId;
        }

        // Validate dates
        if (startDate || endDate) {
            where.date = {};
            
            if (startDate) {
                const parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return NextResponse.json(
                        { error: "Invalid start_date format" },
                        { status: 400 }
                    );
                }
                where.date.gte = parsedStartDate;
            }
            
            if (endDate) {
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return NextResponse.json(
                        { error: "Invalid end_date format" },
                        { status: 400 }
                    );
                }
                where.date.lte = parsedEndDate;
            }
        }

        const slots = await prisma.availability_slots.findMany({
            where,
            orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
            include: {
                interviewer: {
                    select: { id: true, name: true, email: true }
                },
                bookings: {
                    where: { status: { not: 'cancelled' } },
                    select: { 
                        id: true, 
                        booked_start_time: true, 
                        booked_end_time: true,
                        candidate_name: true,
                        status: true
                    }
                }
            }
        });

        // Transform to include availability status and format times properly
        const slotsWithStatus = slots.map(slot => ({
            ...slot,
            start_time: formatTimeFromDB(slot.start_time),
            end_time: formatTimeFromDB(slot.end_time),
            date: formatDateFromDB(slot.date),
            slot_duration: slot.slot_duration || 30, // Ensure duration is included
            available_count: slot.slot_duration ?
                Math.floor((slot.end_time.getTime() - slot.start_time.getTime()) / (1000 * 60 * slot.slot_duration)) - slot.bookings.length
                : 0,
            is_fully_booked: slot.bookings.length >= Math.floor((slot.end_time.getTime() - slot.start_time.getTime()) / (1000 * 60 * (slot.slot_duration || 30)))
        }));

        return NextResponse.json(slotsWithStatus);
    } catch (error) {
        console.error("Error fetching availability slots:", error);
        return NextResponse.json(
            { error: "Failed to fetch availability slots" },
            { status: 500 }
        );
    }
}

/**
 * POST create availability slot with validation and conflict detection
 */
export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { 
            interviewer_id, 
            date, 
            start_time, 
            end_time,
            slot_duration,
            meeting_type,
            meeting_title,
            meeting_description,
            is_recurring, 
            recurrence_rule, 
            admin_notes 
        } = body;

        // Validate required fields
        if (!interviewer_id || !date || !start_time || !end_time) {
            return NextResponse.json(
                { error: "interviewer_id, date, start_time, and end_time are required" },
                { status: 400 }
            );
        }

        // Validate interviewer_id
        const parsedInterviewerId = parseInt(interviewer_id, 10);
        if (isNaN(parsedInterviewerId) || parsedInterviewerId <= 0) {
            return NextResponse.json(
                { error: "Invalid interviewer_id" },
                { status: 400 }
            );
        }

        // Validate date format
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json(
                { error: "Invalid date format" },
                { status: 400 }
            );
        }

        // Validate slot_duration
        const parsedSlotDuration = parseInt(slot_duration, 10) || 30;
        if (parsedSlotDuration <= 0 || parsedSlotDuration > 480) { // Max 8 hours
            return NextResponse.json(
                { error: "Slot duration must be between 1 and 480 minutes" },
                { status: 400 }
            );
        }

        // Use slot manager for validation and conflict detection
        const manager = getSlotManager(parsedInterviewerId);

        try {
            // Check if slot is available (no conflicts)
            const isAvailable = await manager.isAvailable(date, start_time, end_time);
            
            if (!isAvailable) {
                const conflicts = await manager.getConflicts({
                    id: "temp",
                    date,
                    startTime: start_time,
                    endTime: end_time,
                });

                return NextResponse.json(
                    { 
                        error: "Slot conflicts with existing availability",
                        conflicts: conflicts.map(c => ({
                            date: c.date,
                            start_time: c.startTime,
                            end_time: c.endTime
                        }))
                    },
                    { status: 409 }
                );
            }

            // Create the slot using Prisma (slot manager will handle it through adapter)
            const slot = await prisma.availability_slots.create({
                data: {
                    interviewer_id: parsedInterviewerId,
                    date: parsedDate,
                    start_time: parseTimeForDB(start_time),
                    end_time: parseTimeForDB(end_time),
                    slot_duration: parsedSlotDuration,
                    meeting_type: meeting_type || 'interview',
                    meeting_title: meeting_title || null,
                    meeting_description: meeting_description || null,
                    is_recurring: Boolean(is_recurring),
                    recurrence_rule: recurrence_rule || null,
                    admin_notes: admin_notes || null,
                },
                include: {
                    interviewer: {
                        select: { id: true, name: true }
                    }
                }
            });

            return NextResponse.json(slot, { status: 201 });

        } catch (error) {
            if (error instanceof SlotValidationError) {
                return NextResponse.json(
                    { error: error.message, field: error.field },
                    { status: 400 }
                );
            }
            if (error instanceof SlotConflictError) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 409 }
                );
            }
            throw error;
        }
    } catch (error) {
        console.error("Error creating availability slot:", error);
        return NextResponse.json(
            { error: "Failed to create availability slot" },
            { status: 500 }
        );
    }
}

/**
 * DELETE availability slot
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: "Slot ID is required" },
                { status: 400 }
            );
        }

        // Validate ID format
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            return NextResponse.json(
                { error: "Invalid slot ID" },
                { status: 400 }
            );
        }

        // Check if slot has any bookings
        const slot = await prisma.availability_slots.findUnique({
            where: { id: parsedId },
            include: {
                bookings: {
                    where: { status: { not: 'cancelled' } }
                }
            }
        });

        if (!slot) {
            return NextResponse.json(
                { error: "Slot not found" },
                { status: 404 }
            );
        }

        if (slot.bookings.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete slot with active bookings" },
                { status: 400 }
            );
        }

        await prisma.availability_slots.delete({
            where: { id: parsedId }
        });

        return NextResponse.json({ message: "Slot deleted successfully" });
    } catch (error) {
        console.error("Error deleting availability slot:", error);
        return NextResponse.json(
            { error: "Failed to delete availability slot" },
            { status: 500 }
        );
    }
}

/**
 * PATCH update availability slot duration with warning for existing bookings
 */
export async function PATCH(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { id, slot_duration, meeting_type, meeting_title, meeting_description, force_update } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Slot ID is required" },
                { status: 400 }
            );
        }

        // Validate ID
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            return NextResponse.json(
                { error: "Invalid slot ID" },
                { status: 400 }
            );
        }

        // Validate slot_duration if provided
        if (slot_duration !== undefined) {
            const parsedSlotDuration = parseInt(slot_duration, 10);
            if (isNaN(parsedSlotDuration) || parsedSlotDuration <= 0 || parsedSlotDuration > 480) {
                return NextResponse.json(
                    { error: "Slot duration must be between 1 and 480 minutes" },
                    { status: 400 }
                );
            }
        }

        // Check existing slot and bookings
        const slot = await prisma.availability_slots.findUnique({
            where: { id: parsedId },
            include: {
                bookings: {
                    where: { status: { not: 'cancelled' } },
                    select: { 
                        id: true,
                        candidate_name: true,
                        candidate_email: true,
                        booked_start_time: true,
                        booked_end_time: true
                    }
                }
            }
        });

        if (!slot) {
            return NextResponse.json(
                { error: "Slot not found" },
                { status: 404 }
            );
        }

        // If there are existing bookings and no force_update, return warning (only for duration changes)
        if (slot.bookings.length > 0 && !force_update && slot_duration) {
            return NextResponse.json(
                {
                    warning: "Changing duration will affect existing bookings",
                    existing_bookings: slot.bookings.length,
                    bookings: slot.bookings,
                    requires_confirmation: true
                },
                { status: 200 }
            );
        }

        // Prepare update data
        const updateData: any = {};
        if (slot_duration !== undefined) {
            const parsedSlotDuration = parseInt(slot_duration, 10);
            if (isNaN(parsedSlotDuration) || parsedSlotDuration <= 0) {
                return NextResponse.json(
                    { error: "Invalid slot_duration" },
                    { status: 400 }
                );
            }
            updateData.slot_duration = parsedSlotDuration;
        }
        if (meeting_type !== undefined) updateData.meeting_type = meeting_type;
        if (meeting_title !== undefined) updateData.meeting_title = meeting_title;
        if (meeting_description !== undefined) updateData.meeting_description = meeting_description;

        // Update the slot
        const updatedSlot = await prisma.availability_slots.update({
            where: { id: parsedId },
            data: updateData,
            include: {
                interviewer: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json(updatedSlot);
    } catch (error) {
        console.error("Error updating availability slot:", error);
        return NextResponse.json(
            { error: "Failed to update availability slot" },
            { status: 500 }
        );
    }
}
