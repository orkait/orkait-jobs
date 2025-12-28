import { CONFIG } from "./constants";
import {
    SlotConflictError,
    SlotNotFoundError,
    SlotValidationError,
} from "./errors";
import type {
    AvailabilityOptions,
    CreateSlotInput,
    QueryOptions,
    Slot,
    SlotManagerOptions,
    StorageAdapter,
    TimeRange,
} from "./types";
import { generateId, getOverlapMinutes, isOverlapping, toInternal } from "./utils/helpers";
import { indexToTime, timeToIndex } from "./utils/time";
import { isValidDate, validateSlotInput } from "./utils/validation";

export class InMemoryStorageAdapter implements StorageAdapter {
    private slots: Map<string, Slot> = new Map();
    private dateIndex: Map<string, Set<string>> = new Map();

    async save(slot: Slot): Promise<Slot> {
        this.slots.set(slot.id, slot);

        if (!this.dateIndex.has(slot.date)) {
            this.dateIndex.set(slot.date, new Set());
        }
        this.dateIndex.get(slot.date)!.add(slot.id);

        return slot;
    }

    async getById(id: string): Promise<Slot | null> {
        return this.slots.get(id) ?? null;
    }

    async getByDate(date: string): Promise<Slot[]> {
        const ids = this.dateIndex.get(date);
        if (!ids) return [];

        return Array.from(ids)
            .map((id) => this.slots.get(id))
            .filter((slot): slot is Slot => slot !== undefined);
    }

    async getByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
        const result: Slot[] = [];

        for (const [date, ids] of this.dateIndex.entries()) {
            if (date >= startDate && date <= endDate) {
                for (const id of ids) {
                    const slot = this.slots.get(id);
                    if (slot) result.push(slot);
                }
            }
        }

        return result.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });
    }

    async delete(id: string): Promise<boolean> {
        const slot = this.slots.get(id);
        if (!slot) return false;

        this.slots.delete(id);
        this.dateIndex.get(slot.date)?.delete(id);

        return true;
    }

    async deleteByDate(date: string): Promise<number> {
        const ids = this.dateIndex.get(date);
        if (!ids) return 0;

        const count = ids.size;
        for (const id of ids) {
            this.slots.delete(id);
        }
        this.dateIndex.delete(date);

        return count;
    }

    async exists(id: string): Promise<boolean> {
        return this.slots.has(id);
    }

    async getAll(options?: QueryOptions): Promise<Slot[]> {
        let slots = Array.from(this.slots.values());

        if (options?.startDate) {
            slots = slots.filter((s) => s.date >= options.startDate!);
        }
        if (options?.endDate) {
            slots = slots.filter((s) => s.date <= options.endDate!);
        }

        slots.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });

        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? slots.length;

        return slots.slice(offset, offset + limit);
    }

    async count(date?: string): Promise<number> {
        if (date) {
            return this.dateIndex.get(date)?.size ?? 0;
        }
        return this.slots.size;
    }

    async clear(): Promise<void> {
        this.slots.clear();
        this.dateIndex.clear();
    }
}


export class SlotManager {
    private storage: StorageAdapter;
    private options: Required<SlotManagerOptions>;

    constructor(storage?: StorageAdapter, options?: SlotManagerOptions) {
        this.storage = storage ?? new InMemoryStorageAdapter();
        this.options = {
            allowOverlap: options?.allowOverlap ?? false,
        };
    }

    async book(input: CreateSlotInput): Promise<Slot> {
        const validated = validateSlotInput(input);

        const slot: Slot = Object.freeze({
            id: generateId(),
            date: validated.date,
            startTime: validated.startTime,
            endTime: validated.endTime,
            metadata: input.metadata,
        });

        // Prevent overlapping slots unless explicitly allowed
        if (!this.options.allowOverlap) {
            const conflicts = await this.getConflicts(slot);
            if (conflicts.length > 0) {
                throw new SlotConflictError(
                    `Slot conflicts with ${conflicts.length} existing slot(s).`,
                    conflicts
                );
            }
        }

        return this.storage.save(slot);
    }

    async bookMany(inputs: CreateSlotInput[]): Promise<Slot[]> {
        const validated = inputs.map((input) => ({
            ...validateSlotInput(input),
            metadata: input.metadata,
        }));

        const slots: Slot[] = validated.map((v) =>
            Object.freeze({
                id: generateId(),
                date: v.date,
                startTime: v.startTime,
                endTime: v.endTime,
                metadata: v.metadata,
            })
        );

        if (!this.options.allowOverlap) {
            for (const slot of slots) {
                const conflicts = await this.getConflicts(slot);
                if (conflicts.length > 0) {
                    throw new SlotConflictError(
                        `Slot ${slot.startTime}-${slot.endTime} conflicts with existing slot(s).`,
                        conflicts
                    );
                }
            }

            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    if (isOverlapping(slots[i], slots[j])) {
                        throw new SlotConflictError(
                            `Slots in batch conflict with each other.`,
                            [slots[i], slots[j]]
                        );
                    }
                }
            }
        }

        const saved: Slot[] = [];
        for (const slot of slots) {
            saved.push(await this.storage.save(slot));
        }

        return saved;
    }

    async get(id: string): Promise<Slot | null> {
        return this.storage.getById(id);
    }

    async getOrThrow(id: string): Promise<Slot> {
        const slot = await this.storage.getById(id);
        if (!slot) {
            throw new SlotNotFoundError(id);
        }
        return slot;
    }

    async getByDate(date: string): Promise<Slot[]> {
        if (!isValidDate(date)) {
            throw new SlotValidationError(`Invalid date: "${date}"`, "date");
        }
        return this.storage.getByDate(date);
    }

    async getByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
        if (!isValidDate(startDate)) {
            throw new SlotValidationError(`Invalid start date: "${startDate}"`, "date");
        }
        if (!isValidDate(endDate)) {
            throw new SlotValidationError(`Invalid end date: "${endDate}"`, "date");
        }
        return this.storage.getByDateRange(startDate, endDate);
    }

    async cancel(id: string): Promise<boolean> {
        return this.storage.delete(id);
    }

    async cancelOrThrow(id: string): Promise<void> {
        const deleted = await this.storage.delete(id);
        if (!deleted) {
            throw new SlotNotFoundError(id);
        }
    }

    async cancelByDate(date: string): Promise<number> {
        if (!isValidDate(date)) {
            throw new SlotValidationError(`Invalid date: "${date}"`, "date");
        }
        return this.storage.deleteByDate(date);
    }

    async getAvailableSlots(
        date: string,
        options?: AvailabilityOptions
    ): Promise<TimeRange[]> {
        if (!isValidDate(date)) {
            throw new SlotValidationError(`Invalid date: "${date}"`, "date");
        }

        const { startHour = 0, endHour = 24, minDurationIntervals = 1 } = options ?? {};

        if (startHour < 0 || startHour > 23) {
            throw new Error(`startHour must be 0-23, got ${startHour}`);
        }
        if (endHour < 1 || endHour > 24) {
            throw new Error(`endHour must be 1-24, got ${endHour}`);
        }
        if (endHour <= startHour) {
            throw new Error(`endHour must be greater than startHour`);
        }

        const existingSlots = await this.storage.getByDate(date);
        const slotsInternal = existingSlots.map(toInternal);

        const dayStart = startHour * CONFIG.INTERVALS_PER_HOUR;
        const dayEnd = endHour * CONFIG.INTERVALS_PER_HOUR;

        // Build set of occupied time intervals
        const occupied = new Set<number>();
        for (const slot of slotsInternal) {
            for (let i = slot.startIndex; i < slot.endIndex; i++) {
                occupied.add(i);
            }
        }

        const available: TimeRange[] = [];
        let blockStart: number | null = null;

        // Find contiguous blocks of free time
        for (let i = dayStart; i <= dayEnd; i++) {
            const isFree = i < dayEnd && !occupied.has(i);

            if (isFree && blockStart === null) {
                blockStart = i;
            } else if (!isFree && blockStart !== null) {
                const duration = i - blockStart;
                if (duration >= minDurationIntervals) {
                    available.push({
                        startTime: indexToTime(blockStart),
                        endTime: indexToTime(i),
                    });
                }
                blockStart = null;
            }
        }

        return available;
    }

    async isAvailable(
        date: string,
        startTime: string,
        endTime: string
    ): Promise<boolean> {
        try {
            const validated = validateSlotInput({ date, startTime, endTime });
            const tempSlot: Slot = {
                id: "temp",
                date: validated.date,
                startTime: validated.startTime,
                endTime: validated.endTime,
            };

            const conflicts = await this.getConflicts(tempSlot);
            return conflicts.length === 0;
        } catch {
            return false;
        }
    }

    async getConflicts(slot: Slot): Promise<Slot[]> {
        const existingSlots = await this.storage.getByDate(slot.date);
        return existingSlots.filter(
            (existing) => existing.id !== slot.id && isOverlapping(slot, existing)
        );
    }

    async findConflicts(date: string): Promise<Array<{
        slot1: Slot;
        slot2: Slot;
        overlapMinutes: number;
    }>> {
        const slots = await this.storage.getByDate(date);
        const conflicts: Array<{
            slot1: Slot;
            slot2: Slot;
            overlapMinutes: number;
        }> = [];

        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (isOverlapping(slots[i], slots[j])) {
                    conflicts.push({
                        slot1: slots[i],
                        slot2: slots[j],
                        overlapMinutes: getOverlapMinutes(slots[i], slots[j]),
                    });
                }
            }
        }

        return conflicts;
    }

    async getBookedMinutes(date: string): Promise<number> {
        const slots = await this.storage.getByDate(date);
        return slots.reduce((total, slot) => {
            const internal = toInternal(slot);
            return total + (internal.endIndex - internal.startIndex) * CONFIG.INTERVAL_MINUTES;
        }, 0);
    }

    async getAvailableMinutes(
        date: string,
        options?: AvailabilityOptions
    ): Promise<number> {
        const available = await this.getAvailableSlots(date, options);
        return available.reduce((total, range) => {
            const start = timeToIndex(range.startTime);
            const end = timeToIndex(range.endTime);
            return total + (end - start) * CONFIG.INTERVAL_MINUTES;
        }, 0);
    }

    async count(date?: string): Promise<number> {
        return this.storage.count(date);
    }

    async getAll(options?: QueryOptions): Promise<Slot[]> {
        return this.storage.getAll(options);
    }

    async clear(): Promise<void> {
        return this.storage.clear();
    }

    getStorage(): StorageAdapter {
        return this.storage;
    }
}

export function createSlotManager(
    storage?: StorageAdapter,
    options?: SlotManagerOptions
): SlotManager {
    return new SlotManager(storage, options);
}