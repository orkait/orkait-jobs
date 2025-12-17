import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/job-card";

async function getJobs() {
    const jobs = await prisma.jobs.findMany({
        where: { status: 'active' },
        orderBy: { created_at: 'desc' }
    });
    return jobs;
}

import { GeneralApplicationForm } from "@/components/general-application-form";

export default async function Home() {
    const jobs = await getJobs();

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <section className="text-center space-y-4 py-8 md:py-12">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Open Positions
                </h1>
            </section>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.length > 0 ? (
                    jobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))
                ) : (
                    <div className="col-span-full py-8">
                        <GeneralApplicationForm />
                    </div>
                )}
            </div>
        </div>
    );
}
