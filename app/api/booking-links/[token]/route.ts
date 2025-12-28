import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET - Validate booking link token
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        const link = await prisma.booking_links.findUnique({
            where: { token },
            include: {
                interviewer: {
                    select: {
                        id: true,
                        name: true,
                        calendar_slug: true,
                        role: true
                    }
                }
            }
        });

        if (!link) {
            return NextResponse.json(
                { valid: false, error: "Invalid link" },
                { status: 404 }
            );
        }

        // Check if expired
        if (new Date() > new Date(link.expires_at)) {
            return NextResponse.json(
                { valid: false, error: "Link has expired" },
                { status: 410 }
            );
        }

        // Check if already used
        if (link.used_at) {
            return NextResponse.json(
                { valid: false, error: "Link has already been used" },
                { status: 410 }
            );
        }

        return NextResponse.json({
            valid: true,
            interviewer: link.interviewer,
            expires_at: link.expires_at,
            custom_title: link.custom_title,
            allow_multiple_slots: link.allow_multiple_slots
        });

    } catch (error) {
        console.error("Error validating link:", error);
        return NextResponse.json(
            { error: "Failed to validate link" },
            { status: 500 }
        );
    }
}

/**
 * PATCH - Mark link as used
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "email is required" },
                { status: 400 }
            );
        }

        // Check link exists and is valid
        const link = await prisma.booking_links.findUnique({
            where: { token }
        });

        if (!link) {
            return NextResponse.json(
                { error: "Invalid link" },
                { status: 404 }
            );
        }

        if (new Date() > new Date(link.expires_at)) {
            return NextResponse.json(
                { error: "Link has expired" },
                { status: 410 }
            );
        }

        if (link.used_at) {
            return NextResponse.json(
                { error: "Link has already been used" },
                { status: 410 }
            );
        }

        // Mark as used
        await prisma.booking_links.update({
            where: { token },
            data: {
                used_at: new Date(),
                used_by_email: email
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error marking link as used:", error);
        return NextResponse.json(
            { error: "Failed to mark link as used" },
            { status: 500 }
        );
    }
}
