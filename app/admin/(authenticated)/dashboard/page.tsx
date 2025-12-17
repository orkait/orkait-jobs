import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
// import { Overview } from "@/components/overview"; // We can add charts later

async function getStats() {
    const jobsCount = await prisma.jobs.count();
    const appsCount = await prisma.applications.count();
    const recentApps = await prisma.applications.findMany({
        orderBy: { created_at: 'desc' },
        take: 5
    });

    return {
        jobs: jobsCount,
        applications: appsCount,
        recent: recentApps
    };
}

export default async function DashboardPage() {
    const stats = await getStats();

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Jobs
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.jobs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Applications
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.applications}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.recent.length === 0 ? (
                            <p className="text-muted-foreground">No applications yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {stats.recent.map((app) => (
                                    <div key={app.id} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{app.name}</p>
                                            <p className="text-sm text-muted-foreground">{app.email}</p>
                                        </div>
                                        <div className="ml-auto font-medium" suppressHydrationWarning>
                                            {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
