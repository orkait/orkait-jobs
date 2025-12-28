"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Calendar, Settings } from "lucide-react";
import { toast } from "sonner";

interface SystemConfig {
    key: string;
    value: any;
    description?: string;
}

export default function ConfigurationPage() {
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Configuration values
    const [dateRangeDays, setDateRangeDays] = useState<number>(7);

    useEffect(() => {
        loadConfigurations();
    }, []);

    const loadConfigurations = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/config");
            const data = await res.json();
            
            setConfigs(data);
            
            // Set UI state from loaded configs
            const dateRangeConfig = data.find((c: SystemConfig) => c.key === "date_range_days");
            if (dateRangeConfig) {
                setDateRangeDays(dateRangeConfig.value);
            }
        } catch (error) {
            console.error("Error loading configurations:", error);
            toast.error("Failed to load configurations");
        } finally {
            setLoading(false);
        }
    };

    const saveConfiguration = async (key: string, value: any, description: string) => {
        try {
            const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value, description })
            });

            if (res.ok) {
                toast.success("Configuration saved");
                loadConfigurations();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save configuration");
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            toast.error("Failed to save configuration");
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await saveConfiguration(
                "date_range_days", 
                dateRangeDays, 
                "Number of days from today that users can select for booking"
            );
            
            toast.success("Configuration saved successfully");
        } catch (error) {
            console.error("Error saving configuration:", error);
            toast.error("Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">System Configuration</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage global system settings and preferences
                    </p>
                </div>
                <Button onClick={handleSaveAll} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save All"}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-muted-foreground">Loading configurations...</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* Date Range Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Date Range Settings
                            </CardTitle>
                            <CardDescription>
                                Configure how far in advance users can book appointments
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="dateRangeDays">Booking Window (Days)</Label>
                                <Select
                                    value={dateRangeDays.toString()}
                                    onValueChange={(value) => setDateRangeDays(parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 day (today only)</SelectItem>
                                        <SelectItem value="3">3 days</SelectItem>
                                        <SelectItem value="7">7 days (1 week)</SelectItem>
                                        <SelectItem value="14">14 days (2 weeks)</SelectItem>
                                        <SelectItem value="30">30 days (1 month)</SelectItem>
                                        <SelectItem value="60">60 days (2 months)</SelectItem>
                                        <SelectItem value="90">90 days (3 months)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Users can select dates up to {dateRangeDays} days from today
                                </p>
                            </div>
                        </CardContent>
                    </Card>


                    {/* Current Configurations Display */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5 text-gray-600" />
                                Current Configurations
                            </CardTitle>
                            <CardDescription>
                                View all active system configurations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {configs.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    No configurations found
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {configs.map((config) => (
                                        <div key={config.key} className="border rounded-lg p-3 bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium">{config.key}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {config.description || "No description"}
                                                    </p>
                                                </div>
                                                <div className="text-sm font-mono bg-white px-2 py-1 rounded border">
                                                    {typeof config.value === 'object' 
                                                        ? JSON.stringify(config.value)
                                                        : String(config.value)
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}