"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateApplicationStatus } from "@/app/actions/application-actions";
import { toast } from "sonner";
import { ExternalLink, Mail, Phone, Linkedin, Globe, PanelLeft, X } from "lucide-react";
import Link from "next/link";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ApplicationWithJob } from "@/types";

interface ApplicationDetailsProps {
    application: ApplicationWithJob | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApplicationDetails({ application, open, onOpenChange }: ApplicationDetailsProps) {
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(application?.status ?? "pending");

    if (!application) return null;

    const handleStatusChange = async (status: string) => {
        setCurrentStatus(status); // Update UI immediately
        const result = await updateApplicationStatus(application.id, status);
        if (result.success) {
            toast.success(`Application marked as ${status}`);
        } else {
            toast.error("Failed to update status");
            setCurrentStatus(application.status ?? "pending"); // Revert on error
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] md:max-w-7xl h-[90vh] overflow-hidden flex flex-col p-6">
                <DialogHeader className="shrink-0 mb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 flex items-center gap-3">
                            <div>
                                <DialogTitle className="text-2xl font-bold">{application.name}</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Applied for <span className="font-semibold text-foreground">{application.job_title || "General Application"}</span>
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={
                                application.status === 'rejected' ? 'destructive' : 
                                application.status === 'hired' ? 'default' : 
                                'secondary'
                            } className="text-sm capitalize shrink-0">
                                {application.status}
                            </Badge>
                            <DialogClose className="rounded-full h-8 w-8 border-2 hover:bg-muted flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </DialogClose>
                        </div>
                    </div>
                </DialogHeader>
                
                <ResizablePanelGroup orientation="horizontal" className="flex-1 h-full min-h-0 border rounded-lg overflow-hidden">
                    {/* Left Panel - Details and Actions */}
                    <ResizablePanel 
                        defaultSize={300} 
                        minSize={0} 
                        collapsible={true} 
                        collapsedSize={0} 
                        maxSize={300}
                        onResize={(size) => setIsLeftPanelCollapsed(Number(size) === 0)}
                        className={`flex flex-col h-full bg-background transition-all duration-300 ease-in-out ${isLeftPanelCollapsed ? 'py-4' : ''}`}
                    >
                        <div className="flex flex-col h-full overflow-hidden p-4">
                            <div className="shrink-0 space-y-2 mb-6">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Update Status</h4>
                                <Select value={currentStatus} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-gray-400" />
                                                Pending
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="reviewed">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                Reviewed
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="hired">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                                Hired
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="rejected">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                                Rejected
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                                {/* Contact Info */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Contact Info
                                    </h4>
                                    <div className="card border rounded-lg p-4 bg-muted/5 space-y-3 text-sm">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <a href={`mailto:${application.email}`} className="hover:underline truncate font-medium">{application.email}</a>
                                        </div>
                                        {application.phone && (
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <span>{application.phone}</span>
                                            </div>
                                        )}
                                        {application.linkedin_url && (
                                            <div className="flex items-center gap-3">
                                                <Linkedin className="w-4 h-4 text-muted-foreground shrink-0" />
                                                <Link href={application.linkedin_url} target="_blank" className="hover:underline truncate text-blue-600 dark:text-blue-400">LinkedIn Profile</Link>
                                            </div>
                                        )}
                                        {application.portfolio_links && application.portfolio_links.length > 0 && (
                                            <div className="flex items-start gap-3">
                                                <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    {application.portfolio_links.map((link: string, i: number) => (
                                                        <Link key={i} href={link} target="_blank" className="hover:underline truncate text-sm text-blue-600 dark:text-blue-400">{link}</Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Application Details */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Application Details</h4>
                                    <div className="card border rounded-lg p-4 bg-muted/5 space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <span className="text-muted-foreground w-24">Applied On:</span>
                                            <span className="font-medium" suppressHydrationWarning>
                                                {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            </div>
                                            <span className="text-muted-foreground w-24">Status:</span>
                                            <span className="capitalize font-medium">{application.status}</span>
                                        </div>
                                        {application.referred_by && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                </div>
                                                <span className="text-muted-foreground w-24">Referred By:</span>
                                                <span className="font-medium">{application.referred_by}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="w-4 -ml-2 bg-transparent z-10 flex items-center justify-center cursor-col-resize hover:bg-muted/50 transition-colors focus:outline-none" />

                    {/* Right Panel - Resume */}
                    <ResizablePanel defaultSize={60} minSize={30} className="flex flex-col h-full bg-background">
                        <div className="flex flex-col h-full pl-0">
                            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Resume Preview</h4>
                                {application.resume_url ? (
                                    <Link href={application.resume_url} target="_blank">
                                        <Button variant="outline" size="sm" className="gap-2 h-8">
                                            <ExternalLink className="w-3 h-3" />
                                            Open Original
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                            
                            <div className="flex-1 bg-muted/20 overflow-hidden relative">
                                {application.resume_url ? (
                                    <iframe 
                                        src={application.resume_url} 
                                        className="w-full h-full border-none" 
                                        title="Resume Preview"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                                        <div className="p-4 rounded-full bg-background border">
                                            <ExternalLink className="w-6 h-6 opacity-20" />
                                        </div>
                                        <p>No resume attached</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}
