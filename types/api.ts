/**
 * API Types and Interfaces
 */

export interface Interviewer {
    id: number;
    name: string;
    email: string;
    role?: string;
    calendar_slug: string;
    created_at?: string;
    updated_at?: string;
}

export interface AvailabilitySlot {
    id: number;
    interviewer_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    recurrence_rule?: string;
    admin_notes?: string;
    created_at?: string;
    slot_duration: number;
    meeting_type?: string;
    meeting_title?: string;
    meeting_description?: string;
    interviewer?: Pick<Interviewer, 'id' | 'name' | 'email'>;
    bookings?: Booking[];
    available_count?: number;
    is_fully_booked?: boolean;
}

export interface Booking {
    id: number;
    slot_id: number;
    interviewer_id: number;
    candidate_name: string;
    candidate_email: string;
    booked_date: string;
    booked_start_time: string;
    booked_end_time: string;
    slot_number: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    admin_notes?: string;
    created_at?: string;
}

export interface BookingLink {
    id: number;
    token: string;
    interviewer_id: number;
    created_at: string;
    expires_at: string;
    used_at?: string;
    used_by_email?: string;
    interviewer?: Pick<Interviewer, 'id' | 'name' | 'calendar_slug'>;
}

export interface SystemConfig {
    id?: number;
    key: string;
    value: any;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

// API Response types
export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
}

export interface CreateAvailabilityRequest {
    interviewer_id: number;
    date: string;
    start_time: string;
    end_time: string;
    slot_duration?: number;
    meeting_type?: string;
    meeting_title?: string;
    meeting_description?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;
    admin_notes?: string;
}

export interface MeetingType {
    id: string;
    name: string;
    description?: string;
    default_duration: number;
    color?: string;
}

export interface UpdateSlotDurationRequest {
    id: number;
    slot_duration: number;
    force_update?: boolean;
}

export interface CreateBookingLinkRequest {
    interviewer_id: number;
}

export interface CreateConfigRequest {
    key: string;
    value: any;
    description?: string;
}