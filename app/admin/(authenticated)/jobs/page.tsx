import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

async function getJobs() {
    const jobs = await prisma.jobs.findMany({
        orderBy: { created_at: 'desc' }
    });
    return jobs;
}

export default async function AdminJobsPage() {
    const jobs = await getJobs();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
                <Link href="/admin/jobs/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Job
                    </Button>
                </Link>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No jobs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell className="font-medium">{job.title}</TableCell>
                                    <TableCell>{job.department}</TableCell>
                                    <TableCell>{job.location}</TableCell>
                                    <TableCell>{job.type}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                job.status === "active"
                                                    ? "default"
                                                    : job.status === "closed"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {job.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/jobs/${job.id}`}>Edit</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
