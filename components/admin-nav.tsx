"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { LayoutDashboard, Briefcase, FileText, LogOut, Users, CalendarDays, Clock, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items?: {
        href: string;
        title: string;
        icon: React.ComponentType<{ className?: string }>;
    }[]
}

export function AdminNav({ className, ...props }: SidebarNavProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
        } catch (e) {
            console.error(e);
        }
    };

    const items = [
        {
            href: "/admin/dashboard",
            title: "Overview",
            icon: LayoutDashboard,
        },
        {
            href: "/admin/jobs",
            title: "Jobs",
            icon: Briefcase,
        },
        {
            href: "/admin/applications",
            title: "Applications",
            icon: FileText,
        },
        {
            href: "/admin/interviewers",
            title: "Interviewers",
            icon: Users,
        },
        {
            href: "/admin/calendar",
            title: "Calendar",
            icon: CalendarDays,
        },
        {
            href: "/admin/bookings",
            title: "Bookings",
            icon: Clock,
        },
        {
            href: "/admin/configuration",
            title: "Configuration",
            icon: Settings,
        },
    ];

    return (
        <nav
            className={cn("flex flex-col space-y-1", className)}
            {...props}
        >
            <div className="mb-4 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Management
            </div>
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        pathname === item.href
                            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                            : "hover:bg-muted/50 hover:text-foreground",
                        "justify-start h-10 px-4 font-medium transition-colors duration-200"
                    )}
                >
                    <item.icon className={cn("mr-3 h-4 w-4", pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.title}
                </Link>
            ))}
            
            <div className="mt-8 mb-4 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Account
            </div>
             <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="justify-start h-10 px-4 text-red-500 hover:text-red-600 hover:bg-red-50/50 w-full"
            >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
            </Button>
        </nav>
    );
}
