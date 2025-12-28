"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock, Save, Link as LinkIcon, Copy, Check, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { getConfig } from "@/lib/config";
import type { Interviewer, AvailabilitySlot, Booking, MeetingType } from "@/types/api";


// Utility function to generate time slots based on duration
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
        return `${minutes} mins`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    if (remainingMins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMins} mins`;
    }
}

type ExistingSlot = AvailabilitySlot;

export default function CalendarPage() {
    const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
    const [selectedInterviewer, setSelectedInterviewer] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Duration and existing slots management
    const [slotDuration, setSlotDuration] = useState<number>(30);
    const [timeSlots, setTimeSlots] = useState<string[]>(generateTimeSlots(30));
    const [existingSlots, setExistingSlots] = useState<ExistingSlot[]>([]);
    const [bookedTimeSlots, setBookedTimeSlots] = useState<Set<string>>(new Set());
    
    // Meeting type management
    const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
    const [selectedMeetingType, setSelectedMeetingType] = useState<string>("interview");
    const [meetingTitle, setMeetingTitle] = useState<string>("");
    const [meetingDescription, setMeetingDescription] = useState<string>("");
    
    // Slot marking system - tracks which slots are marked with which meeting type
    const [slotMarks, setSlotMarks] = useState<Map<string, string>>(new Map());
    const [warningDialog, setWarningDialog] = useState<{
        open: boolean;
        slotId: number;
        newDuration: number;
        existingBookings: number;
        bookings: any[];
    }>({
        open: false,
        slotId: 0,
        newDuration: 0,
        existingBookings: 0,
        bookings: []
    });
    
    // Configuration state
    const [dateRangeDays, setDateRangeDays] = useState<number>(7);
    
    // Link generation state
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [generatedLink, setGeneratedLink] = useState("");
    const [linkExpiry, setLinkExpiry] = useState("");
    const [generatingLink, setGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [customLinkTitle, setCustomLinkTitle] = useState("");
    const [allowMultipleSlots, setAllowMultipleSlots] = useState(false);

    useEffect(() => {
        fetchInterviewers();
        loadConfiguration();
        loadMeetingTypes();
    }, []);

    const loadConfiguration = async () => {
        try {
            const dateRange = await getConfig('date_range_days');
            setDateRangeDays(dateRange || 7);
        } catch (error) {
            console.error("Error loading configuration:", error);
            setDateRangeDays(7); // fallback to default
        }
    };

    const loadMeetingTypes = async () => {
        try {
            const meetingTypesConfig = await getConfig('meeting_types');
            const defaultTypes: MeetingType[] = [
                { id: 'interview', name: 'Interview', description: 'Job interview session', default_duration: 60, color: '#3B82F6' },
                { id: 'consultation', name: 'Consultation', description: 'Client consultation meeting', default_duration: 45, color: '#10B981' },
                { id: 'demo', name: 'Demo', description: 'Product demo session', default_duration: 30, color: '#F59E0B' },
                { id: 'enquiry', name: 'Enquiry', description: 'General enquiry meeting', default_duration: 30, color: '#8B5CF6' }
            ];
            setMeetingTypes(meetingTypesConfig || defaultTypes);
            
            // Save default types if none exist
            if (!meetingTypesConfig) {
                await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: 'meeting_types',
                        value: defaultTypes,
                        description: 'Available meeting types for scheduling'
                    })
                });
            }
        } catch (error) {
            console.error("Error loading meeting types:", error);
            // Use default types on error
            setMeetingTypes([
                { id: 'interview', name: 'Interview', description: 'Job interview session', default_duration: 60, color: '#3B82F6' }
            ]);
        }
    };

    useEffect(() => {
        if (selectedInterviewer && selectedDate) {
            // Clear marks when changing date/interviewer
            setSlotMarks(new Map());
            fetchAvailability();
        }
    }, [selectedInterviewer, selectedDate]);

    const fetchInterviewers = async () => {
        try {
            const res = await fetch("/api/interviewers");
            const data = await res.json();
            setInterviewers(data);
            if (data.length > 0) {
                setSelectedInterviewer(data[0].id.toString());
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const fetchAvailability = async () => {
        if (!selectedDate) return;
        
        setLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const res = await fetch(
                `/api/availability?interviewer_id=${selectedInterviewer}&start_date=${dateStr}&end_date=${dateStr}`
            );
            const slots = await res.json();

            // Fetch bookings for this date to mark booked time slots
            const bookingsRes = await fetch(
                `/api/bookings?interviewer_id=${selectedInterviewer}&start_date=${dateStr}&end_date=${dateStr}`
            );
            const bookings = await bookingsRes.json();

            // Set existing slots for management
            setExistingSlots(slots);
            
            // Determine slot duration from existing slots
            let currentSlotDuration = 30; // default
            if (slots.length > 0 && slots[0].slot_duration) {
                currentSlotDuration = slots[0].slot_duration;
            }
            
            // Update time slots based on duration
            setSlotDuration(currentSlotDuration);
            const currentTimeSlots = generateTimeSlots(currentSlotDuration);
            setTimeSlots(currentTimeSlots);
            
            // Build set of available times from backend slots
            const availableTimes = new Set<string>();
            
            slots.forEach((slot: any) => {
                // Times now come as "HH:MM" strings from API
                const startTime = slot.start_time;
                const endTime = slot.end_time;

                const startIdx = currentTimeSlots.indexOf(startTime);
                const endIdx = currentTimeSlots.indexOf(endTime);

                for (let i = startIdx; i >= 0 && i < endIdx && i < currentTimeSlots.length; i++) {
                    availableTimes.add(currentTimeSlots[i]);
                }
            });
            
            // Load existing slots into selected state so admin can modify them
            setSelectedSlots(availableTimes);
            
            // Populate slot marks from existing slots
            const marks = new Map<string, string>();

            slots.forEach((slot: any) => {
                // Times now come as "HH:MM" strings from API
                const startTime = slot.start_time;
                const endTime = slot.end_time;

                const startIdx = currentTimeSlots.indexOf(startTime);
                const endIdx = currentTimeSlots.indexOf(endTime);

                // Mark all time slots in this availability slot with the meeting type
                for (let i = startIdx; i >= 0 && i < endIdx && i < currentTimeSlots.length; i++) {
                    const timeSlot = currentTimeSlots[i];
                    const meetingType = slot.meeting_type || 'interview';
                    marks.set(timeSlot, meetingType);
                }
            });

            setSlotMarks(marks);

            // Mark time slots that have confirmed bookings
            const bookedSlots = new Set<string>();
            bookings.forEach((booking: any) => {
                // Only mark confirmed bookings (not cancelled or pending)
                if (booking.status === 'cancelled') return;

                const startTime = booking.booked_start_time;
                const endTime = booking.booked_end_time;

                const startIdx = currentTimeSlots.indexOf(startTime);
                const endIdx = currentTimeSlots.indexOf(endTime);

                for (let i = startIdx; i >= 0 && i < endIdx && i < currentTimeSlots.length; i++) {
                    bookedSlots.add(currentTimeSlots[i]);
                }
            });

            setBookedTimeSlots(bookedSlots);
        } catch (error) {
            console.error("Error fetching availability:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSlot = (time: string) => {
        // Don't allow toggling booked slots
        if (bookedTimeSlots.has(time)) {
            toast.error("This time slot has a confirmed booking and cannot be modified");
            return;
        }

        const newSelected = new Set(selectedSlots);
        const newMarks = new Map(slotMarks);

        if (newSelected.has(time)) {
            // Unmark the slot
            newSelected.delete(time);
            newMarks.delete(time);
        } else {
            // Mark the slot with current meeting type
            newSelected.add(time);
            newMarks.set(time, selectedMeetingType);
        }

        setSelectedSlots(newSelected);
        setSlotMarks(newMarks);
    };

    const handleMeetingTypeChange = (meetingTypeId: string) => {
        setSelectedMeetingType(meetingTypeId);
        const meetingType = meetingTypes.find(mt => mt.id === meetingTypeId);
        if (meetingType) {
            setMeetingTitle(meetingType.name);
            setMeetingDescription(meetingType.description || "");
            // Don't auto-change duration
        }
    };

    const handleDurationChange = async (newDuration: number) => {
        // First clear selected slots and markings immediately as duration change invalidates current selection
        setSelectedSlots(new Set());
        setSlotMarks(new Map());
        
        if (existingSlots.length > 0) {
            // Check if any existing slots have bookings
            const slotsWithBookings = existingSlots.filter(slot => slot.bookings && slot.bookings.length > 0);
            
            if (slotsWithBookings.length > 0) {
                // Show warning for the first slot with bookings
                const slot = slotsWithBookings[0];
                try {
                    const res = await fetch("/api/availability", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: slot.id, slot_duration: newDuration }),
                    });

                    const data = await res.json();
                    if (data.requires_confirmation) {
                        setWarningDialog({
                            open: true,
                            slotId: slot.id,
                            newDuration,
                            existingBookings: data.existing_bookings,
                            bookings: data.bookings
                        });
                        return;
                    }
                } catch (error) {
                    console.error("Error checking duration change:", error);
                    toast.error("Failed to check duration change");
                    return;
                }
            }
        }

        // No conflicts, update duration directly
        setSlotDuration(newDuration);
        const newTimeSlots = generateTimeSlots(newDuration);
        setTimeSlots(newTimeSlots);
        
        toast.success(`Duration changed to ${newDuration} minutes. Selected slots cleared.`);
    };

    const confirmDurationChange = async () => {
        try {
            // Update all existing slots to new duration
            for (const slot of existingSlots) {
                await fetch("/api/availability", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        id: slot.id, 
                        slot_duration: warningDialog.newDuration,
                        force_update: true
                    }),
                });
            }

            // Update UI
            setSlotDuration(warningDialog.newDuration);
            const newTimeSlots = generateTimeSlots(warningDialog.newDuration);
            setTimeSlots(newTimeSlots);
            setSelectedSlots(new Set()); // Clear selected slots as duration change invalidates them
            setWarningDialog({ open: false, slotId: 0, newDuration: 0, existingBookings: 0, bookings: [] });
            
            toast.success(`Duration changed to ${warningDialog.newDuration} minutes. Selected slots cleared.`);
            // Small delay to ensure database has been updated, then refresh
            setTimeout(async () => {
                await fetchAvailability();
            }, 100);
        } catch (error) {
            console.error("Error updating duration:", error);
            toast.error("Failed to update duration");
        }
    };

    const handleSlotTypeChange = async (slotId: number, newMeetingType: string) => {
        try {
            const meetingTypeConfig = meetingTypes.find(mt => mt.id === newMeetingType);
            
            const res = await fetch("/api/availability", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: slotId, 
                    meeting_type: newMeetingType,
                    meeting_title: meetingTypeConfig?.name,
                    meeting_description: meetingTypeConfig?.description,
                    force_update: true
                }),
            });

            if (res.ok) {
                toast.success(`Slot updated to ${meetingTypeConfig?.name || newMeetingType}`);
                // Refresh the slots
                setTimeout(async () => {
                    await fetchAvailability();
                }, 100);
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to update slot type");
            }
        } catch (error) {
            console.error("Error updating slot type:", error);
            toast.error("Failed to update slot type");
        }
    };

    const handleDeleteSlot = async (slotId: number) => {
        const slot = existingSlots.find(s => s.id === slotId);
        if (slot && slot.bookings && slot.bookings.length > 0) {
            toast.error("Cannot delete slot with active bookings");
            return;
        }

        if (!confirm("Are you sure you want to delete this availability slot?")) {
            return;
        }

        try {
            const res = await fetch(`/api/availability?id=${slotId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Slot deleted successfully");
                // Small delay to ensure database has been updated, then refresh
                setTimeout(async () => {
                    await fetchAvailability();
                }, 100);
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to delete slot");
            }
        } catch (error) {
            console.error("Error deleting slot:", error);
            toast.error("Failed to delete slot");
        }
    };

    const saveAvailability = async () => {
        if (!selectedDate) return;
        
        setSaving(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            
            // Delete all existing slots for this date in parallel
            const existing = await fetch(
                `/api/availability?interviewer_id=${selectedInterviewer}&start_date=${dateStr}&end_date=${dateStr}`
            );
            const existingSlots = await existing.json();
            
            if (existingSlots.length > 0) {
                const deletePromises = existingSlots.map((slot: any) => 
                    fetch(`/api/availability?id=${slot.id}`, { method: "DELETE" })
                );
                await Promise.all(deletePromises);
            }
            
            // Group slots by meeting type, then by consecutive ranges within each type
            const slotsByMeetingType = new Map<string, string[]>();
            
            // Group selected slots by their meeting type
            Array.from(selectedSlots).forEach(time => {
                const meetingType = slotMarks.get(time) || 'interview';
                if (!slotsByMeetingType.has(meetingType)) {
                    slotsByMeetingType.set(meetingType, []);
                }
                slotsByMeetingType.get(meetingType)!.push(time);
            });
            
            // Create slots for each meeting type
            const createSlotPromises: Promise<any>[] = [];
            
            for (const [meetingType, times] of slotsByMeetingType) {
                const meetingTypeConfig = meetingTypes.find(mt => mt.id === meetingType);
                const sortedTimes = times.sort();
                const ranges: Array<{ start: string; end: string }> = [];
                
                if (sortedTimes.length > 0) {
                    let rangeStart = sortedTimes[0];
                    let rangeEnd = sortedTimes[0];
                    
                    for (let i = 1; i <= sortedTimes.length; i++) {
                        const currentTime = sortedTimes[i];
                        const prevIdx = timeSlots.indexOf(rangeEnd);
                        const currentIdx = currentTime ? timeSlots.indexOf(currentTime) : -1;
                        
                        // If consecutive, extend the range
                        if (currentIdx === prevIdx + 1) {
                            rangeEnd = currentTime;
                        } else {
                            // End of consecutive sequence - save this range
                            const endIdx = timeSlots.indexOf(rangeEnd) + 1;
                            ranges.push({
                                start: rangeStart,
                                end: endIdx < timeSlots.length ? timeSlots[endIdx] : "23:59"
                            });
                            
                            // Start new range
                            if (currentTime) {
                                rangeStart = currentTime;
                                rangeEnd = currentTime;
                            }
                        }
                    }
                }
                
                // Create slots for this meeting type
                ranges.forEach(range => {
                    createSlotPromises.push(
                        fetch("/api/availability", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                interviewer_id: selectedInterviewer,
                                date: dateStr,
                                start_time: range.start,
                                end_time: range.end,
                                slot_duration: slotDuration,
                                meeting_type: meetingType,
                                meeting_title: meetingTypeConfig?.name || meetingType,
                                meeting_description: meetingTypeConfig?.description || undefined
                            })
                        })
                    );
                });
            }

            await Promise.all(createSlotPromises);
            
            toast.success("Availability saved!");
            
            // Clear current selections since they're now saved
            setSelectedSlots(new Set());
            setSlotMarks(new Map());
            
            // Wait a bit for database consistency, then refresh
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchAvailability();
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Failed to save availability");
        } finally {
            setSaving(false);
        }
    };

    const generateLink = async () => {
        if (!selectedInterviewer) return;

        setGeneratingLink(true);
        try {
            const res = await fetch("/api/booking-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interviewer_id: selectedInterviewer,
                    custom_title: customLinkTitle || undefined,
                    allow_multiple_slots: allowMultipleSlots
                })
            });

            const data = await res.json();
            if (res.ok) {
                setGeneratedLink(data.url);
                setLinkExpiry(data.expires_at);
                setLinkDialogOpen(true);
                // Reset form
                setCustomLinkTitle("");
                setAllowMultipleSlots(false);
            } else {
                toast.error(data.error || "Failed to generate link");
            }
        } catch (error) {
            console.error("Error generating link:", error);
            toast.error(error instanceof Error ? error.message : "Failed to generate link");
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard");
    };

    const isPastTime = (time: string): boolean => {
        if (!selectedDate) return false;
        const today = format(new Date(), "yyyy-MM-dd");
        const selected = format(selectedDate, "yyyy-MM-dd");
        if (selected !== today) return false;
        
        const now = new Date().toTimeString().slice(0, 5);
        return time < now;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Availability Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        Select a date and toggle time slots to set your availability
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Custom title (optional)"
                            value={customLinkTitle}
                            onChange={(e) => setCustomLinkTitle(e.target.value)}
                            className="w-[200px]"
                        />
                        <Button variant="outline" onClick={generateLink} disabled={generatingLink || !selectedInterviewer}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            {generatingLink ? "Generating..." : "Generate Link"}
                        </Button>
                    </div>
                    <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select interviewer" />
                        </SelectTrigger>
                        <SelectContent>
                            {interviewers.map((i) => (
                                <SelectItem key={i.id} value={i.id.toString()}>
                                    {i.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Date</CardTitle>
                        <CardDescription>Choose a date to set availability (next {dateRangeDays} days)</CardDescription>
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
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>

                {/* Time Slots */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                                </CardTitle>
                                <CardDescription>
                                    Select a marking type, then click slots to mark them • {selectedSlots.size} slots marked
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <span>Mark as:</span>
                                </div>
                                <Select value={selectedMeetingType} onValueChange={handleMeetingTypeChange}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Meeting Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meetingTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        className="w-3 h-3 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: type.color }}
                                                    />
                                                    {type.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={slotDuration.toString()} onValueChange={(value) => handleDurationChange(parseInt(value))}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30">30 mins</SelectItem>
                                        <SelectItem value="45">45 mins</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="75">1 hour 15 mins</SelectItem>
                                        <SelectItem value="90">1 hour 30 mins</SelectItem>
                                        <SelectItem value="105">1 hour 45 mins</SelectItem>
                                        <SelectItem value="120">2 hours</SelectItem>
                                        <SelectItem value="150">2 hours 30 mins</SelectItem>
                                        <SelectItem value="180">3 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={saveAvailability} disabled={saving || !selectedDate}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : !selectedDate ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Select a date from the calendar
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Existing Slots Management - Only show when there are slots */}
                                {existingSlots.length > 0 && (
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <h4 className="font-medium mb-3">Existing Availability Slots</h4>
                                        <div className="space-y-2">
                                            {existingSlots.map((slot) => (
                                                <div key={slot.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            {slot.meeting_type && meetingTypes.find(mt => mt.id === slot.meeting_type) && (
                                                                <div 
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ 
                                                                        backgroundColor: meetingTypes.find(mt => mt.id === slot.meeting_type)?.color 
                                                                    }}
                                                                />
                                                            )}
                                                            <span className="text-xs font-medium text-gray-600">
                                                                {slot.meeting_title || slot.meeting_type || 'Meeting'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            {slot.start_time} - {slot.end_time}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {formatDuration(slot.slot_duration)} slots
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {slot.bookings?.length || 0} booking(s)
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Select 
                                                            value={slot.meeting_type || 'interview'} 
                                                            onValueChange={(newType) => handleSlotTypeChange(slot.id, newType)}
                                                        >
                                                            <SelectTrigger className="w-[80px] h-6 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {meetingTypes.map((type) => (
                                                                    <SelectItem key={type.id} value={type.id}>
                                                                        <div className="flex items-center gap-1">
                                                                            <div 
                                                                                className="w-2 h-2 rounded-full"
                                                                                style={{ backgroundColor: type.color }}
                                                                            />
                                                                            <span className="text-xs">{type.name}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteSlot(slot.id)}
                                                            disabled={slot.bookings && slot.bookings.length > 0}
                                                            className="h-6 w-6"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Meeting Type Legend */}
                                <div className="flex items-center gap-4 text-xs text-gray-600 border-b pb-2 mb-3">
                                    <span className="font-medium">Color Legend:</span>
                                    {meetingTypes.map((type) => (
                                        <div key={type.id} className="flex items-center gap-1">
                                            <div 
                                                className="w-3 h-3 rounded-full border border-gray-300"
                                                style={{ backgroundColor: type.color }}
                                            />
                                            <span>{type.name}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Time Slot Grid */}
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto pr-2">
                                    {timeSlots.map((time) => {
                                    const isSelected = selectedSlots.has(time);
                                    const isPast = isPastTime(time);
                                    const isBooked = bookedTimeSlots.has(time);
                                    const isDisabled = (isPast && !isSelected) || isBooked;
                                    const slotMeetingType = slotMarks.get(time);
                                    const meetingTypeConfig = slotMeetingType ? meetingTypes.find(mt => mt.id === slotMeetingType) : null;

                                    return (
                                        <Button
                                            key={time}
                                            size="sm"
                                            variant={isSelected ? "default" : meetingTypeConfig ? "default" : "outline"}
                                            className={`h-10 relative ${isPast && !isSelected ? "opacity-50" : ""} ${isBooked ? "cursor-not-allowed" : ""}`}
                                            onClick={() => !isDisabled && toggleSlot(time)}
                                            disabled={isDisabled}
                                            style={{
                                                backgroundColor: isBooked ? '#ef4444' : meetingTypeConfig ? meetingTypeConfig.color : undefined,
                                                borderColor: isBooked ? '#ef4444' : meetingTypeConfig ? meetingTypeConfig.color : undefined,
                                                color: isBooked || meetingTypeConfig ? '#ffffff' : undefined,
                                                opacity: (isPast && !isSelected) || isBooked ? 0.6 : 1,
                                            }}
                                        >
                                            {isBooked && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" title="Booked" />
                                            )}
                                            {!isBooked && meetingTypeConfig && (
                                                <div
                                                    className="absolute top-0 right-0 w-2 h-2 rounded-full border border-white"
                                                    style={{ backgroundColor: meetingTypeConfig.color }}
                                                />
                                            )}
                                            <Clock className="h-3 w-3 mr-1" />
                                            {time}
                                        </Button>
                                    );
                                })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Link Generation Dialog */}
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Secure Booking Link Generated</DialogTitle>
                        <DialogDescription>
                            This link is valid for 24 hours and can only be used once.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <h1>Booking URL</h1>
                            <div className="flex items-center gap-2">
                                <Input readOnly value={generatedLink} className="flex-1" />
                                <Button size="icon" variant="outline" onClick={copyLink}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        {linkExpiry && (
                            <div className="text-sm text-muted-foreground">
                                Expires: {format(new Date(linkExpiry), "PPpp")}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setLinkDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duration Change Warning Dialog */}
            <Dialog open={warningDialog.open} onOpenChange={(open) => 
                setWarningDialog({ ...warningDialog, open })
            }>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Duration Change
                        </DialogTitle>
                        <DialogDescription>
                            This will affect existing slots with bookings. Changing the duration may affect how time slots are displayed to candidates.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                            <p className="text-sm text-amber-800">
                                <strong>{warningDialog.existingBookings} existing booking(s)</strong> will be affected by this change.
                            </p>
                        </div>

                        {warningDialog.bookings && warningDialog.bookings.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Existing bookings:</p>
                                {warningDialog.bookings.map((booking, index) => (
                                    <div key={index} className="text-xs bg-gray-50 p-2 rounded border">
                                        <div>{booking.candidate_name} ({booking.candidate_email})</div>
                                        <div className="text-muted-foreground">
                                            {new Date(booking.booked_start_time).toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                            })} - {new Date(booking.booked_end_time).toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit", 
                                                hour12: false,
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setWarningDialog({ ...warningDialog, open: false })}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="default"
                            onClick={confirmDurationChange}
                        >
                            Confirm Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
