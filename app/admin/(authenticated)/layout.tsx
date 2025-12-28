import { AdminNav } from "@/components/admin-nav";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function AdminAuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row md:overflow-hidden bg-muted/30">
            {/* Sidebar (Desktop) */}
            <aside className="w-full flex-none md:w-64 border-r bg-card hidden md:flex md:flex-col">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                             <Zap className="h-4 w-4" /> {/* Or generic logo */}
                        </div>
                        <span className="">Orkait Admin</span>
                    </Link>
                </div>
                <ScrollArea className="flex-1 py-4">
                     <div className="px-3">
                        <AdminNav />
                    </div>
                </ScrollArea>
                <div className="mt-auto p-4 border-t">
                     <div className="text-xs text-muted-foreground text-center">
                        v1.0.0
                     </div>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-grow flex-col flex overflow-y-auto md:overflow-hidden">
                 {/* Mobile Header (Simplified, Sheet trigger can be added later if needed or if user complains) */}
                <header className="flex h-14 md:hidden items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px] justify-between">
                     <Link href="#" className="flex items-center gap-2 font-semibold">
                        <span className="">Orkait Admin</span>
                    </Link>
                    {/* Add Mobile Menu Trigger Here if implementation needed */}
                </header>
                
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                     {children}
                </main>
            </div>
        </div>
    );
}
