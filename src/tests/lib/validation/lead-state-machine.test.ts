import { describe, expect, it } from "vitest";
import {
    ALLOWED_LEAD_TRANSITIONS,
    validateLeadStatusTransition,
} from "@/lib/validation/lead-state-machine";

const ALL_STATUSES = ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Rejected"] as const;

describe("validateLeadStatusTransition", () => {
    describe("valid transitions from New", () => {
        it.each(ALLOWED_LEAD_TRANSITIONS.New)("allows New -> %s", (target) => {
            const result = validateLeadStatusTransition("New", target);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("valid transitions from Contacted", () => {
        it.each(ALLOWED_LEAD_TRANSITIONS.Contacted)("allows Contacted -> %s", (target) => {
            const result = validateLeadStatusTransition("Contacted", target);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("valid transitions from Qualified", () => {
        it.each(ALLOWED_LEAD_TRANSITIONS.Qualified)("allows Qualified -> %s", (target) => {
            const result = validateLeadStatusTransition("Qualified", target);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("invalid transitions from New", () => {
        it("allows New -> New (same status is idempotent)", () => {
            const result = validateLeadStatusTransition("New", "New");
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it("blocks New -> Foo (unknown target)", () => {
            const result = validateLeadStatusTransition("New", "Foo");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Cannot transition from 'New' to 'Foo'");
        });
    });

    describe("invalid transitions from Contacted", () => {
        it("blocks Contacted -> New (backflow blocked)", () => {
            const result = validateLeadStatusTransition("Contacted", "New");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Cannot transition from 'Contacted' to 'New'");
        });

        it("allows Contacted -> Qualified (forward transition)", () => {
            const result = validateLeadStatusTransition("Contacted", "Qualified");
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("invalid transitions from Qualified", () => {
        it.each(["New", "Contacted", "Unqualified"])("blocks Qualified -> %s (no backflow)", (target) => {
            const result = validateLeadStatusTransition("Qualified", target);
            expect(result.valid).toBe(false);
            expect(result.error).toBe(`Cannot transition from 'Qualified' to '${target}'`);
        });
    });

    describe("terminal states allow no transitions to other states", () => {
        it.each(["Unqualified", "Converted", "Rejected"])("%s is terminal", (status) => {
            for (const target of ALL_STATUSES) {
                if (target === status) continue;
                const result = validateLeadStatusTransition(status, target);
                expect(result.valid).toBe(false);
                expect(result.error).toBe(`Cannot transition from '${status}' to '${target}'`);
            }
        });
    });

    describe("empty/null current status", () => {
        it("allows setting a status from an empty current status", () => {
            const result = validateLeadStatusTransition("", "New");
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it("treats null current status as unknown (allows any status)", () => {
            const result = validateLeadStatusTransition(null as unknown as string, "Contacted");
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("same status (idempotent)", () => {
        it.each([...ALL_STATUSES])("allows %s -> %s", (status) => {
            const result = validateLeadStatusTransition(status, status);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
    });

    describe("unknown current status", () => {
        it("returns 'Unknown current status' error for Foo -> Bar", () => {
            const result = validateLeadStatusTransition("Foo", "Bar");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Unknown current status: Foo");
        });
    });
});
