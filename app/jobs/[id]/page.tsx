import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, MapPin, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";

async function getJob(id: string) {
    const job = await prisma.jobs.findUnique({
        where: { id: parseInt(id) }
    });
    return job;
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(id);

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">Job not found.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" /> {job.department}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> {new Date(job.created_at ?? new Date()).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">{job.type}</Badge>
                        {job.status !== 'active' && <Badge variant="destructive">Closed</Badge>}
                    </div>
                </div>
                {job.status === 'active' && (
                    <Link href={`/jobs/${job.id}/apply`}>
                        <Button size="lg">Apply Now</Button>
                    </Link>
                )}
            </div>

            <div className="space-y-8">
                <section>
                    {/* <h2 className="text-xl font-bold mb-4">Description</h2> */}
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                        <ReactMarkdown>{job.description}</ReactMarkdown>
                    </div>
                </section>


            </div>

            {job.status === 'active' ? (
                <div className="flex justify-center pt-8">
                    <Link href={`/jobs/${job.id}/apply`}>
                        <Button size="lg" className="px-8">Apply for this position</Button>
                    </Link>
                </div>
            ) : (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
                    <p className="text-muted-foreground">This position is currently closed for new applications.</p>
                </div>
            )}
        </div>
    );
}
