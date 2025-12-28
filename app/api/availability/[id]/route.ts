import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single availability slot
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const slot = await prisma.availability_slots.findUnique({
            where: { id: parseInt(id) },
            include: {
                interviewer: true,
                bookings: true
            }
        });

        if (!slot) {
            return NextResponse.json(
                { error: "Availability slot not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(slot);
    } catch (error) {
        console.error("Error fetching availability slot:", error);
        return NextResponse.json(
            { error: "Failed to fetch availability slot" },
            { status: 500 }
        );
    }
}

// PUT update availability slot
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { date, start_time, end_time, is_recurring, recurrence_rule, admin_notes } = body;

        const updateData: Record<string, unknown> = {};
        
        if (date) updateData.date = new Date(date);
        if (start_time) updateData.start_time = new Date(`1970-01-01T${start_time}`);
        if (end_time) updateData.end_time = new Date(`1970-01-01T${end_time}`);
        if (typeof is_recurring === 'boolean') updateData.is_recurring = is_recurring;
        if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule;
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

        const slot = await prisma.availability_slots.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        return NextResponse.json(slot);
    } catch (error) {
        console.error("Error updating availability slot:", error);
        return NextResponse.json(
            { error: "Failed to update availability slot" },
            { status: 500 }
        );
    }
}

// DELETE availability slot
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.availability_slots.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting availability slot:", error);
        return NextResponse.json(
            { error: "Failed to delete availability slot" },
            { status: 500 }
        );
    }
}
