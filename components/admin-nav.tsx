"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { LayoutDashboard, Briefcase, FileText, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
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
            title: "Dashboard",
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
    ];

    return (
        <nav
            className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)}
            {...props}
        >
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        pathname === item.href
                            ? "bg-muted hover:bg-muted"
                            : "hover:bg-transparent hover:underline",
                        "justify-start"
                    )}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                </Link>
            ))}
            <Button variant="ghost" className="justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </nav>
    );
}
