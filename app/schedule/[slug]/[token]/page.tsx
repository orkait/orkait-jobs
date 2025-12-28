"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, User, Mail, CheckCircle2, AlertCircle, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { getConfig } from "@/lib/config";

// Utility function to generate time slots
function generateTimeSlots(slotDuration: number = 30): string[] {
    const slots: string[] = [];
    const totalMinutesInDay = 24 * 60;
    
    for (let minutes = 0; minutes < totalMinutesInDay; minutes += slotDuration) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
    }
    
    return slots;
}

// Utility function to format duration for display
function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    if (remainingMins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} min`;
    }
}

// Dynamic time slots - will be updated based on slot duration

interface InterviewerInfo {
    id: number;
    name: string;
    role: string | null;
}

interface SlotInfo {
    id: number;
    start_time: string;
    end_time: string;
    slot_duration: number;
    meeting_type?: string;
    meeting_title?: string;
    meeting_description?: string;
}

export default function SecureBookingPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
    const { slug, token } = use(params);
    const [interviewer, setInterviewer] = useState<InterviewerInfo | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<Set<string>>(new Set());
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [timeSlots, setTimeSlots] = useState<string[]>(generateTimeSlots(30)); // Default 30-min slots
    const [slotDuration, setSlotDuration] = useState<number>(30);
    const [dateRangeDays, setDateRangeDays] = useState<number>(7);
    const [currentSlotInfo, setCurrentSlotInfo] = useState<SlotInfo | null>(null);
    const [customTitle, setCustomTitle] = useState<string | null>(null);
    const [allowMultipleSlots, setAllowMultipleSlots] = useState(false);
    const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);

    // States
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkError, setLinkError] = useState<string | null>(null);
    
    // Form & Dialog
    const [formData, setFormData] = useState({ name: "", email: "" });
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookingComplete, setBookingComplete] = useState(false);

    // 1. Validate Token on Mount
    useEffect(() => {
        validateToken();
        loadConfiguration();
    }, [token]);

    const loadConfiguration = async () => {
        try {
            const dateRange = await getConfig('date_range_days');
            setDateRangeDays(dateRange || 7);
        } catch (error) {
            console.error("Error loading configuration:", error);
            setDateRangeDays(7); // fallback to default
        }
    };

    const validateToken = async () => {
        try {
            const res = await fetch(`/api/booking-links/${token}`);
            const data = await res.json();
            
            if (!res.ok || !data.valid) {
                setLinkError(data.error || "Invalid or expired link");
                setValidating(false);
                return;
            }
            
            // Verify slug matches
            if (data.interviewer.calendar_slug !== slug) {
                setLinkError("Link does not match the interviewer");
                setValidating(false);
                return;
            }
            
            setInterviewer(data.interviewer);
            setCustomTitle(data.custom_title || null);
            setAllowMultipleSlots(data.allow_multiple_slots || false);
            setValidating(false);
        } catch (error) {
            console.error("Error validating token:", error);
            setLinkError("Failed to validate link");
            setValidating(false);
        }
    };

    // 2. Fetch Availability when Date Changes
    useEffect(() => {
        if (interviewer && selectedDate && !linkError) {
            fetchAvailability();
        }
    }, [interviewer, selectedDate, linkError]);

    const fetchAvailability = async () => {
        if (!selectedDate || !interviewer) return;
        
        setLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const res = await fetch(
                `/api/availability?interviewer_id=${interviewer.id}&start_date=${dateStr}&end_date=${dateStr}`
            );
            const slots = await res.json();

            // Store slots for later use when creating bookings
            setAvailabilitySlots(slots);

            // Get bookings for this date
            const bookingsRes = await fetch(
                `/api/bookings?interviewer_id=${interviewer.id}&date=${dateStr}`
            );
            const bookings = await bookingsRes.json();
            
            // Determine slot duration from available slots and capture meeting info
            let currentSlotDuration = 30; // default
            if (slots.length > 0 && slots[0].slot_duration) {
                currentSlotDuration = slots[0].slot_duration;
                // Set current slot info for display
                setCurrentSlotInfo({
                    id: slots[0].id,
                    start_time: slots[0].start_time,
                    end_time: slots[0].end_time,
                    slot_duration: slots[0].slot_duration,
                    meeting_type: slots[0].meeting_type,
                    meeting_title: slots[0].meeting_title,
                    meeting_description: slots[0].meeting_description
                });
            }
            
            // Update time slots based on duration
            setSlotDuration(currentSlotDuration);
            const currentTimeSlots = generateTimeSlots(currentSlotDuration);
            setTimeSlots(currentTimeSlots);
            
            // Build set of available times
            const available = new Set<string>();
            
            slots.forEach((slot: any) => {
                // Times now come as "HH:MM" strings from API
                const startTime = slot.start_time;
                const endTime = slot.end_time;

                const startIdx = currentTimeSlots.indexOf(startTime);
                const endIdx = currentTimeSlots.indexOf(endTime);

                for (let i = startIdx; i >= 0 && i < endIdx && i < currentTimeSlots.length; i++) {
                    available.add(currentTimeSlots[i]);
                }
            });
            
            // Remove booked times
            bookings.forEach((booking: any) => {
                if (booking.status === 'cancelled') return;
                // Times now come as "HH:MM" strings from API
                const startTime = booking.booked_start_time;
                const endTime = booking.booked_end_time;

                const startIdx = currentTimeSlots.indexOf(startTime);
                const endIdx = currentTimeSlots.indexOf(endTime);

                for (let i = startIdx; i >= 0 && i < endIdx && i < currentTimeSlots.length; i++) {
                    available.delete(currentTimeSlots[i]);
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
            // If multiple slots not allowed, replace selection with single slot
            if (!allowMultipleSlots) {
                setSelectedSlots([time]);
            } else {
                setSelectedSlots([...selectedSlots, time].sort());
            }
        }
    };

    // 3. Initiate Booking (Open Confirmation)
    const handleInitiateBooking = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedSlots.length === 0) {
            toast.error("Please select at least one time slot");
            return;
        }
        
        setConfirmDialogOpen(true);
    };

    // Helper function to find slot_id for a time range
    const findSlotIdForTime = (startTime: string): number | null => {
        for (const slot of availabilitySlots) {
            const slotStart = slot.start_time;
            const slotEnd = slot.end_time;

            // Check if the booking time falls within this availability slot
            if (startTime >= slotStart && startTime < slotEnd) {
                return slot.id;
            }
        }
        return null;
    };

    // 4. Confirm & Execute Booking
    const handleConfirmBooking = async () => {
        setSubmitting(true);
        try {
            // Group consecutive slots
            const sorted = [...selectedSlots].sort();
            const ranges: Array<{ start: string; end: string }> = [];
            
            let rangeStart = sorted[0];
            let prevIdx = timeSlots.indexOf(sorted[0]);
            
            for (let i = 1; i <= sorted.length; i++) {
                const currentTime = sorted[i];
                const currentIdx = currentTime ? timeSlots.indexOf(currentTime) : -1;
                
                if (currentIdx !== prevIdx + 1 || i === sorted.length) {
                    const endIdx = prevIdx + 1;
                    ranges.push({
                        start: rangeStart,
                        end: endIdx < timeSlots.length ? timeSlots[endIdx] : "23:59"
                    });
                    if (currentTime) rangeStart = currentTime;
                }
                if (currentTime) prevIdx = timeSlots.indexOf(currentTime);
            }
            
            const dateStr = format(selectedDate!, "yyyy-MM-dd");
            
            // A. Create bookings
            for (const range of ranges) {
                const slotId = findSlotIdForTime(range.start);

                if (!slotId) {
                    throw new Error("Could not find availability slot for selected time");
                }

                const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        slot_id: slotId,
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
            
            // B. Mark link as used
            await fetch(`/api/booking-links/${token}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email })
            });
            
            setBookingComplete(true);
            setConfirmDialogOpen(false);
            toast.success("Booking confirmed!");
            
        } catch (error) {
            console.error("Error booking:", error);
            toast.error(error instanceof Error ? error.message : "Failed to book slots");
            setConfirmDialogOpen(false);
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

    // --- RENDER STATES ---

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (linkError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                    <CardContent className="flex flex-col items-center py-12">
                        <AlertCircle className="h-16 w-16 text-destructive mb-6" />
                        <h2 className="text-2xl font-bold text-destructive mb-2">Invalid Link</h2>
                        <p className="text-muted-foreground text-center">
                            {linkError}
                        </p>
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            This booking link may have expired or already been used.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (bookingComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full border-green-500/20 shadow-lg animate-in fade-in zoom-in duration-300">
                    <CardContent className="flex flex-col items-center py-12">
                        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-2">Booking Confirmed!</h2>
                        <p className="text-muted-foreground text-center">
                            Your {currentSlotInfo?.meeting_type || 'meeting'} with {interviewer?.name} is set.
                        </p>
                        
                        <div className="mt-8 w-full space-y-3">
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm">Date</span>
                                </div>
                                <span className="text-sm">{selectedDate && format(selectedDate, "MMMM d, yyyy")}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm">Time</span>
                                </div>
                                <span className="text-sm">
                                    {selectedSlots.length > 0 && `${selectedSlots[0]} - ${
                                        (() => {
                                            const last = selectedSlots[selectedSlots.length - 1];
                                            const idx = timeSlots.indexOf(last);
                                            return timeSlots[idx + 1] || "23:59";
                                        })()
                                    }`}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <Badge variant="outline" className="mb-2 bg-background">Secure Booking</Badge>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {customTitle
                            ? customTitle
                            : currentSlotInfo?.meeting_title && currentSlotInfo.meeting_title !== 'Interview'
                                ? `Book ${currentSlotInfo.meeting_title} with ${interviewer?.name}`
                                : currentSlotInfo?.meeting_type && currentSlotInfo.meeting_type !== 'interview'
                                    ? `Book ${currentSlotInfo.meeting_type.charAt(0).toUpperCase() + currentSlotInfo.meeting_type.slice(1)} with ${interviewer?.name}`
                                    : `Schedule with ${interviewer?.name}`
                        }
                    </h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        {currentSlotInfo?.meeting_description && currentSlotInfo.meeting_description !== 'Job interview session'
                            ? currentSlotInfo.meeting_description
                            : allowMultipleSlots
                                ? "Please select your preferred time slots. This link will expire after booking."
                                : "Please select your preferred time slot. This link will expire after booking."}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar Selection */}
                    <Card className="border-border shadow-sm">
                        <CardHeader>
                            <CardTitle>Select Date</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const maxDate = addDays(today, dateRangeDays);
                                    return date < today || date > maxDate;
                                }}
                                className="p-2"
                            />
                        </CardContent>
                    </Card>

                    {/* Time Selection */}
                    <Card className="lg:col-span-2 border-border shadow-sm">
                        <CardHeader>
                            <CardTitle>
                                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
                            </CardTitle>
                            <CardDescription>
                                {availableSlots.size > 0
                                    ? allowMultipleSlots
                                        ? "Select consecutive slots for your meeting duration"
                                        : "Select a single time slot"
                                    : "Choose a date to see availability"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : !selectedDate ? (
                                <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    Select a date to see available times
                                </div>
                            ) : availableSlots.size === 0 ? (
                                <div className="text-center py-16 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    No availability for this date
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Available Slots ({formatDuration(slotDuration)} each)</Label>
                                            <span className="text-xs text-muted-foreground">
                                                {selectedSlots.length} selected ({selectedSlots.length * slotDuration} min)
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {timeSlots.map((time) => {
                                                const isAvailable = availableSlots.has(time);
                                                const isSelected = selectedSlots.includes(time);
                                                const isPast = isPastTime(time);
                                                
                                                if (!isAvailable) return null;
                                                
                                                return (
                                                    <Button
                                                        key={time}
                                                        size="sm"
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={`h-9 text-xs transition-all ${
                                                            isPast ? "opacity-40" : ""
                                                        } ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                                        onClick={() => !isPast && toggleSlot(time)}
                                                        disabled={isPast}
                                                    >
                                                        {time}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border-t pt-6 mt-6">
                                        <h3 className="text-sm font-medium mb-4">Your Details</h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Full Name *</Label>
                                                    <Input
                                                        id="name"
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        placeholder="John Doe"
                                                        className="bg-background"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email Address *</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        placeholder="john@example.com"
                                                        className="bg-background"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <Button
                                                onClick={handleInitiateBooking}
                                                className="w-full h-11 text-base"
                                                disabled={selectedSlots.length === 0 || !formData.name || !formData.email}
                                            >
                                                Review & Book {selectedSlots.length > 0 ? `(${selectedSlots.length * slotDuration} min)` : ""}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Booking</DialogTitle>
                        <DialogDescription>
                            Please review your {currentSlotInfo?.meeting_type || 'meeting'} details before confirming.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                            {currentSlotInfo?.meeting_title && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Meeting Type:</span>
                                    <span className="font-medium">{currentSlotInfo.meeting_title}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{currentSlotInfo?.meeting_type === 'interview' ? 'Interviewer' : 'Host'}:</span>
                                <span className="font-medium">{interviewer?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-medium">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time:</span>
                                <span className="font-medium">
                                    {selectedSlots.length > 0 && `${selectedSlots[0]} - ${
                                        (() => {
                                            const last = selectedSlots[selectedSlots.length - 1];
                                            const idx = timeSlots.indexOf(last);
                                            return timeSlots[idx + 1] || "23:59";
                                        })()
                                    }`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-medium">{selectedSlots.length * slotDuration} minutes</span>
                            </div>
                            <div className="border-t pt-3 mt-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span className="font-medium">{formData.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium">{formData.email}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-md text-xs">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <p>Warning: This is a single-use link. Once you confirm, this link will expire and cannot be used again.</p>
                        </div>
                    </div>
                    
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                            Go Back
                        </Button>
                        <Button onClick={handleConfirmBooking} disabled={submitting}>
                            {submitting ? "Confirming..." : "Confirm Booking"}
                            {!submitting && <ArrowRight className="h-4 w-4 ml-2" />}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
