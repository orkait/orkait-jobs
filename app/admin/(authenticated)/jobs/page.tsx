import { prisma } from "@/lib/prisma";
import { JobsTable } from "@/components/admin/JobsTable";

async function getJobs() {
    return await prisma.jobs.findMany({
        orderBy: { created_at: 'desc' }
    });
}

export default async function AdminJobsPage() {
    const jobs = await getJobs();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
            </div>
            <JobsTable jobs={jobs} />
        </div>
    );
}
