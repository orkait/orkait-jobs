"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationDetails } from "./ApplicationDetails";
import { toggleApplicationBookmark } from "@/app/actions/application-actions";
import { toast } from "sonner";
import { Star, StarOff, Search } from "lucide-react";

import { ApplicationWithJob } from "@/types";

interface ApplicationListProps {
    applications: ApplicationWithJob[];
}

export function ApplicationList({ applications }: ApplicationListProps) {
    const [selectedApp, setSelectedApp] = useState<ApplicationWithJob | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const handleRowClick = (app: ApplicationWithJob) => {
        setSelectedApp(app);
        setSheetOpen(true);
    };

    const handleBookmarkToggle = async (e: React.MouseEvent, app: ApplicationWithJob) => {
        e.stopPropagation();
        const result = await toggleApplicationBookmark(app.id, app.is_bookmarked || false);
        if (result.success) {
            toast.success(app.is_bookmarked ? "Bookmark removed" : "Bookmarked");
        } else {
            toast.error("Failed to toggle bookmark");
        }
    };

    const filteredApplications = applications.filter(app => {
        let matchesStatus = true;
        if (statusFilter === "bookmarked") {
            matchesStatus = app.is_bookmarked === true;
        } else if (statusFilter !== "all") {
            matchesStatus = app.status === statusFilter;
        }

        const matchesSearch = searchQuery === "" || 
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                        <TabsTrigger value="hired">Hired</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Role Applied For</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Resume</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredApplications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No applications found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredApplications.map((app) => (
                                <TableRow 
                                    key={app.id} 
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleRowClick(app)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => handleBookmarkToggle(e, app)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {app.is_bookmarked ? (
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            ) : (
                                                <StarOff className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">{app.name}</TableCell>
                                    <TableCell>
                                        {app.job_title ? (
                                            <Badge variant="outline">{app.job_title}</Badge>
                                        ) : (
                                            <Badge variant="secondary">General Application</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{app.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            app.status === 'rejected' ? 'destructive' : 
                                            app.status === 'hired' ? 'default' : 
                                            'secondary'
                                        } className="capitalize">
                                            {app.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell suppressHydrationWarning>
                                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {app.resume_url ? (
                                            <span className="text-sm text-muted-foreground">Available</span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">No Resume</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ApplicationDetails 
                application={selectedApp}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </div>
    );
}
