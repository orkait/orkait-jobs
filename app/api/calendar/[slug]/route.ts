import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET public calendar view by slug (no admin notes exposed)
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        // Find interviewer by slug
        const interviewer = await prisma.interviewers.findUnique({
            where: { calendar_slug: slug },
            select: { id: true, name: true, role: true }
        });

        if (!interviewer) {
            return NextResponse.json(
                { error: "Calendar not found" },
                { status: 404 }
            );
        }

        // Build date filter
        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        // Get availability slots (WITHOUT admin_notes)
        const slots = await prisma.availability_slots.findMany({
            where: {
                interviewer_id: interviewer.id,
                date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
            },
            orderBy: [{ date: 'asc' }, { start_time: 'asc' }],
            select: {
                id: true,
                date: true,
                start_time: true,
                end_time: true,
                slot_duration: true,
                is_recurring: true,
                // Intentionally NOT including admin_notes
                bookings: {
                    where: { status: { not: 'cancelled' } },
                    select: {
                        booked_start_time: true,
                        booked_end_time: true
                        // Intentionally NOT including candidate details
                    }
                }
            }
        });

        // Process slots to show available blocks
        const processedSlots = slots.map(slot => {
            const bookedTimes = slot.bookings.map(b => ({
                start: b.booked_start_time,
                end: b.booked_end_time
            }));

            return {
                id: slot.id,
                date: slot.date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                slot_duration: slot.slot_duration,
                booked_times: bookedTimes
            };
        });

        return NextResponse.json({
            interviewer: {
                name: interviewer.name,
                role: interviewer.role
            },
            slots: processedSlots
        });
    } catch (error) {
        console.error("Error fetching public calendar:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar" },
            { status: 500 }
        );
    }
}
