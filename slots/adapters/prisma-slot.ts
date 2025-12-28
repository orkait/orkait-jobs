import type { PrismaClient } from "@prisma/client";
import type { StorageAdapter, Slot, QueryOptions } from "../types";

export interface PrismaStorageAdapterOptions {
    interviewerId?: number;
}


export class PrismaStorageAdapter implements StorageAdapter {
    private prisma: PrismaClient;
    private interviewerId?: number;

    constructor(prisma: PrismaClient, options?: PrismaStorageAdapterOptions) {
        this.prisma = prisma;
        this.interviewerId = options?.interviewerId;
    }

    private rowToSlot(row: {
        id: number;
        date: Date;
        start_time: Date;
        end_time: Date;
        slot_duration?: number;
        admin_notes?: string | null;
    }): Slot {
        // Extract time components from DateTime objects
        const startTime = this.formatTime(row.start_time);
        const endTime = this.formatTime(row.end_time);
        const dateStr = row.date.toISOString().split("T")[0];

        return Object.freeze({
            id: row.id.toString(),
            date: dateStr,
            startTime,
            endTime,
            metadata: {
                duration: row.slot_duration,
                notes: row.admin_notes,
            },
        });
    }

    private formatTime(date: Date): string {
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    private parseTime(timeStr: string): Date {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date(0);
        date.setUTCHours(hours, minutes, 0, 0);
        return date;
    }

    async save(slot: Slot): Promise<Slot> {
        const id = parseInt(slot.id, 10);

        const existing = !isNaN(id) ? await this.prisma.availability_slots.findUnique({
            where: { id },
        }) : null;

        const data = {
            date: new Date(slot.date),
            start_time: this.parseTime(slot.startTime),
            end_time: this.parseTime(slot.endTime),
            slot_duration: (slot.metadata?.duration as number) || 30,
            admin_notes: (slot.metadata?.notes as string) || null,
            ...(this.interviewerId && { interviewer_id: this.interviewerId }),
        };

        const result = existing
            ? await this.prisma.availability_slots.update({
                where: { id },
                data,
            })
            : await this.prisma.availability_slots.create({
                data: {
                    ...data,
                    interviewer_id: this.interviewerId || 0, // Fallback, should be provided
                },
            });

        return this.rowToSlot(result);
    }

    async getById(id: string): Promise<Slot | null> {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) return null;

        const slot = await this.prisma.availability_slots.findUnique({
            where: { id: numId },
        });

        return slot ? this.rowToSlot(slot) : null;
    }

    async getByDate(date: string): Promise<Slot[]> {
        const dateObj = new Date(date);

        const where: any = {
            date: dateObj,
        };

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        const slots = await this.prisma.availability_slots.findMany({
            where,
            orderBy: { start_time: "asc" },
        });

        return slots.map((slot) => this.rowToSlot(slot));
    }

    async getByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
        const where: any = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        const slots = await this.prisma.availability_slots.findMany({
            where,
            orderBy: [{ date: "asc" }, { start_time: "asc" }],
        });

        return slots.map((slot) => this.rowToSlot(slot));
    }

    async delete(id: string): Promise<boolean> {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) return false;

        try {
            await this.prisma.availability_slots.delete({
                where: { id: numId },
            });
            return true;
        } catch {
            return false;
        }
    }

    async deleteByDate(date: string): Promise<number> {
        const dateObj = new Date(date);

        const where: any = {
            date: dateObj,
        };

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        const result = await this.prisma.availability_slots.deleteMany({
            where,
        });

        return result.count;
    }

    async exists(id: string): Promise<boolean> {
        const numId = parseInt(id, 10);
        if (isNaN(numId)) return false;

        const count = await this.prisma.availability_slots.count({
            where: { id: numId },
        });

        return count > 0;
    }

    async getAll(options?: QueryOptions): Promise<Slot[]> {
        const where: any = {};

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        if (options?.startDate) {
            where.date = { ...where.date, gte: new Date(options.startDate) };
        }

        if (options?.endDate) {
            where.date = { ...where.date, lte: new Date(options.endDate) };
        }

        const slots = await this.prisma.availability_slots.findMany({
            where,
            orderBy: [{ date: "asc" }, { start_time: "asc" }],
            skip: options?.offset,
            take: options?.limit,
        });

        return slots.map((slot) => this.rowToSlot(slot));
    }

    async count(date?: string): Promise<number> {
        const where: any = {};

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        if (date) {
            where.date = new Date(date);
        }

        return this.prisma.availability_slots.count({ where });
    }

    async clear(): Promise<void> {
        const where: any = {};

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        await this.prisma.availability_slots.deleteMany({ where });
    }

    /**
     * Find overlapping slots using Prisma's query capabilities
     * More efficient than loading all slots and checking in memory
     */
    async findOverlappingSlots(
        date: string,
        startTime: string,
        endTime: string,
        excludeId?: string
    ): Promise<Slot[]> {
        const dateObj = new Date(date);
        const startTimeObj = this.parseTime(startTime);
        const endTimeObj = this.parseTime(endTime);

        const where: any = {
            date: dateObj,
            // Overlap condition: existing.start < new.end AND existing.end > new.start
            AND: [
                { start_time: { lt: endTimeObj } },
                { end_time: { gt: startTimeObj } },
            ],
        };

        if (this.interviewerId) {
            where.interviewer_id = this.interviewerId;
        }

        if (excludeId) {
            const numId = parseInt(excludeId, 10);
            if (!isNaN(numId)) {
                where.id = { not: numId };
            }
        }

        const slots = await this.prisma.availability_slots.findMany({
            where,
            orderBy: { start_time: "asc" },
        });

        return slots.map((slot) => this.rowToSlot(slot));
    }
}
