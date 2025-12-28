/**
 * PostgreSQL Storage Adapter
 * Production-ready implementation for persistent slot storage
 * Compatible with pg (node-postgres) and postgres.js
 */
import type { StorageAdapter, Slot, QueryOptions } from "../types";

/**
 * PostgreSQL client interface - compatible with pg Pool or postgres.jss
 */
export interface PostgresClient {
    query<T = unknown>(
        text: string,
        values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number }>;
}

export interface PostgresStorageAdapterOptions {
    /** Table name (default: "slots") */
    tableName?: string;
    /** Schema name (default: "public") */
    schema?: string;
    /** Auto-create table if not exists (default: true) */
    autoCreateTable?: boolean;
}

export class PostgresStorageAdapter implements StorageAdapter {
    private client: PostgresClient;
    private tableName: string;
    private schema: string;
    private initialized: boolean = false;
    private autoCreateTable: boolean;

    constructor(client: PostgresClient, options?: PostgresStorageAdapterOptions) {
        this.client = client;
        this.tableName = options?.tableName ?? "slots";
        this.schema = options?.schema ?? "public";
        this.autoCreateTable = options?.autoCreateTable ?? true;
    }

    private get fullTableName(): string {
        return `"${this.schema}"."${this.tableName}"`;
    }

    /**
     * Initialize the table (create if not exists)
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.autoCreateTable) {
            await this.client.query(`
        CREATE TABLE IF NOT EXISTS ${this.fullTableName} (
          id VARCHAR(36) PRIMARY KEY,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

            // Create indexes for efficient queries
            await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date 
        ON ${this.fullTableName} (date)
      `);

            await this.client.query(`
        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_date_time 
        ON ${this.fullTableName} (date, start_time, end_time)
      `);
        }

        this.initialized = true;
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    private rowToSlot(row: {
        id: string;
        date: Date | string;
        start_time: string;
        end_time: string;
        metadata?: Record<string, unknown>;
    }): Slot {
        // Handle date conversion (pg returns Date objects)
        let dateStr: string;
        if (row.date instanceof Date) {
            dateStr = row.date.toISOString().split("T")[0];
        } else {
            dateStr = String(row.date).split("T")[0];
        }

        // Handle time conversion (pg returns "HH:MM:SS")
        const startTime = String(row.start_time).substring(0, 5);
        const endTime = String(row.end_time).substring(0, 5);

        return Object.freeze({
            id: row.id,
            date: dateStr,
            startTime,
            endTime,
            metadata: row.metadata,
        });
    }

    async save(slot: Slot): Promise<Slot> {
        await this.ensureInitialized();

        await this.client.query(
            `
      INSERT INTO ${this.fullTableName} (id, date, start_time, end_time, metadata)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      `,
            [
                slot.id,
                slot.date,
                slot.startTime,
                slot.endTime,
                slot.metadata ? JSON.stringify(slot.metadata) : null,
            ]
        );

        return slot;
    }

    async getById(id: string): Promise<Slot | null> {
        await this.ensureInitialized();

        const result = await this.client.query<{
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            metadata: Record<string, unknown>;
        }>(
            `SELECT id, date, start_time, end_time, metadata 
       FROM ${this.fullTableName} 
       WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) return null;
        return this.rowToSlot(result.rows[0]);
    }

    async getByDate(date: string): Promise<Slot[]> {
        await this.ensureInitialized();

        const result = await this.client.query<{
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            metadata: Record<string, unknown>;
        }>(
            `SELECT id, date, start_time, end_time, metadata 
       FROM ${this.fullTableName} 
       WHERE date = $1 
       ORDER BY start_time`,
            [date]
        );

        return result.rows.map((row) => this.rowToSlot(row));
    }

    async getByDateRange(startDate: string, endDate: string): Promise<Slot[]> {
        await this.ensureInitialized();

        const result = await this.client.query<{
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            metadata: Record<string, unknown>;
        }>(
            `SELECT id, date, start_time, end_time, metadata 
       FROM ${this.fullTableName} 
       WHERE date >= $1 AND date <= $2 
       ORDER BY date, start_time`,
            [startDate, endDate]
        );

        return result.rows.map((row) => this.rowToSlot(row));
    }

    async delete(id: string): Promise<boolean> {
        await this.ensureInitialized();

        const result = await this.client.query(
            `DELETE FROM ${this.fullTableName} WHERE id = $1`,
            [id]
        );

        return result.rowCount > 0;
    }

    async deleteByDate(date: string): Promise<number> {
        await this.ensureInitialized();

        const result = await this.client.query(
            `DELETE FROM ${this.fullTableName} WHERE date = $1`,
            [date]
        );

        return result.rowCount;
    }

    async exists(id: string): Promise<boolean> {
        await this.ensureInitialized();

        const result = await this.client.query<{ exists: boolean }>(
            `SELECT EXISTS(SELECT 1 FROM ${this.fullTableName} WHERE id = $1)`,
            [id]
        );

        return result.rows[0]?.exists ?? false;
    }

    async getAll(options?: QueryOptions): Promise<Slot[]> {
        await this.ensureInitialized();

        let query = `
      SELECT id, date, start_time, end_time, metadata 
      FROM ${this.fullTableName} 
      WHERE 1=1
    `;
        const params: unknown[] = [];
        let paramIndex = 1;

        if (options?.startDate) {
            query += ` AND date >= $${paramIndex++}`;
            params.push(options.startDate);
        }

        if (options?.endDate) {
            query += ` AND date <= $${paramIndex++}`;
            params.push(options.endDate);
        }

        query += ` ORDER BY date, start_time`;

        if (options?.limit) {
            query += ` LIMIT $${paramIndex++}`;
            params.push(options.limit);
        }

        if (options?.offset) {
            query += ` OFFSET $${paramIndex++}`;
            params.push(options.offset);
        }

        const result = await this.client.query<{
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            metadata: Record<string, unknown>;
        }>(query, params);

        return result.rows.map((row) => this.rowToSlot(row));
    }

    async count(date?: string): Promise<number> {
        await this.ensureInitialized();

        let query = `SELECT COUNT(*) as count FROM ${this.fullTableName}`;
        const params: unknown[] = [];

        if (date) {
            query += ` WHERE date = $1`;
            params.push(date);
        }

        const result = await this.client.query<{ count: string }>(query, params);
        return parseInt(result.rows[0]?.count ?? "0", 10);
    }

    async clear(): Promise<void> {
        await this.ensureInitialized();
        await this.client.query(`TRUNCATE TABLE ${this.fullTableName}`);
    }

    async findOverlappingSlots(
        date: string,
        startTime: string,
        endTime: string,
        excludeId?: string
    ): Promise<Slot[]> {
        await this.ensureInitialized();

        let query = `
      SELECT id, date, start_time, end_time, metadata 
      FROM ${this.fullTableName} 
      WHERE date = $1 
        AND start_time < $3 
        AND end_time > $2
    `;
        const params: unknown[] = [date, startTime, endTime];

        if (excludeId) {
            query += ` AND id != $4`;
            params.push(excludeId);
        }

        query += ` ORDER BY start_time`;

        const result = await this.client.query<{
            id: string;
            date: Date;
            start_time: string;
            end_time: string;
            metadata: Record<string, unknown>;
        }>(query, params);

        return result.rows.map((row) => this.rowToSlot(row));
    }

    /**
     * Get slots with pagination info
     */
    async getWithPagination(
        options?: QueryOptions
    ): Promise<{ slots: Slot[]; total: number; hasMore: boolean }> {
        const [slots, total] = await Promise.all([
            this.getAll(options),
            this.count(),
        ]);

        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? slots.length;
        const hasMore = offset + slots.length < total;

        return { slots, total, hasMore };
    }

    /**
     * Bulk insert slots (more efficient than individual inserts)
     */
    async bulkSave(slots: Slot[]): Promise<Slot[]> {
        await this.ensureInitialized();

        if (slots.length === 0) return [];

        // Build bulk insert query
        const values: unknown[] = [];
        const placeholders: string[] = [];

        slots.forEach((slot, index) => {
            const offset = index * 5;
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
            );
            values.push(
                slot.id,
                slot.date,
                slot.startTime,
                slot.endTime,
                slot.metadata ? JSON.stringify(slot.metadata) : null
            );
        });

        await this.client.query(
            `
      INSERT INTO ${this.fullTableName} (id, date, start_time, end_time, metadata)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      `,
            values
        );

        return slots;
    }

    /**
     * Get daily slot statistics
     */
    async getDailyStats(
        startDate: string,
        endDate: string
    ): Promise<
        Array<{
            date: string;
            slotCount: number;
            totalMinutes: number;
        }>
    > {
        await this.ensureInitialized();

        const result = await this.client.query<{
            date: Date;
            slot_count: string;
            total_minutes: string;
        }>(
            `
      SELECT 
        date,
        COUNT(*) as slot_count,
        SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60) as total_minutes
      FROM ${this.fullTableName}
      WHERE date >= $1 AND date <= $2
      GROUP BY date
      ORDER BY date
      `,
            [startDate, endDate]
        );

        return result.rows.map((row) => ({
            date: row.date instanceof Date
                ? row.date.toISOString().split("T")[0]
                : String(row.date).split("T")[0],
            slotCount: parseInt(row.slot_count, 10),
            totalMinutes: parseFloat(row.total_minutes),
        }));
    }

    /**
     * Drop the table (use with caution!)
     */
    async dropTable(): Promise<void> {
        await this.client.query(`DROP TABLE IF EXISTS ${this.fullTableName}`);
        this.initialized = false;
    }
}
