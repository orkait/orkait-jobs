import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getSlotManager,
    formatTimeFromDB,
    parseTimeForDB,
    generateBookableSlots,
} from "@/lib/slot-helpers";

/**
 * GET all bookings with filtering
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const interviewerId = searchParams.get('interviewer_id');
        const status = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        const where: {
            interviewer_id?: number;
            status?: string;
            booked_date?: { gte?: Date; lte?: Date };
        } = {};

        if (interviewerId) {
            where.interviewer_id = parseInt(interviewerId);
        }
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.booked_date = {};
            if (startDate) where.booked_date.gte = new Date(startDate);
            if (endDate) where.booked_date.lte = new Date(endDate);
        }

        const bookings = await prisma.bookings.findMany({
            where,
            orderBy: [{ booked_date: 'desc' }, { booked_start_time: 'asc' }],
            include: {
                interviewer: {
                    select: { id: true, name: true, email: true }
                },
                slot: {
                    select: { id: true, admin_notes: true, slot_duration: true }
                }
            }
        });

        // Format times properly for client
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            booked_start_time: formatTimeFromDB(booking.booked_start_time),
            booked_end_time: formatTimeFromDB(booking.booked_end_time),
        }));

        return NextResponse.json(formattedBookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return NextResponse.json(
            { error: "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}

/**
 * POST create booking with availability validation
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            slot_id, 
            interviewer_id,
            candidate_name, 
            candidate_email, 
            booked_date,
            booked_start_time, 
            booked_end_time,
            slot_number
        } = body;

        if (!slot_id || !interviewer_id || !candidate_name || !candidate_email || 
            !booked_date || !booked_start_time || !booked_end_time) {
            return NextResponse.json(
                { error: "All booking details are required" },
                { status: 400 }
            );
        }

        // Check if candidate already has 2 bookings for this interviewer
        const existingBookings = await prisma.bookings.count({
            where: {
                candidate_email,
                interviewer_id: parseInt(interviewer_id),
                status: { not: 'cancelled' }
            }
        });

        if (existingBookings >= 2) {
            return NextResponse.json(
                { error: "You can only book up to 2 slots per interviewer" },
                { status: 400 }
            );
        }

        // Use slot manager to check if the time is still available
        const manager = getSlotManager(parseInt(interviewer_id));
        const isAvailable = await manager.isAvailable(
            booked_date,
            booked_start_time,
            booked_end_time
        );

        if (!isAvailable) {
            return NextResponse.json(
                { error: "This time slot is no longer available" },
                { status: 409 }
            );
        }

        // Double-check for conflicting booking at the same time
        const conflictingBooking = await prisma.bookings.findFirst({
            where: {
                slot_id: parseInt(slot_id),
                booked_date: new Date(booked_date),
                booked_start_time: parseTimeForDB(booked_start_time),
                status: { not: 'cancelled' }
            }
        });

        if (conflictingBooking) {
            return NextResponse.json(
                { error: "This time slot is already booked" },
                { status: 409 }
            );
        }

        // Create the booking
        const booking = await prisma.bookings.create({
            data: {
                slot_id: parseInt(slot_id),
                interviewer_id: parseInt(interviewer_id),
                candidate_name,
                candidate_email,
                booked_date: new Date(booked_date),
                booked_start_time: parseTimeForDB(booked_start_time),
                booked_end_time: parseTimeForDB(booked_end_time),
                slot_number: slot_number || (existingBookings + 1),
                status: 'pending'
            },
            include: {
                interviewer: {
                    select: { name: true, email: true }
                },
                slot: {
                    select: { slot_duration: true }
                }
            }
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        console.error("Error creating booking:", error);
        return NextResponse.json(
            { error: "Failed to create booking" },
            { status: 500 }
        );
    }
}

/**
 * PATCH update booking status
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, admin_notes } = body;

        if (!id || !status) {
            return NextResponse.json(
                { error: "Booking ID and status are required" },
                { status: 400 }
            );
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Status must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        const booking = await prisma.bookings.update({
            where: { id: parseInt(id) },
            data: {
                status,
                ...(admin_notes !== undefined && { admin_notes })
            },
            include: {
                interviewer: {
                    select: { name: true, email: true }
                }
            }
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.error("Error updating booking:", error);
        return NextResponse.json(
            { error: "Failed to update booking" },
            { status: 500 }
        );
    }
}
