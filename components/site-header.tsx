import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4">
                <div className="mr-4 flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <Briefcase className="h-6 w-6" />
                        <span className="hidden font-bold sm:inline-block">
                            Orkait Jobs
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <Link
                            href="/"
                            className="transition-colors hover:text-foreground/80 text-foreground/60"
                        >
                            Jobs
                        </Link>
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <nav className="flex items-center">
                        <Link href="/admin/login">
                            <Button variant="ghost" size="sm">
                                Admin Login
                            </Button>
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
}
