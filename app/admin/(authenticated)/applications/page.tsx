import { prisma } from "@/lib/prisma";
import { ApplicationList } from "@/components/admin/ApplicationList";
import { Prisma } from "@prisma/client";

async function getApplications() {
  const apps = await prisma.applications.findMany({
    orderBy: { created_at: 'desc' },
    include: {
        jobs: {
            select: { title: true }
        }
    }
  });
  
  type ApplicationWithJobTitle = Prisma.applicationsGetPayload<{
      include: {
          jobs: {
              select: { title: true }
          }
      }
  }>;

  return apps.map((app: ApplicationWithJobTitle) => ({
    ...app,
    job_title: app.jobs?.title
  }));
}

export default async function AdminApplicationsPage() {
  const applications = await getApplications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">{applications.length} total applications</p>
      </div>
      <ApplicationList applications={applications} />
    </div>
  );
}
