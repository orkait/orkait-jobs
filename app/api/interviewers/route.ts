import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all interviewers
export async function GET() {
    try {
        const interviewers = await prisma.interviewers.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: {
                        availability_slots: true,
                        bookings: true
                    }
                }
            }
        });
        return NextResponse.json(interviewers);
    } catch (error) {
        console.error("Error fetching interviewers:", error);
        return NextResponse.json(
            { error: "Failed to fetch interviewers" },
            { status: 500 }
        );
    }
}

// POST create new interviewer
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, role } = body;

        if (!name || !email) {
            return NextResponse.json(
                { error: "Name and email are required" },
                { status: 400 }
            );
        }

        // Generate slug from email
        const calendar_slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');

        const interviewer = await prisma.interviewers.create({
            data: {
                name,
                email,
                role: role || null,
                calendar_slug,
            }
        });

        return NextResponse.json(interviewer, { status: 201 });
    } catch (error) {
        console.error("Error creating interviewer:", error);
        return NextResponse.json(
            { error: "Failed to create interviewer" },
            { status: 500 }
        );
    }
}
