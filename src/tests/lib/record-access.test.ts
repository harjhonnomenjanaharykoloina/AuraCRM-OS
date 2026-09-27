import { describe, expect, it, vi, beforeEach } from "vitest";
import { type Prisma, OwnerType, PrincipalType, ShareAccessLevel } from "@prisma/client";
import { buildRecordAccessFilter, buildRecordAccessSql, getUserQueueIds } from "@/lib/record-access";

const { mockQueueMemberFindMany } = vi.hoisted(() => ({
    mockQueueMemberFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        queueMember: {
            findMany: mockQueueMemberFindMany,
        },
    },
}));

interface ShareEntry {
    principalType: PrincipalType;
    principalId: number;
    accessLevels: string[];
}

interface AccessLogic {
    ownerIdEq: number | null;
    ownerTypeEq: "USER";
    ownerQueueIdIn: number[] | null;
    hasShareSubquery: boolean;
    principals: ShareEntry[];
}

function formatSqlValue(v: unknown): string {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return `'${v}'`;
    return String(v);
}

function renderSql(sql: Prisma.Sql): string {
    const strings = (sql as any).strings as string[];
    const values = (sql as any).values as unknown[];
    const parts: string[] = [];
    for (let i = 0; i < strings.length; i++) {
        parts.push(strings[i]);
        if (i < values.length) {
            const v = values[i];
            if (v && typeof v === "object" && "strings" in v && "values" in v) {
                parts.push(renderSql(v as Prisma.Sql));
            } else {
                parts.push(formatSqlValue(v));
            }
        }
    }
    return parts.join("");
}

function sortNumbers(a: number, b: number): number {
    return a - b;
}

function normalizeFilter(
    filter: Prisma.RecordWhereInput,
    userId: number,
): AccessLogic {
    const or = ((filter as any).OR ?? []) as any[];

    const hasOwner = or.some(
        (e: any) => e.ownerId === userId && e.ownerType === OwnerType.USER,
    );

    const queueEntry = or.find((e: any) => "ownerQueueId" in e) as any;
    const ownerQueueIdIn = queueEntry
        ? [...(queueEntry.ownerQueueId.in as number[])].sort(sortNumbers)
        : null;

    const shareEntry = or.find((e: any) => "shares" in e) as any;
    const shareOr: any[] = shareEntry?.shares?.some?.OR ?? [];

    const principals: ShareEntry[] = shareOr.map((e: any) => ({
        principalType: e.principalType as PrincipalType,
        principalId: e.principalId as number,
        accessLevels: [...(e.accessLevel.in as string[])].sort(),
    }));

    return {
        ownerIdEq: hasOwner ? userId : null,
        ownerTypeEq: "USER",
        ownerQueueIdIn,
        hasShareSubquery: Boolean(shareEntry),
        principals: principals.sort((a, b) =>
            a.principalType.localeCompare(b.principalType),
        ),
    };
}

function normalizeSql(sql: Prisma.Sql): AccessLogic & {
    organizationId: number | null;
    rendered: string;
} {
    const rendered = renderSql(sql);

    const ownerIdMatch = rendered.match(/r\."ownerId"\s*=\s*(\d+)/);
    const ownerIdEq = ownerIdMatch ? Number(ownerIdMatch[1]) : null;

    const queueMatch = rendered.match(/r\."ownerQueueId"\s*IN\s*\(([^)]*)\)/);
    const ownerQueueIdIn = queueMatch
        ? queueMatch[1]
                .split(/,\s*/)
                .map(Number)
                .sort(sortNumbers)
        : null;

    const hasShareSubquery = /EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+"RecordShare"/i.test(
        rendered,
    );

    const orgMatch = rendered.match(/rs\."organizationId"\s*=\s*(\d+)/);
    const organizationId = orgMatch ? Number(orgMatch[1]) : null;

    const principals: ShareEntry[] = [];
    const principalRe =
        /rs\."principalType"\s*=\s*'(\w+)'\s+AND\s+rs\."principalId"\s*=\s*(\d+)\s+AND\s+rs\."accessLevel"\s*IN\s*\(([^)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = principalRe.exec(rendered)) !== null) {
        const levels = m[3]
            .replace(/'/g, "")
            .split(/,\s*/)
            .filter(Boolean)
            .sort();
        principals.push({
            principalType: m[1] as PrincipalType,
            principalId: Number(m[2]),
            accessLevels: levels,
        });
    }
    principals.sort((a, b) => a.principalType.localeCompare(b.principalType));

    return {
        ownerIdEq,
        ownerTypeEq: "USER",
        ownerQueueIdIn,
        hasShareSubquery,
        principals,
        organizationId,
        rendered,
    };
}

function assertEquivalence(
    userId: number,
    organizationId: number,
    queueIds: number[],
    groupId: number | null,
    action: "read" | "edit" | "delete",
) {
    const filter = buildRecordAccessFilter(userId, queueIds, groupId, action);
    const sql = buildRecordAccessSql(
        userId,
        organizationId,
        queueIds,
        groupId,
        action,
    );

    const f = normalizeFilter(filter, userId);
    const s = normalizeSql(sql);

    // Shared access logic must be identical between the Prisma filter and the raw SQL.
    expect({
        ownerIdEq: f.ownerIdEq,
        ownerTypeEq: f.ownerTypeEq,
        ownerQueueIdIn: f.ownerQueueIdIn,
        hasShareSubquery: f.hasShareSubquery,
        principals: f.principals,
    }).toEqual({
        ownerIdEq: s.ownerIdEq,
        ownerTypeEq: s.ownerTypeEq,
        ownerQueueIdIn: s.ownerQueueIdIn,
        hasShareSubquery: s.hasShareSubquery,
        principals: s.principals,
    });

    // ownerId must equal the requested user in both representations.
    expect(f.ownerIdEq).toBe(userId);
    expect(s.ownerIdEq).toBe(userId);

    // SQL-specific: organizationId scoping inside the EXISTS subquery (absent from Prisma filter).
    expect(s.organizationId).toBe(organizationId);

    return { filter, sql, f, s };
}

describe("record-access", () => {
    describe("buildRecordAccessFilter", () => {
        it("builds read filters with owner, queue, and share access", () => {
            const filter = buildRecordAccessFilter(1, [2], 3, "read");

            expect(filter.OR).toEqual(
                expect.arrayContaining([
                    { ownerId: 1, ownerType: OwnerType.USER },
                    { ownerQueueId: { in: [2] } },
                ]),
            );

            const shareClause = (filter.OR ?? []).find((entry) => "shares" in entry) as any;
            expect(shareClause).toBeTruthy();
            const shareOr = shareClause.shares.some.OR;
            const userShare = shareOr.find((entry: any) => entry.principalType === "USER");
            const groupShare = shareOr.find((entry: any) => entry.principalType === "GROUP");

            expect(userShare.accessLevel.in).toEqual(
                expect.arrayContaining([
                    ShareAccessLevel.READ,
                    ShareAccessLevel.EDIT,
                    ShareAccessLevel.DELETE,
                ]),
            );
            expect(groupShare.accessLevel.in).toEqual(
                expect.arrayContaining([
                    ShareAccessLevel.READ,
                    ShareAccessLevel.EDIT,
                    ShareAccessLevel.DELETE,
                ]),
            );
        });

        it("omits queue access for edit and delete", () => {
            const filter = buildRecordAccessFilter(1, [2], 3, "edit");
            expect(filter.OR).toEqual(
                expect.arrayContaining([{ ownerId: 1, ownerType: OwnerType.USER }])
            );
            expect(filter.OR).toEqual(
                expect.not.arrayContaining([{ ownerQueueId: { in: [2] } }])
            );
        });
    });

    describe("buildRecordAccessSql", () => {
        it("includes share and queue predicates", () => {
            const sql = buildRecordAccessSql(1, 1, [2], 3, "read");
            expect(sql.sql).toContain("RecordShare");
            expect(sql.sql).toContain("ownerId");
            expect(sql.sql).toContain("ownerQueueId");
        });

        it("omits queue predicate for edit", () => {
            const sql = buildRecordAccessSql(1, 1, [2], 3, "edit");
            expect(sql.sql).toContain("RecordShare");
            expect(sql.sql).toContain("ownerId");
            expect(sql.sql).not.toContain("ownerQueueId IN");
        });
    });

    describe("buildRecordAccessFilter ⇄ buildRecordAccessSql equivalence", () => {
        it("read with userId, queueIds, and groupId produces equivalent access logic", () => {
            const { s } = assertEquivalence(1, 5, [2, 3], 7, "read");

            // Explicit SQL pattern verification (R-04 mitigation).
            expect(s.rendered).toContain(`r."ownerId" = 1`);
            expect(s.rendered).toContain(`r."ownerType" = 'USER'`);
            expect(s.rendered).toContain(`r."ownerQueueId" IN (2,3)`);
            expect(s.rendered).toContain(`EXISTS (`);
            expect(s.rendered).toContain(`FROM "RecordShare" rs`);
            expect(s.rendered).toContain(`rs."organizationId" = 5`);
            // read => READ, EDIT, DELETE
            expect(s.rendered).toContain(
                `rs."accessLevel" IN ('READ','EDIT','DELETE')`,
            );
            // Both USER and GROUP principals present.
            expect(s.principals).toHaveLength(2);
            expect(s.principals.map((p) => p.principalType).sort()).toEqual([
                "GROUP",
                "USER",
            ]);
        });

        it("read without groupId omits the GROUP principal in both representations", () => {
            const { f, s } = assertEquivalence(1, 5, [2, 3], null, "read");

            expect(f.principals).toHaveLength(1);
            expect(f.principals[0].principalType).toBe("USER");
            expect(s.principals).toHaveLength(1);
            expect(s.principals[0].principalType).toBe("USER");
            expect(s.rendered).not.toContain(`rs."principalId" = 7`);
        });

        it("read without queueIds omits ownerQueueId from both representations", () => {
            const { f, s } = assertEquivalence(1, 5, [], 7, "read");

            expect(f.ownerQueueIdIn).toBeNull();
            expect(s.ownerQueueIdIn).toBeNull();
            expect(s.rendered).not.toContain(`r."ownerQueueId" IN`);
        });

        it("edit excludes queue access from the OR clause in both representations", () => {
            const { f, s } = assertEquivalence(1, 5, [2, 3], 7, "edit");

            expect(f.ownerQueueIdIn).toBeNull();
            expect(s.ownerQueueIdIn).toBeNull();
            expect(s.rendered).not.toContain(`r."ownerQueueId" IN`);
            // edit => EDIT, DELETE (no READ).
            for (const p of s.principals) {
                expect(p.accessLevels).toEqual(["DELETE", "EDIT"]);
            }
            for (const p of f.principals) {
                expect(p.accessLevels).toEqual(["DELETE", "EDIT"]);
            }
        });

        it("delete excludes queue access and scopes shares to the DELETE level only", () => {
            const { f, s } = assertEquivalence(1, 5, [2, 3], 7, "delete");

            expect(f.ownerQueueIdIn).toBeNull();
            expect(s.ownerQueueIdIn).toBeNull();
            expect(s.rendered).not.toContain(`r."ownerQueueId" IN`);
            // delete => only DELETE level.
            for (const p of s.principals) {
                expect(p.accessLevels).toEqual(["DELETE"]);
            }
            for (const p of f.principals) {
                expect(p.accessLevels).toEqual(["DELETE"]);
            }
            expect(s.rendered).toContain(`rs."accessLevel" IN ('DELETE')`);
        });
    });

    describe("getUserQueueIds", () => {
        beforeEach(() => {
            mockQueueMemberFindMany.mockReset();
        });

        it("passes organizationId to the findMany WHERE filter", async () => {
            mockQueueMemberFindMany.mockResolvedValue([
                { queueId: 10 },
                { queueId: 20 },
            ]);

            const result = await getUserQueueIds(1, 5);

            expect(mockQueueMemberFindMany).toHaveBeenCalledTimes(1);
            expect(mockQueueMemberFindMany).toHaveBeenCalledWith({
                where: { userId: 1, organizationId: 5 },
                select: { queueId: true },
            });
            expect(result).toEqual([10, 20]);
        });

        it("returns empty array for invalid userId", async () => {
            const result = await getUserQueueIds(NaN, 1);
            expect(result).toEqual([]);
            expect(mockQueueMemberFindMany).not.toHaveBeenCalled();
        });

        it("returns empty array when no memberships exist", async () => {
            mockQueueMemberFindMany.mockResolvedValue([]);

            const result = await getUserQueueIds(1, 5);

            expect(mockQueueMemberFindMany).toHaveBeenCalledWith({
                where: { userId: 1, organizationId: 5 },
                select: { queueId: true },
            });
            expect(result).toEqual([]);
        });

        it("isolates queue IDs by organizationId", async () => {
            mockQueueMemberFindMany.mockResolvedValue([
                { queueId: 10 },
            ]);

            await getUserQueueIds(1, 5);

            const call = mockQueueMemberFindMany.mock.calls[0][0];
            expect(call.where.organizationId).toBe(5);
            expect(call.where.userId).toBe(1);
        });
    });
});
