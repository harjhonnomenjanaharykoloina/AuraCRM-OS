import { describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => {
    return {
        mockDb: vi.fn(),
    };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/user-companion", () => ({
    USER_OBJECT_API_NAME: "user",
}));

import { sanitizeUserObjectPermissions } from "@/lib/permissions";

const ALL_TRUE = {
    allowRead: true,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowViewAll: true,
    allowModifyAll: true,
    allowModifyListViews: true,
};

const ALL_FALSE = {
    allowRead: false,
    allowCreate: false,
    allowEdit: false,
    allowDelete: false,
    allowViewAll: false,
    allowModifyAll: false,
    allowModifyListViews: false,
};

describe("sanitizeUserObjectPermissions", () => {
    it("preserves all permissions for a non-user object", () => {
        const result = sanitizeUserObjectPermissions("contact", { ...ALL_TRUE });
        expect(result).toEqual(ALL_TRUE);
    });

    it("preserves all false permissions for a non-user object", () => {
        const result = sanitizeUserObjectPermissions("contact", { ...ALL_FALSE });
        expect(result).toEqual(ALL_FALSE);
    });

    it("strips write flags and preserves read flags for the user object", () => {
        const result = sanitizeUserObjectPermissions("user", { ...ALL_TRUE });
        expect(result).toEqual({
            allowRead: true,
            allowCreate: false,
            allowEdit: false,
            allowDelete: false,
            allowViewAll: true,
            allowModifyAll: false,
            allowModifyListViews: true,
        });
    });

    it("strips only write flags for a user object with mixed permissions", () => {
        const mixed = {
            allowRead: true,
            allowViewAll: false,
            allowModifyListViews: true,
            allowCreate: true,
            allowEdit: false,
            allowDelete: true,
            allowModifyAll: false,
        };
        const result = sanitizeUserObjectPermissions("user", { ...mixed });
        expect(result).toEqual({
            allowRead: true,
            allowViewAll: false,
            allowModifyListViews: true,
            allowCreate: false,
            allowEdit: false,
            allowDelete: false,
            allowModifyAll: false,
        });
    });

    it("keeps all flags false for the user object with all false", () => {
        const result = sanitizeUserObjectPermissions("user", { ...ALL_FALSE });
        expect(result).toEqual(ALL_FALSE);
    });

    it("does not mutate the input object", () => {
        const input = { ...ALL_TRUE };
        const result = sanitizeUserObjectPermissions("user", input);
        expect(result).not.toBe(input);
        expect(input).toEqual(ALL_TRUE);
    });

    it("matches the user object exactly (case-sensitive)", () => {
        const input = { ...ALL_TRUE };
        const result = sanitizeUserObjectPermissions("User", input);
        expect(result).toEqual(ALL_TRUE);
    });
});
