export interface Slot {
    readonly id: string;
    readonly date: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly metadata?: Record<string, unknown>;
}

export interface SlotInternal extends Slot {
    readonly startIndex: number;
    readonly endIndex: number;
}

export interface TimeRange {
    readonly startTime: string;
    readonly endTime: string;
}

export interface SlotConflict {
    readonly slot1: Slot;
    readonly slot2: Slot;
    readonly overlapMinutes: number;
}

export interface CreateSlotInput {
    date: string;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
}

export interface AvailabilityOptions {
    startHour?: number;
    endHour?: number;
    minDurationIntervals?: number;
}

export interface QueryOptions {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface StorageAdapter {
    save(slot: Slot): Promise<Slot>;
    getById(id: string): Promise<Slot | null>;
    getByDate(date: string): Promise<Slot[]>;
    getByDateRange(startDate: string, endDate: string): Promise<Slot[]>;
    delete(id: string): Promise<boolean>;
    deleteByDate(date: string): Promise<number>;
    exists(id: string): Promise<boolean>;
    getAll(options?: QueryOptions): Promise<Slot[]>;
    count(date?: string): Promise<number>;
    clear(): Promise<void>;
}

export interface SlotManagerOptions {
    allowOverlap?: boolean;
}
