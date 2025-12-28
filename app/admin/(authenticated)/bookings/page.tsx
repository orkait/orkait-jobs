"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Booking {
    id: number;
    candidate_name: string;
    candidate_email: string;
    booked_date: Date | string;
    booked_start_time: string;
    booked_end_time: string;
    status: string;
    slot_number: number;
    admin_notes?: string;
    interviewer: {
        id: number;
        name: string;
        email: string;
    };
    slot: {
        slot_duration: number;
    };
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        loadBookings();
    }, [statusFilter]);

    async function loadBookings() {
        setLoading(true);
        try {
            const url = statusFilter === "all"
                ? "/api/bookings"
                : `/api/bookings?status=${statusFilter}`;
            
            const res = await fetch(url);
            const data = await res.json();
            setBookings(data);
        } catch (error) {
            console.error("Error loading bookings:", error);
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(bookingId: number, newStatus: string) {
        try {
            const res = await fetch("/api/bookings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: bookingId, status: newStatus }),
            });

            if (res.ok) {
                loadBookings();
            } else {
                const error = await res.json();
                alert(error.error || "Failed to update booking");
            }
        } catch (error) {
            console.error("Error updating booking:", error);
            alert("Failed to update booking");
        }
    }

    function formatTime(time: string): string {
        // Times now come as "HH:MM" strings from API
        return time;
    }

    function formatDate(date: Date | string): string {
        return format(new Date(date), "MMM dd, yyyy");
    }

    function getStatusBadge(status: string) {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            pending: { variant: "secondary", icon: AlertCircle, label: "Pending" },
            confirmed: { variant: "default", icon: CheckCircle, label: "Confirmed" },
            cancelled: { variant: "destructive", icon: XCircle, label: "Cancelled" },
            completed: { variant: "outline", icon: CheckCircle, label: "Completed" },
        };

        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Booking Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage and track all interview bookings
                </p>
            </div>

            <div className="mb-6 flex gap-2">
                {["all", "pending", "confirmed", "cancelled", "completed"].map((status) => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        onClick={() => setStatusFilter(status)}
                        size="sm"
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : bookings.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                        <p className="text-muted-foreground">
                            {statusFilter === "all"
                                ? "No bookings have been made yet"
                                : `No ${statusFilter} bookings found`}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => (
                        <Card key={booking.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {booking.candidate_name}
                                            {getStatusBadge(booking.status)}
                                        </CardTitle>
                                        <CardDescription className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-4 w-4" />
                                                {booking.candidate_email}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                {booking.interviewer.name}
                                            </span>
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(booking.booked_date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Time</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {formatTime(booking.booked_start_time)} -{" "}
                                            {formatTime(booking.booked_end_time)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Duration</p>
                                        <p className="font-medium">{booking.slot.slot_duration} min</p>
                                    </div>
                                </div>

                                {booking.status === "pending" && (
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            size="sm"
                                            onClick={() => updateStatus(booking.id, "confirmed")}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => updateStatus(booking.id, "cancelled")}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}

                                {booking.status === "confirmed" && (
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatus(booking.id, "completed")}
                                        >
                                            Mark as Completed
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => updateStatus(booking.id, "cancelled")}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
