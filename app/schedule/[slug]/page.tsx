"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// 30-minute time slots (48 total)
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

interface InterviewerInfo {
    id: number;
    name: string;
    role: string | null;
}

export default function PublicSchedulePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [interviewer, setInterviewer] = useState<InterviewerInfo | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<Set<string>>(new Set());
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "" });
    const [submitting, setSubmitting] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);

    useEffect(() => {
        fetchInterviewer();
    }, [slug]);

    useEffect(() => {
        if (interviewer && selectedDate) {
            fetchAvailability();
        }
    }, [interviewer, selectedDate]);

    const fetchInterviewer = async () => {
        try {
            const res = await fetch("/api/interviewers");
            const interviewers = await res.json();
            const found = interviewers.find((i: any) => i.calendar_slug === slug);
            
            if (!found) {
                setError("Interviewer not found");
                setLoading(false);
                return;
            }
            
            setInterviewer(found);
        } catch (err) {
            console.error("Error:", err);
            setError("Failed to load calendar");
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        if (!selectedDate || !interviewer) return;
        
        setLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const res = await fetch(
                `/api/availability?interviewer_id=${interviewer.id}&start_date=${dateStr}&end_date=${dateStr}`
            );
            const slots = await res.json();
            
            // Get bookings for this date
            const bookingsRes = await fetch(
                `/api/bookings?interviewer_id=${interviewer.id}&date=${dateStr}`
            );
            const bookings = await bookingsRes.json();
            
            // Build set of available times
            const available = new Set<string>();
            
            slots.forEach((slot: any) => {
                const start = new Date(slot.start_time);
                const end = new Date(slot.end_time);
                const startTime = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
                const endTime = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
                
                const startIdx = TIME_SLOTS.indexOf(startTime);
                const endIdx = TIME_SLOTS.indexOf(endTime);
                
                for (let i = startIdx; i >= 0 && i < endIdx && i < TIME_SLOTS.length; i++) {
                    available.add(TIME_SLOTS[i]);
                }
            });
            
            // Remove booked times
            bookings.forEach((booking: any) => {
                if (booking.status === 'cancelled') return;
                
                const start = new Date(booking.booked_start_time);
                const end = new Date(booking.booked_end_time);
                const startTime = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
                const endTime = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
                
                const startIdx = TIME_SLOTS.indexOf(startTime);
                const endIdx = TIME_SLOTS.indexOf(endTime);
                
                for (let i = startIdx; i >= 0 && i < endIdx && i < TIME_SLOTS.length; i++) {
                    available.delete(TIME_SLOTS[i]);
                }
            });
            
            setAvailableSlots(available);
        } catch (err) {
            console.error("Error fetching availability:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSlot = (time: string) => {
        const idx = selectedSlots.indexOf(time);
        if (idx >= 0) {
            setSelectedSlots(selectedSlots.filter(t => t !== time));
        } else {
            setSelectedSlots([...selectedSlots, time].sort());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedSlots.length === 0) {
            toast.error("Please select at least one time slot");
            return;
        }
        
        if (!formData.name || !formData.email) {
            toast.error("Please enter your name and email");
            return;
        }
        
        setSubmitting(true);
        
        try {
            // Group consecutive slots
            const sorted = [...selectedSlots].sort();
            const ranges: Array<{ start: string; end: string }> = [];
            
            let rangeStart = sorted[0];
            let prevIdx = TIME_SLOTS.indexOf(sorted[0]);
            
            for (let i = 1; i <= sorted.length; i++) {
                const currentTime = sorted[i];
                const currentIdx = currentTime ? TIME_SLOTS.indexOf(currentTime) : -1;
                
                if (currentIdx !== prevIdx + 1 || i === sorted.length) {
                    const endIdx = prevIdx + 1;
                    ranges.push({
                        start: rangeStart,
                        end: endIdx < TIME_SLOTS.length ? TIME_SLOTS[endIdx] : "23:59"
                    });
                    if (currentTime) rangeStart = currentTime;
                }
                if (currentTime) prevIdx = TIME_SLOTS.indexOf(currentTime);
            }
            
            const dateStr = format(selectedDate!, "yyyy-MM-dd");
            
            // Create bookings for each range
            for (const range of ranges) {
                const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        interviewer_id: interviewer!.id,
                        candidate_name: formData.name,
                        candidate_email: formData.email,
                        booked_date: dateStr,
                        booked_start_time: range.start,
                        booked_end_time: range.end,
                    })
                });
                
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || "Failed to book");
                }
            }
            
            setBookingComplete(true);
            toast.success("Booking confirmed!");
        } catch (error) {
            console.error("Error booking:", error);
            toast.error(error instanceof Error ? error.message : "Failed to book slots");
        } finally {
            setSubmitting(false);
        }
    };

    const isPastTime = (time: string): boolean => {
        if (!selectedDate) return false;
        const today = format(new Date(), "yyyy-MM-dd");
        const selected = format(selectedDate, "yyyy-MM-dd");
        if (selected !== today) return false;
        
        const now = new Date().toTimeString().slice(0, 5);
        return time < now;
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="flex flex-col items-center py-12">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h2 className="text-xl font-semibold">{error}</h2>
                        <p className="text-muted-foreground text-center mt-2">
                            The calendar you're looking for doesn't exist or has been removed.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (bookingComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="flex flex-col items-center py-12">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-semibold text-center">Booking Confirmed!</h2>
                        <p className="text-muted-foreground text-center mt-2">
                            Your interview with {interviewer?.name} has been booked.
                        </p>
                        <div className="mt-6 w-full space-y-2">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span className="text-sm font-medium">Date</span>
                                <span className="text-sm">{selectedDate && format(selectedDate, "MMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span className="text-sm font-medium">Duration</span>
                                <span className="text-sm">{selectedSlots.length * 30} minutes</span>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground text-center mt-6">
                            A confirmation email will be sent to {formData.email}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">
                        Book Session with {interviewer?.name || "..."}
                    </h1>
                    {interviewer?.role && (
                        <Badge variant="secondary" className="text-sm">{interviewer.role}</Badge>
                    )}
                    <p className="text-muted-foreground">
                        Select your preferred time slots (30-minute intervals)
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Date</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    {/* Time Slots & Form */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>
                                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : !selectedDate ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    Select a date to see available times
                                </div>
                            ) : availableSlots.size === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No availability for this date
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <p className="text-sm font-medium mb-3">
                                            Available Times • {selectedSlots.length} selected ({selectedSlots.length * 30} min)
                                        </p>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                            {TIME_SLOTS.map((time) => {
                                                const isAvailable = availableSlots.has(time);
                                                const isSelected = selectedSlots.includes(time);
                                                const isPast = isPastTime(time);
                                                
                                                if (!isAvailable) return null;
                                                
                                                return (
                                                    <Button
                                                        key={time}
                                                        size="sm"
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={`h-10 ${isPast ? "opacity-40" : ""}`}
                                                        onClick={() => !isPast && toggleSlot(time)}
                                                        disabled={isPast}
                                                    >
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {time}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                Your Name *
                                            </Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                Your Email *
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="john@example.com"
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={selectedSlots.length === 0 || submitting}
                                        >
                                            {submitting ? "Booking..." : `Book ${selectedSlots.length} Slot${selectedSlots.length !== 1 ? 's' : ''}`}
                                        </Button>
                                    </form>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
