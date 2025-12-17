"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
// import { toast } from "sonner"; // If you want to use toast

export default function AdminLoginPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ password }),
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                router.push("/admin/dashboard");
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || "Invalid password");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        Admin Login
                    </CardTitle>
                    <CardDescription className="text-center">
                        Enter your password to access the admin portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
