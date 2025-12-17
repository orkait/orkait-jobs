"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
            });

            if (res.ok) {
                toast.success("Logged out successfully");
                router.push("/");
                router.refresh();
            } else {
                toast.error("Failed to logout");
            }
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            disabled={loading}
            className="gap-2 text-muted-foreground hover:text-foreground"
        >
            <LogOut className="h-4 w-4" />
            Logout
        </Button>
    );
}
