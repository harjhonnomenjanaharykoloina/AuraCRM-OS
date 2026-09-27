import "dotenv/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAppAndPermissionSets } from "@/lib/seeding/create-default-app";

type Tx = any;

function createMockTx(): Tx {
    let psId = 1;
    return {
        appDefinition: { create: vi.fn().mockResolvedValue({ id: 100, apiName: "crm" }) },
        appNavItem: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        permissionSet: {
            create: vi.fn().mockImplementation(() => Promise.resolve({ id: psId++ })),
        },
        objectPermission: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        appPermission: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
}

const OBJECT_DEFS = [
    { id: 1, apiName: "user" },
    { id: 2, apiName: "company" },
];

describe("createDefaultAppAndPermissionSets", () => {
    let tx: Tx;
    beforeEach(() => {
        tx = createMockTx();
    });

    it("creates a single default CRM app", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        expect(tx.appDefinition.create).toHaveBeenCalledTimes(1);
        expect(tx.appDefinition.create.mock.calls[0][0].data).toMatchObject({
            organizationId: 7,
            name: "CRM",
            apiName: "crm",
            icon: "LayoutDashboard",
        });
    });

    it("creates a nav item for every object, in order", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        expect(tx.appNavItem.createMany).toHaveBeenCalledTimes(1);
        const nav = tx.appNavItem.createMany.mock.calls[0][0].data;
        expect(nav).toHaveLength(2);
        expect(nav.map((n: any) => n.objectDefId)).toEqual([1, 2]);
        expect(nav.every((n: any) => n.appId === 100)).toBe(true);
    });

    it("creates five role-based permission sets in order", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        expect(tx.permissionSet.create).toHaveBeenCalledTimes(5);
        expect(tx.permissionSet.create.mock.calls.map((c: any) => c[0].data.name)).toEqual([
            "Owner",
            "Admin",
            "Manager",
            "Sales",
            "Viewer",
        ]);
        expect(tx.permissionSet.create.mock.calls[0][0].data.allowDataLoading).toBe(true);
        expect(tx.permissionSet.create.mock.calls[4][0].data.allowDataLoading).toBe(false);
    });

    it("Owner gets full access on every object, including User", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        const ownerRows = tx.objectPermission.createMany.mock.calls[0][0].data as any[];
        expect(ownerRows).toHaveLength(2);
        ownerRows.forEach((r) => {
            expect(r.allowRead).toBe(true);
            expect(r.allowCreate).toBe(true);
            expect(r.allowEdit).toBe(true);
            expect(r.allowDelete).toBe(true);
            expect(r.allowViewAll).toBe(true);
            expect(r.allowModifyAll).toBe(true);
            expect(r.allowModifyListViews).toBe(true);
        });
    });

    it("non-owner roles are excluded from the User object", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        const opCalls = tx.objectPermission.createMany.mock.calls.map((c: any) => c[0].data);
        for (let i = 1; i < 5; i++) {
            expect(opCalls[i]).toHaveLength(1);
            expect(opCalls[i][0].objectDefId).toBe(2);
        }
    });

    it("Viewer is read-only", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        const viewerRows = tx.objectPermission.createMany.mock.calls[4][0].data as any[];
        const v = viewerRows[0];
        expect(v.allowRead).toBe(true);
        expect(v.allowCreate).toBe(false);
        expect(v.allowEdit).toBe(false);
        expect(v.allowDelete).toBe(false);
        expect(v.allowViewAll).toBe(false);
        expect(v.allowModifyAll).toBe(false);
        expect(v.allowModifyListViews).toBe(false);
    });

    it("every role is granted access to the CRM app", async () => {
        await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        expect(tx.appPermission.createMany).toHaveBeenCalledTimes(5);
        tx.appPermission.createMany.mock.calls.forEach((c: any) => {
            expect(c[0].data[0].appId).toBe(100);
        });
    });

    it("returns the app and each permission set's id", async () => {
        const result = await createDefaultAppAndPermissionSets(tx, 7, OBJECT_DEFS);
        expect(result.app).toEqual({ id: 100, apiName: "crm" });
        expect(Object.keys(result.permissionSets).sort()).toEqual([
            "Admin",
            "Manager",
            "Owner",
            "Sales",
            "Viewer",
        ]);
        expect(result.permissionSets.Owner.id).toBe(1);
        expect(result.permissionSets.Viewer.id).toBe(5);
    });

    const runDbTest = Boolean(process.env.DATABASE_URL);
    const maybe = runDbTest ? it : it.skip;

    maybe(
        "seeds app + roles against the real schema (rolled back)",
        async () => {
            const { db } = await import("@/lib/db");
            await db
                .$transaction(async (tx: any) => {
                    const org = await tx.organization.create({
                        data: { name: "zz_test", slug: "zz-test-org-" + Date.now() },
                    });
                    const userObj = await tx.objectDefinition.create({
                        data: {
                            organizationId: org.id,
                            apiName: "user",
                            label: "User",
                            pluralLabel: "Users",
                            icon: "Users",
                            isSystem: true,
                            description: "test user object",
                        },
                    });
                    const companyObj = await tx.objectDefinition.create({
                        data: {
                            organizationId: org.id,
                            apiName: "company",
                            label: "Company",
                            pluralLabel: "Companies",
                            icon: "Building",
                            isSystem: true,
                            description: "test company object",
                        },
                    });
                    const defs = [
                        { id: userObj.id, apiName: "user" },
                        { id: companyObj.id, apiName: "company" },
                    ];
                    const result = await createDefaultAppAndPermissionSets(tx, org.id, defs);

                    expect(result.app.apiName).toBe("crm");
                    expect(await tx.appDefinition.count({ where: { organizationId: org.id } })).toBe(1);
                    expect(await tx.appNavItem.count({ where: { app: { organizationId: org.id } } })).toBe(2);
                    expect(await tx.permissionSet.count({ where: { organizationId: org.id } })).toBe(5);
                    expect(await tx.objectPermission.count({ where: { permissionSet: { organizationId: org.id } } })).toBe(6);
                    expect(await tx.appPermission.count({ where: { permissionSet: { organizationId: org.id } } })).toBe(5);

                    throw new Error("ROLLBACK");
                })
                .catch((e: any) => {
                    if (e?.message !== "ROLLBACK") throw e;
                });
        },
        { timeout: 20000 }
    );
});
