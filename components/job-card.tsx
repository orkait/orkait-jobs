import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, BriefcaseIcon } from "lucide-react";

interface Job {
    id: number;
    title: string;
    department: string | null;
    location: string | null;
    type: string | null;
    created_at: Date | null;
}

interface JobCardProps {
    job: Job;
}

export function JobCard({ job }: JobCardProps) {
    return (
        <Link href={`/jobs/${job.id}`} className="block h-full">
            <Card className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{job.department || 'Not specified'}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 ml-2">{job.type || 'Not specified'}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                            <MapPinIcon className="mr-1 h-3 w-3" />
                            {job.location || 'Not specified'}
                        </div>
                        <div className="flex items-center">
                            <BriefcaseIcon className="mr-1 h-3 w-3" />
                            {job.type || 'Not specified'}
                        </div>
                        <div className="flex items-center">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <span className="text-primary hover:underline text-sm font-medium">View Details &rarr;</span>
                </CardFooter>
            </Card>
        </Link>
    );
}
