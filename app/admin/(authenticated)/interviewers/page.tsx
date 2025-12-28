"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, Edit, Link2, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Interviewer {
    id: number;
    name: string;
    email: string;
    role: string | null;
    calendar_slug: string;
    created_at: string;
    _count: {
        availability_slots: number;
        bookings: number;
    };
}

export default function InterviewersPage() {
    const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", role: "" });

    const fetchInterviewers = useCallback(async () => {
        try {
            const res = await fetch("/api/interviewers");
            const data = await res.json();
            setInterviewers(data);
        } catch (error) {
            console.error("Error fetching interviewers:", error);
            toast.error("Failed to load interviewers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInterviewers();
    }, [fetchInterviewers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingId ? `/api/interviewers/${editingId}` : "/api/interviewers";
            const method = editingId ? "PUT" : "POST";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to save");

            toast.success(editingId ? "Interviewer updated" : "Interviewer created");
            setDialogOpen(false);
            setFormData({ name: "", email: "", role: "" });
            setEditingId(null);
            fetchInterviewers();
        } catch (error) {
            console.error("Error saving interviewer:", error);
            toast.error("Failed to save interviewer");
        }
    };

    const handleEdit = (interviewer: Interviewer) => {
        setEditingId(interviewer.id);
        setFormData({
            name: interviewer.name,
            email: interviewer.email,
            role: interviewer.role || "",
        });
        setDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this interviewer?")) return;
        
        try {
            await fetch(`/api/interviewers/${id}`, { method: "DELETE" });
            toast.success("Interviewer deleted");
            fetchInterviewers();
        } catch (error) {
            console.error("Error deleting interviewer:", error);
            toast.error("Failed to delete interviewer");
        }
    };

    const copyCalendarLink = (slug: string) => {
        const link = `${window.location.origin}/schedule/${slug}`;
        navigator.clipboard.writeText(link);
        toast.success("Calendar link copied to clipboard");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Interviewers</h1>
                    <p className="text-muted-foreground">
                        Manage interviewers and their shareable calendar links
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        setEditingId(null);
                        setFormData({ name: "", email: "", role: "" });
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Interviewer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit" : "Add"} Interviewer</DialogTitle>
                            <DialogDescription>
                                {editingId ? "Update interviewer details" : "Add a new interviewer to the system"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role (Optional)</Label>
                                <Input
                                    id="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    placeholder="Technical Lead, HR, etc."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">
                                    {editingId ? "Save Changes" : "Add Interviewer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : interviewers.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No interviewers yet</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            Add your first interviewer to start scheduling interviews
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>All Interviewers</CardTitle>
                        <CardDescription>
                            {interviewers.length} interviewer{interviewers.length !== 1 ? "s" : ""} in the system
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Stats</TableHead>
                                    <TableHead>Calendar Link</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {interviewers.map((interviewer) => (
                                    <TableRow key={interviewer.id}>
                                        <TableCell className="font-medium">{interviewer.name}</TableCell>
                                        <TableCell>{interviewer.email}</TableCell>
                                        <TableCell>
                                            {interviewer.role ? (
                                                <Badge variant="secondary">{interviewer.role}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    {interviewer._count.availability_slots} slots
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {interviewer._count.bookings} bookings
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyCalendarLink(interviewer.calendar_slug)}
                                                className="text-xs"
                                            >
                                                <Link2 className="mr-1 h-3 w-3" />
                                                /schedule/{interviewer.calendar_slug}
                                                <Copy className="ml-2 h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(interviewer)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(interviewer.id)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
