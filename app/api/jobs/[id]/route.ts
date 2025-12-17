import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const job = await prisma.jobs.findUnique({
            where: { id: parseInt(id) }
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error('Error fetching job:', error);
        return NextResponse.json(
            { error: 'Failed to fetch job' },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { title, description, location, type, department, requirements, status } = body;

        try {
            const job = await prisma.jobs.update({
                where: { id: parseInt(id) },
                data: {
                    title,
                    description,
                    location,
                    type,
                    department,
                    requirements,
                    status,
                    updated_at: new Date()
                }
            });
            return NextResponse.json({ job });
        } catch (e: unknown) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return NextResponse.json({ error: 'Job not found' }, { status: 404 });
            }
            throw e;
        }
    } catch (error) {
        console.error('Error updating job:', error);
        return NextResponse.json(
            { error: 'Failed to update job' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        try {
            await prisma.jobs.delete({
                where: { id: parseInt(id) }
            });
            return NextResponse.json({ success: true, id });
        } catch (e: unknown) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
                return NextResponse.json({ error: 'Job not found' }, { status: 404 });
            }
            throw e;
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        return NextResponse.json(
            { error: 'Failed to delete job' },
            { status: 500 }
        );
    }
}
