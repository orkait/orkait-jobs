# Slot Management System

A flexible slot booking system with multiple storage adapter options.

## Storage Adapters

The system supports three storage backend options:

### 1. **In-Memory Adapter** (Default)
Best for: Development, testing, demos

```typescript
import { SlotManager, InMemoryStorageAdapter } from "./slots";

const storage = new InMemoryStorageAdapter();
const manager = new SlotManager(storage);
```

### 2. **Prisma Adapter** (Recommended for Production)
Best for: Production use with PostgreSQL via Prisma ORM

```typescript
import { SlotManager, PrismaStorageAdapter } from "./slots";
import { prisma } from "./lib/prisma";

// For a specific interviewer
const storage = new PrismaStorageAdapter(prisma, {
    interviewerId: 1
});

// Or without interviewer scoping
const storage = new PrismaStorageAdapter(prisma);

const manager = new SlotManager(storage);
```

**Features:**
- Uses Prisma ORM (no raw SQL)
- Maps to existing `availability_slots` table
- Supports interviewer-scoped queries
- Transaction support via Prisma

### 3. **PostgreSQL Adapter** (Raw SQL)
Best for: Advanced use cases requiring custom SQL queries

```typescript
import { Pool } from "pg";
import { SlotManager, PostgresStorageAdapter } from "./slots";

const pool = new Pool({
    host: "localhost",
    database: "myapp",
    user: "postgres",
    password: "password",
});

const storage = new PostgresStorageAdapter(pool, {
    tableName: "booking_slots",
    schema: "public",
    autoCreateTable: true
});

await storage.initialize();
const manager = new SlotManager(storage);
```

### 4. **Redis Adapter**
Best for: High-performance caching layer

```typescript
import Redis from "ioredis";
import { SlotManager, RedisStorageAdapter } from "./slots";

const redis = new Redis({
    host: "localhost",
    port: 6379,
});

const storage = new RedisStorageAdapter(redis, {
    keyPrefix: "slots:",
    ttl: 86400 * 30, // 30 days
});

const manager = new SlotManager(storage);
```

## Basic Usage

```typescript
// Book a slot
const slot = await manager.book({
    date: "2025-12-28",
    startTime: "09:00",
    endTime: "10:00",
    metadata: { notes: "Initial consultation" }
});

// Get available slots for a date
const available = await manager.getAvailableSlots("2025-12-28", {
    startHour: 9,
    endHour: 17,
    minDurationIntervals: 2 // 30 minutes minimum
});

// Check if a time is available
const isAvailable = await manager.isAvailable(
    "2025-12-28",
    "14:00",
    "15:00"
);

// Cancel a slot
await manager.cancel(slot.id);
```

## Configuration

Slots are configured in 15-minute intervals by default. Modify `slots/constants.ts` to change:

```typescript
export const CONFIG = {
    INTERVAL_MINUTES: 15,
    INTERVALS_PER_HOUR: 4,
    INTERVALS_PER_DAY: 96,
} as const;
```

## Conflict Detection

By default, the system prevents overlapping slots:

```typescript
const manager = new SlotManager(storage, {
    allowOverlap: false // default
});
```

To allow overlapping slots (e.g., for multi-resource booking):

```typescript
const manager = new SlotManager(storage, {
    allowOverlap: true
});
```
