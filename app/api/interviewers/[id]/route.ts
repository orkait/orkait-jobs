import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single interviewer
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const interviewer = await prisma.interviewers.findUnique({
            where: { id: parseInt(id) },
            include: {
                availability_slots: {
                    orderBy: { date: 'asc' }
                },
                bookings: {
                    orderBy: { booked_date: 'desc' }
                }
            }
        });

        if (!interviewer) {
            return NextResponse.json(
                { error: "Interviewer not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(interviewer);
    } catch (error) {
        console.error("Error fetching interviewer:", error);
        return NextResponse.json(
            { error: "Failed to fetch interviewer" },
            { status: 500 }
        );
    }
}

// PUT update interviewer
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, email, role } = body;

        const interviewer = await prisma.interviewers.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                role,
                updated_at: new Date()
            }
        });

        return NextResponse.json(interviewer);
    } catch (error) {
        console.error("Error updating interviewer:", error);
        return NextResponse.json(
            { error: "Failed to update interviewer" },
            { status: 500 }
        );
    }
}

// DELETE interviewer
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.interviewers.delete({
            where: { id: parseInt(id) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting interviewer:", error);
        return NextResponse.json(
            { error: "Failed to delete interviewer" },
            { status: 500 }
        );
    }
}
