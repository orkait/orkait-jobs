import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/jobs - List active jobs (public) or all jobs (admin)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isAdmin = searchParams.get('admin') === 'true';

        const jobs = await prisma.jobs.findMany({
            where: isAdmin ? undefined : { status: 'active' },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch jobs' },
            { status: 500 }
        );
    }
}

// POST /api/jobs - Create a new job
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, location, type, department, requirements, status } = body;

        // Basic validation
        if (!title || !description) {
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        // Generate random 6 digit ID
        const id = Math.floor(100000 + Math.random() * 900000);

        const job = await prisma.jobs.create({
            data: {
                id,
                title,
                description,
                location,
                type,
                department,
                requirements,
                status: status || 'draft',
                created_at: new Date(), // Explicitly set needed? Prisma defaults handle it, but sometimes explicit is safe if default is DB side and Prisma doesn't know.
                // Schema says: @default(now()) for created_at. So we can omit it.
            }
        });

        return NextResponse.json({ job }, { status: 201 });
    } catch (error) {
        console.error('Error creating job:', error);
        return NextResponse.json(
            { error: 'Failed to create job' },
            { status: 500 }
        );
    }
}
