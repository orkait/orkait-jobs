import type { Slot } from "./types";


export class SlotValidationError extends Error {
    constructor(
        message: string,
        public readonly field: "date" | "startTime" | "endTime" | "range"
    ) {
        super(message);
        this.name = "SlotValidationError";
    }
}


export class SlotConflictError extends Error {
    constructor(
        message: string,
        public readonly conflictingSlots: Slot[]
    ) {
        super(message);
        this.name = "SlotConflictError";
    }
}


export class SlotNotFoundError extends Error {
    constructor(id: string) {
        super(`Slot not found: ${id}`);
        this.name = "SlotNotFoundError";
    }
}
