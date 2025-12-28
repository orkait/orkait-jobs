import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * POST - Generate a new booking link
 */
export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (jsonError) {
            console.error("JSON parsing error:", jsonError);
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }
        
        const { interviewer_id, custom_title, allow_multiple_slots } = body;

        if (!interviewer_id) {
            return NextResponse.json(
                { error: "interviewer_id is required" },
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

        // Verify interviewer exists
        const interviewer = await prisma.interviewers.findUnique({
            where: { id: parsedInterviewerId }
        });

        if (!interviewer) {
            return NextResponse.json(
                { error: "Interviewer not found" },
                { status: 404 }
            );
        }

        // Generate 6 character base62 token
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let token = '';
        for (let i = 0; i < 6; i++) {
            const randomByte = randomBytes(1)[0];
            token += chars[randomByte % chars.length];
        }

        // Set expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create booking link
        const link = await prisma.booking_links.create({
            data: {
                token,
                interviewer_id: parsedInterviewerId,
                expires_at: expiresAt,
                custom_title: custom_title || null,
                allow_multiple_slots: Boolean(allow_multiple_slots)
            }
        });

        // Build full URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const url = `${baseUrl}/schedule/${interviewer.calendar_slug}/${token}`;

        return NextResponse.json({
            token,
            url,
            expires_at: expiresAt.toISOString(),
            interviewer: {
                name: interviewer.name,
                slug: interviewer.calendar_slug
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Error generating booking link:", error);
        return NextResponse.json(
            { error: "Failed to generate booking link" },
            { status: 500 }
        );
    }
}
