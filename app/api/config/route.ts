import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET system configuration by key or all configurations
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (key) {
            // Get specific configuration
            const config = await prisma.system_config.findUnique({
                where: { key }
            });

            if (!config) {
                return NextResponse.json(
                    { error: "Configuration not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                key: config.key,
                value: config.value,
                description: config.description
            });
        } else {
            // Get all configurations
            const configs = await prisma.system_config.findMany({
                select: {
                    key: true,
                    value: true,
                    description: true,
                    updated_at: true
                },
                orderBy: { key: 'asc' }
            });

            return NextResponse.json(configs);
        }
    } catch (error) {
        console.error("Error fetching configuration:", error);
        return NextResponse.json(
            { error: "Failed to fetch configuration" },
            { status: 500 }
        );
    }
}

/**
 * POST/PUT update system configuration
 */
export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const { key, value, description } = body;

        if (!key || value === undefined) {
            return NextResponse.json(
                { error: "Key and value are required" },
                { status: 400 }
            );
        }

        // Validate key format (only alphanumeric and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            return NextResponse.json(
                { error: "Key must contain only alphanumeric characters and underscores" },
                { status: 400 }
            );
        }

        // Validate key length
        if (key.length > 100) {
            return NextResponse.json(
                { error: "Key must be 100 characters or less" },
                { status: 400 }
            );
        }

        // Upsert configuration
        const config = await prisma.system_config.upsert({
            where: { key },
            update: {
                value,
                description: description || null
            },
            create: {
                key,
                value,
                description: description || null
            }
        });

        return NextResponse.json({
            key: config.key,
            value: config.value,
            description: config.description
        });
    } catch (error) {
        console.error("Error updating configuration:", error);
        return NextResponse.json(
            { error: "Failed to update configuration" },
            { status: 500 }
        );
    }
}

/**
 * DELETE configuration
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json(
                { error: "Key is required" },
                { status: 400 }
            );
        }

        await prisma.system_config.delete({
            where: { key }
        });

        return NextResponse.json({ message: "Configuration deleted successfully" });
    } catch (error) {
        console.error("Error deleting configuration:", error);
        return NextResponse.json(
            { error: "Failed to delete configuration" },
            { status: 500 }
        );
    }
}