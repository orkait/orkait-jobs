import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple rate limiting - in production, use Redis or a proper rate limiter
const attemptCounts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
    try {
        // Get client IP for rate limiting
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")?.[0] || 'unknown';
        
        // Check rate limit
        const now = Date.now();
        const attemptData = attemptCounts.get(ip);
        
        if (attemptData) {
            // Clean up old attempts
            if (now - attemptData.lastAttempt > LOCKOUT_TIME) {
                attemptCounts.delete(ip);
            } else if (attemptData.count >= MAX_ATTEMPTS) {
                const timeLeft = Math.ceil((LOCKOUT_TIME - (now - attemptData.lastAttempt)) / 1000 / 60);
                return NextResponse.json(
                    { error: `Too many failed attempts. Try again in ${timeLeft} minutes.` },
                    { status: 429 }
                );
            }
        }

        let body;
        try {
            body = await req.json();
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { password } = body;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error("ADMIN_PASSWORD environment variable is not set");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (password === adminPassword) {
            // Success - clear any failed attempts
            attemptCounts.delete(ip);
            
            // Set a cookie to indicate authentication
            const cookieStore = await cookies();
            cookieStore.set("admin_session", "true", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24, // 1 day
                path: "/",
            });

            return NextResponse.json({ success: true });
        } else {
            // Failed attempt - increment counter
            const current = attemptCounts.get(ip) || { count: 0, lastAttempt: 0 };
            attemptCounts.set(ip, {
                count: current.count + 1,
                lastAttempt: now
            });

            return NextResponse.json(
                { error: "Invalid password" },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
