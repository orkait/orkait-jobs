import { AdminNav } from "@/components/admin-nav";
import { Separator } from "@/components/ui/separator";

export default function AdminAuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6 p-10 pb-16 block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
                <p className="text-muted-foreground">
                    Manage jobs and applications.
                </p>
            </div>
            <Separator className="my-6" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="lg:w-1/5 shrink-0">
                    <AdminNav />
                </aside>
                <div className="flex-1 overflow-auto">{children}</div>
            </div>
        </div>
    );
}
