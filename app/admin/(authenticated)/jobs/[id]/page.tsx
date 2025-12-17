"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash } from "lucide-react";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        department: "",
        location: "Remote",
        type: "Full-time",
        description: "",
        requirements: "",
        status: "active",
    });

    useEffect(() => {
        async function fetchJob() {
            try {
                const res = await fetch(`/api/jobs/${id}`);
                if (!res.ok) {
                    // Handle 404
                    return;
                }
                const json = await res.json();
                const job = json.job || json; // Handle wrapped or unwrapped response

                setFormData({
                    title: job.title,
                    department: job.department,
                    location: job.location,
                    type: job.type,
                    description: job.description,
                    requirements: job.requirements || "",
                    status: job.status,
                });
            } catch (err) {
                console.error("Failed to load job", err);
            } finally {
                setLoading(false);
            }
        }
        fetchJob();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch(`/api/jobs/${id}`, {
                method: "PUT",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
                router.push("/admin/jobs");
                router.refresh();
            } else {
                console.error("Failed to update job");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this job?")) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/admin/jobs");
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Edit Job</h1>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Job Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Senior Software Engineer"
                                    required
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    placeholder="e.g. Engineering"
                                    required
                                    value={formData.department}
                                    onChange={(e) =>
                                        setFormData({ ...formData, department: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    placeholder="e.g. Remote, NY, London"
                                    required
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({ ...formData, location: e.target.value })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, type: val })
                                    }
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                        <SelectItem value="Part-time">Part-time</SelectItem>
                                        <SelectItem value="Contract">Contract</SelectItem>
                                        <SelectItem value="Internship">Internship</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, status: val })
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                className="min-h-[150px]"
                                placeholder="Job description..."
                                required
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                            />
                        </div>



                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
