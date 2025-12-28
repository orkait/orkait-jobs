import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single booking
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const booking = await prisma.bookings.findUnique({
            where: { id: parseInt(id) },
            include: {
                interviewer: true,
                slot: true
            }
        });

        if (!booking) {
            return NextResponse.json(
                { error: "Booking not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error("Error fetching booking:", error);
        return NextResponse.json(
            { error: "Failed to fetch booking" },
            { status: 500 }
        );
    }
}

// PUT update booking (status, admin notes)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, admin_notes } = body;

        const updateData: Record<string, unknown> = {};
        if (status) updateData.status = status;
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes;

        const booking = await prisma.bookings.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                interviewer: {
                    select: { name: true }
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

// DELETE cancel booking
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Soft delete - set status to cancelled
        await prisma.bookings.update({
            where: { id: parseInt(id) },
            data: { status: 'cancelled' }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error cancelling booking:", error);
        return NextResponse.json(
            { error: "Failed to cancel booking" },
            { status: 500 }
        );
    }
}
