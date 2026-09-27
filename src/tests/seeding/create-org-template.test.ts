import "dotenv/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrgTemplate } from "@/lib/seeding/create-org-template";
import { createDefaultAppAndPermissionSets } from "@/lib/seeding/create-default-app";

const { mockTx, counter } = vi.hoisted(() => {
    const counter = { value: 0 };
    const mockTx: Record<string, any> = {
        queue: { create: vi.fn().mockResolvedValue({ id: 1 }) },
        group: { create: vi.fn().mockResolvedValue({ id: 1 }) },
        objectDefinition: {
            create: vi.fn().mockImplementation((arg: any) => {
                counter.value += 1;
                return { id: counter.value, ...arg.data };
            }),
        },
        fieldDefinition: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            findFirst: vi.fn().mockResolvedValue({ id: 1 }),
        },
        picklistOption: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        listView: { create: vi.fn().mockResolvedValue({ id: 1 }) },
    };
    return { mockTx, counter };
});

vi.mock("@/lib/db", () => ({
    db: {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => any) => cb(mockTx)),
    },
}));

vi.mock("@/lib/seeding/create-default-app", () => ({
    createDefaultAppAndPermissionSets: vi.fn().mockResolvedValue({
        app: { id: 999, apiName: "crm" },
        permissionSets: {
            Owner: { id: 1 },
            Admin: { id: 2 },
            Manager: { id: 3 },
            Sales: { id: 4 },
            Viewer: { id: 5 },
        },
    }),
}));

// Pure helpers kept real (no mock): normalizePicklistApiName (@/lib/api-names),
// USER_OBJECT_API_NAME / USER_ID_FIELD_API_NAME (@/lib/user-companion).

function objectApiNameToId(): Record<string, number> {
    const calls = mockTx.objectDefinition.create.mock.calls;
    const results = mockTx.objectDefinition.create.mock.results;
    const map: Record<string, number> = {};
    calls.forEach((c: any, i: number) => {
        map[c[0].data.apiName] = results[i].value.id;
    });
    return map;
}

function fieldsForObject(idMap: Record<string, number>, apiName: string): any[] {
    const objId = idMap[apiName];
    const calls = mockTx.fieldDefinition.createMany.mock.calls;
    const call = calls.find((c: any) => c[0].data.some((f: any) => f.objectDefId === objId));
    return call ? call[0].data : [];
}

function byApiName(fields: any[]): Record<string, any> {
    const out: Record<string, any> = {};
    for (const f of fields) out[f.apiName] = f;
    return out;
}

function picklistLabelSets(): string[][] {
    return mockTx.picklistOption.createMany.mock.calls.map((c: any) =>
        c[0].data.map((o: any) => o.label)
    );
}

function countWithLabels(labels: string[]): number {
    return picklistLabelSets().filter(
        (ls) => ls.length === labels.length && ls.every((l, i) => l === labels[i])
    ).length;
}

describe("createOrgTemplate — Phase 3 CRM object expansion", () => {
    beforeEach(async () => {
        counter.value = 0;
        mockTx.objectDefinition.create.mockClear();
        mockTx.fieldDefinition.createMany.mockClear();
        mockTx.fieldDefinition.findFirst.mockClear();
        mockTx.picklistOption.createMany.mockClear();
        mockTx.listView.create.mockClear();
        mockTx.queue.create.mockClear();
        mockTx.group.create.mockClear();
        (createDefaultAppAndPermissionSets as any).mockClear();

        await createOrgTemplate(1);
    });

    it("creates the 5 new CRM objects with the expected apiNames, in order", () => {
        const apiNames = mockTx.objectDefinition.create.mock.calls.map((c: any) => c[0].data.apiName);
        expect(apiNames).toEqual([
            "user",
            "company",
            "contact",
            "opportunity",
            "case",
            "lead",
            "task",
            "product",
            "note",
            "call",
            "meeting",
            "document",
            "activity",
            "contract",
            "target",
            "target_list",
        ]);
    });

    it("Product fields: price(Number), sku(Text), description(TextArea), company(Lookup target)", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "product"));
        expect(fields.price.type).toBe("Number");
        expect(fields.sku.type).toBe("Text");
        expect(fields.description.type).toBe("TextArea");
        expect(fields.company.type).toBe("Lookup");
        expect(fields.company.lookupTargetId).toBe(idMap["company"]);
        expect(fields.name.required).toBe(true);
    });

    it("Note fields: body(TextArea), related_to(Lookup); name required", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "note"));
        expect(fields.body.type).toBe("TextArea");
        expect(fields.related_to.type).toBe("Lookup");
        expect(fields.related_to.lookupTargetId).toBe(idMap["contact"]);
        expect(fields.name.required).toBe(true);
    });

    it("Call fields: direction(Picklist), duration(Number), status(Picklist); picklists seeded", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "call"));
        expect(fields.direction.type).toBe("Picklist");
        expect(fields.duration.type).toBe("Number");
        expect(fields.status.type).toBe("Picklist");
        expect(fields.status.required).toBe(true);
        expect(countWithLabels(["Inbound", "Outbound"])).toBe(1);
        // Call + Meeting both reuse ["Scheduled","Completed","Canceled"] for their status picklist.
        expect(countWithLabels(["Scheduled", "Completed", "Canceled"])).toBe(2);
    });

    it("Meeting fields: start(DateTime), end(DateTime), status(Picklist); status picklist seeded", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "meeting"));
        expect(fields.start.type).toBe("DateTime");
        expect(fields.end.type).toBe("DateTime");
        expect(fields.status.type).toBe("Picklist");
        expect(fields.status.required).toBe(true);
        expect(fields.related_to.lookupTargetId).toBe(idMap["contact"]);
        expect(countWithLabels(["Scheduled", "Completed", "Canceled"])).toBe(2);
    });

    it("Document fields: file(File), version(Text); name required", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "document"));
        expect(fields.file.type).toBe("File");
        expect(fields.version.type).toBe("Text");
        expect(fields.name.required).toBe(true);
        expect(fields.related_to.lookupTargetId).toBe(idMap["contact"]);
    });

    it("seededObjects passed to createDefaultAppAndPermissionSets in expected order", () => {
        const seededObjects = (createDefaultAppAndPermissionSets as any).mock.calls[0][2];
        expect(seededObjects.map((o: any) => o.apiName)).toEqual([
            "user",
            "company",
            "contact",
            "opportunity",
            "case",
            "lead",
            "task",
            "product",
            "note",
            "call",
            "meeting",
            "document",
            "activity",
            "contract",
            "target",
            "target_list",
        ]);
    });

    it("opportunity forecasting: probability, expected_revenue (Number), forecast_category (Picklist, required) with options", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "opportunity"));
        expect(fields.probability.type).toBe("Number");
        expect(fields.expected_revenue.type).toBe("Number");
        expect(fields.forecast_category.type).toBe("Picklist");
        expect(fields.forecast_category.required).toBe(true);
        expect(countWithLabels(["Pipeline", "Best Case", "Commit", "Closed Won"])).toBe(1);
    });

    it("Contract fields: value(Currency), account(Lookup target), status(Picklist, required); status picklist seeded", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "contract"));
        expect(fields.value.type).toBe("Currency");
        expect(fields.start_date.type).toBe("Date");
        expect(fields.end_date.type).toBe("Date");
        expect(fields.renewal_reminder_date.type).toBe("Date");
        expect(fields.account.type).toBe("Lookup");
        expect(fields.account.lookupTargetId).toBe(idMap["company"]);
        expect(fields.status.type).toBe("Picklist");
        expect(fields.status.required).toBe(true);
        expect(fields.currency.type).toBe("Text");
        expect(countWithLabels(["Draft", "Sent", "Accepted", "Expired", "Cancelled"])).toBe(1);
    });

    it("Target fields: first_name/last_name required, email/Phone, lookups, do_not_email(Checkbox); lead_source(Picklist, required) seeded", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "target"));
        expect(fields.first_name.type).toBe("Text");
        expect(fields.first_name.required).toBe(true);
        expect(fields.last_name.type).toBe("Text");
        expect(fields.last_name.required).toBe(true);
        expect(fields.email.type).toBe("Email");
        expect(fields.phone.type).toBe("Phone");
        expect(fields.company.type).toBe("Lookup");
        expect(fields.company.lookupTargetId).toBe(idMap["company"]);
        expect(fields.do_not_email.type).toBe("Checkbox");
        expect(fields.tags.type).toBe("Text");
        expect(fields.notes.type).toBe("TextArea");
        expect(fields.lead_source.type).toBe("Picklist");
        expect(fields.lead_source.required).toBe(true);
        expect(fields.converted_account.type).toBe("Lookup");
        expect(fields.converted_account.lookupTargetId).toBe(idMap["company"]);
        expect(fields.converted_contact.type).toBe("Lookup");
        expect(fields.converted_contact.lookupTargetId).toBe(idMap["contact"]);
        expect(countWithLabels(["Web", "Email", "Social", "Referral", "Organic", "Paid", "Other"])).toBe(1);
    });

    it("TargetList fields: target_type(Picklist, required), filters(TextArea), targets(Lookup to target); target_type picklist seeded", () => {
        const idMap = objectApiNameToId();
        const fields = byApiName(fieldsForObject(idMap, "target_list"));
        expect(fields.target_type.type).toBe("Picklist");
        expect(fields.target_type.required).toBe(true);
        expect(fields.filters.type).toBe("TextArea");
        expect(fields.targets.type).toBe("Lookup");
        expect(fields.targets.lookupTargetId).toBe(idMap["target"]);
        expect(countWithLabels(["Static", "Dynamic"])).toBe(1);
    });
});
