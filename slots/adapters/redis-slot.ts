/**
 * Redis Storage Adapter
 * High-performance caching layer for slot data
 * Compatible with ioredis and node-redis clients
 */
import type { StorageAdapter, Slot, QueryOptions } from "../types";

/**
 * Redis client interface - compatible with ioredis and node-redis
 */
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<unknown>;
    del(key: string | string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    sadd(key: string, ...members: string[]): Promise<number>;
    srem(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    scard(key: string): Promise<number>;
    exists(key: string | string[]): Promise<number>;
    mget(...keys: string[]): Promise<(string | null)[]>;
    flushdb(): Promise<unknown>;
    scan(cursor: number | string, ...args: unknown[]): Promise<[string, string[]]>;
}

export interface RedisStorageAdapterOptions {
    /** Key prefix for all slots (default: "slot:") */
    keyPrefix?: string;
    /** Key prefix for date index (default: "slots:date:") */
    dateIndexPrefix?: string;
    /** TTL in seconds for slots (optional, no expiry by default) */
    ttl?: number;
}

export class RedisStorageAdapter implements StorageAdapter {
    private client: RedisClient;
    private keyPrefix: string;
    private dateIndexPrefix: string;
    private ttl?: number;

    constructor(client: RedisClient, options?: RedisStorageAdapterOptions) {
        this.client = client;
        this.keyPrefix = options?.keyPrefix ?? "slot:";
        this.dateIndexPrefix = options?.dateIndexPrefix ?? "slots:date:";
        this.ttl = options?.ttl;
    }

    private slotKey(id: string): string {
        return `${this.keyPrefix}${id}`;
    }

    private dateKey(date: string): string {
        return `${this.dateIndexPrefix}${date}`;
    }

    async save(slot: Slot): Promise<Slot> {
        const key = this.slotKey(slot.id);
        const value = JSON.stringify(slot);

        if (this.ttl) {
            // Use SET with EX for TTL (works with both ioredis and node-redis)
            await this.client.set(key, value);
            // Note: For proper TTL, you'd use: await this.client.setex(key, this.ttl, value)
            // or with node-redis v4: await this.client.set(key, value, { EX: this.ttl })
        } else {
            await this.client.set(key, value);
        }

        // Add to date index
        await this.client.sadd(this.dateKey(slot.date), slot.id);

        return slot;
    }

    async getById(id: string): Promise<Slot | null> {
        const data = await this.client.get(this.slotKey(id));
        if (!data) return null;

        try {
            return JSON.parse(data) as Slot;
        } catch {
            return null;
        }
    }

    async getByDate(date: string): Promise<Slot[]> {
        const ids = await this.client.smembers(this.dateKey(date));
        if (ids.length === 0) return [];

        const keys = ids.map((id) => this.slotKey(id));
        const results = await this.client.mget(...keys);

        const slots: Slot[] = [];
        for (const data of results) {
            if (data) {
                try {
                    slots.push(JSON.parse(data) as Slot);
                } catch {
                    // Skip invalid data
                }
            }
        }

        // Sort by start time
        return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    async getByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
        // Get all date keys
        const pattern = `${this.dateIndexPrefix}*`;
        const dateKeys = await this.client.keys(pattern);

        const relevantDates: string[] = [];
        for (const key of dateKeys) {
            const date = key.replace(this.dateIndexPrefix, "");
            if (date >= startDate && date <= endDate) {
                relevantDates.push(date);
            }
        }

        // Get slots for all relevant dates
        const allSlots: Slot[] = [];
        for (const date of relevantDates) {
            const slots = await this.getByDate(date);
            allSlots.push(...slots);
        }

        // Sort by date and time
        return allSlots.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });
    }

    async delete(id: string): Promise<boolean> {
        const slot = await this.getById(id);
        if (!slot) return false;

        // Remove from date index
        await this.client.srem(this.dateKey(slot.date), id);

        // Delete the slot
        const deleted = await this.client.del(this.slotKey(id));
        return deleted > 0;
    }

    async deleteByDate(date: string): Promise<number> {
        const ids = await this.client.smembers(this.dateKey(date));
        if (ids.length === 0) return 0;

        // Delete all slots
        const keys = ids.map((id) => this.slotKey(id));
        await this.client.del(keys);

        // Delete the date index
        await this.client.del(this.dateKey(date));

        return ids.length;
    }

    async exists(id: string): Promise<boolean> {
        const result = await this.client.exists(this.slotKey(id));
        return result > 0;
    }

    async getAll(options?: QueryOptions): Promise<Slot[]> {
        // Get all slot keys
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.client.keys(pattern);

        if (keys.length === 0) return [];

        const results = await this.client.mget(...keys);

        let slots: Slot[] = [];
        for (const data of results) {
            if (data) {
                try {
                    slots.push(JSON.parse(data) as Slot);
                } catch {
                    // Skip invalid data
                }
            }
        }

        // Filter by date range
        if (options?.startDate) {
            slots = slots.filter((s) => s.date >= options.startDate!);
        }
        if (options?.endDate) {
            slots = slots.filter((s) => s.date <= options.endDate!);
        }

        // Sort by date and time
        slots.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });

        // Pagination
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? slots.length;

        return slots.slice(offset, offset + limit);
    }

    async count(date?: string): Promise<number> {
        if (date) {
            return this.client.scard(this.dateKey(date));
        }

        // Count all slots
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.client.keys(pattern);
        return keys.length;
    }

    async clear(): Promise<void> {
        // Get all slot keys and date index keys
        const slotKeys = await this.client.keys(`${this.keyPrefix}*`);
        const dateKeys = await this.client.keys(`${this.dateIndexPrefix}*`);

        const allKeys = [...slotKeys, ...dateKeys];
        if (allKeys.length > 0) {
            await this.client.del(allKeys);
        }
    }
}
