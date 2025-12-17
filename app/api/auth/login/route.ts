import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error("ADMIN_PASSWORD environment variable is not set");
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (password === adminPassword) {
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
