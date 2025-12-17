import { prisma } from "@/lib/prisma";
import { ApplicationForm } from "@/components/general-application-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

async function getJob(id: string) {
    const job = await prisma.jobs.findUnique({
        where: { id: parseInt(id) },
        select: { title: true }
    });
    return job;
}

export default async function JobApplyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">Job not found.</p>
                <Link href="/" className="mt-4 text-primary hover:underline">
                    Back to Jobs
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl py-10 space-y-6">
            <Link href={`/jobs/${id}`}>
                <Button variant="ghost" className="pl-0 hover:pl-0 hover:bg-transparent">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Description
                </Button>
            </Link>

            <div>
                <ApplicationForm jobId={id} jobTitle={job.title} />
            </div>
        </div>
    );
}
