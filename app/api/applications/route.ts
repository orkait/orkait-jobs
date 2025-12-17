import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/applications - Submit a new application (Public)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            job_id, name, email, phone, resumeUrl, resume_url, coverLetter, cover_letter,
            linkedin, linkedin_url, portfolio_links, referredBy, referred_by
        } = body;

        // Handle mappings
        const finalResumeUrl = resumeUrl || resume_url;
        const finalLinkedinUrl = linkedin || linkedin_url;
        const finalCoverLetter = coverLetter || cover_letter;
        const finalReferredBy = referredBy || referred_by;
        const finalPortfolioLinks = portfolio_links;

        // Basic validation
        if (!name || !email || !finalResumeUrl) {
            return NextResponse.json(
                { error: 'Missing required fields (name, email, resume_url)' },
                { status: 400 }
            );
        }

        const application = await prisma.applications.create({
            data: {
                job_id: job_id ? parseInt(job_id) : null,
                name,
                email,
                phone,
                resume_url: finalResumeUrl,
                cover_letter: finalCoverLetter,
                linkedin_url: finalLinkedinUrl,
                portfolio_links: finalPortfolioLinks || [], // Ensure array
                status: 'pending',
                referred_by: finalReferredBy
            }
        });

        return NextResponse.json({ application }, { status: 201 });
    } catch (error) {
        console.error('Error submitting application:', error);
        return NextResponse.json(
            { error: 'Failed to submit application' },
            { status: 500 }
        );
    }
}

// GET /api/applications - List applications (Admin only)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get('job_id');
        const status = searchParams.get('status');

        const applicationsRaw = await prisma.applications.findMany({
            where: {
                job_id: jobId ? parseInt(jobId) : undefined,
                status: status || undefined
            },
            orderBy: { created_at: 'desc' },
            include: {
                jobs: {
                    select: { title: true }
                }
            }
        });

        // Map to flatten structure (job_title) as expected by frontend
        const applications = applicationsRaw.map(app => ({
            ...app,
            job_title: app.jobs?.title
        }));

        return NextResponse.json({ applications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch applications' },
            { status: 500 }
        );
    }
}
