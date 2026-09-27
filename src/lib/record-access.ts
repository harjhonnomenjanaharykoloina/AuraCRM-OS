import { db } from "@/lib/db";
import { CacheKeys, getOrSet } from "@/lib/cache";
import { getUserPermissionSetIds } from "@/lib/permissions";
import { OwnerType, PrincipalType, Prisma, ShareAccessLevel } from "@prisma/client";

export async function getUserQueueIds(userId: number, organizationId: number): Promise<number[]> {
    if (!userId || Number.isNaN(userId)) return [];
    const memberships = await db.queueMember.findMany({
        where: { userId, organizationId },
        select: { queueId: true },
    });
    return memberships.map(m => m.queueId);
}

type RecordAccessAction = "read" | "edit" | "delete";

function getShareAccessLevels(action: RecordAccessAction) {
    switch (action) {
        case "delete":
            return [ShareAccessLevel.DELETE];
        case "edit":
            return [ShareAccessLevel.EDIT, ShareAccessLevel.DELETE];
        default:
            return [ShareAccessLevel.READ, ShareAccessLevel.EDIT, ShareAccessLevel.DELETE];
    }
}

export function buildRecordAccessFilter(
    userId: number,
    queueIds: number[],
    groupId?: number | null,
    action: RecordAccessAction = "read"
): Prisma.RecordWhereInput {
    const orFilters: Prisma.RecordWhereInput[] = [{ ownerId: userId, ownerType: OwnerType.USER }];

    if (queueIds.length > 0 && action === "read") {
        orFilters.push({ ownerQueueId: { in: queueIds } });
    }

    const shareOr: Prisma.RecordShareWhereInput[] = [
        {
            principalType: PrincipalType.USER,
            principalId: userId,
            accessLevel: { in: getShareAccessLevels(action) },
        },
    ];

    if (groupId) {
        shareOr.push({
            principalType: PrincipalType.GROUP,
            principalId: groupId,
            accessLevel: { in: getShareAccessLevels(action) },
        });
    }

    orFilters.push({
        shares: {
            some: {
                OR: shareOr,
            },
        },
    });

    return { OR: orFilters };
}

export function buildRecordAccessSql(
    userId: number,
    organizationId: number,
    queueIds: number[],
    groupId?: number | null,
    action: RecordAccessAction = "read"
): Prisma.Sql {
    const accessConditions: Prisma.Sql[] = [
        Prisma.sql`(r."ownerId" = ${userId} AND r."ownerType" = ${OwnerType.USER})`,
    ];

    if (queueIds.length > 0 && action === "read") {
        accessConditions.push(
            Prisma.sql`r."ownerQueueId" IN (${Prisma.join(queueIds)})`
        );
    }

    const shareLevels = getShareAccessLevels(action);
    const shareConditions: Prisma.Sql[] = [
        Prisma.sql`(rs."principalType" = ${PrincipalType.USER} AND rs."principalId" = ${userId} AND rs."accessLevel" IN (${Prisma.join(shareLevels)}))`,
    ];

    if (groupId) {
        shareConditions.push(
            Prisma.sql`(rs."principalType" = ${PrincipalType.GROUP} AND rs."principalId" = ${groupId} AND rs."accessLevel" IN (${Prisma.join(shareLevels)}))`
        );
    }

    accessConditions.push(
        Prisma.sql`EXISTS (
            SELECT 1
            FROM "RecordShare" rs
            WHERE rs."recordId" = r."id"
              AND rs."organizationId" = ${organizationId}
              AND (${Prisma.join(shareConditions, " OR ")})
        )`
    );

    return Prisma.sql`AND (${Prisma.join(accessConditions, " OR ")})`;
}


export type UserAccessContext = {
    userId: number;
    organizationId: number;
    queueIds: number[];
    userGroupId: number | null;
    permissionSetIds: number[];
};

const USER_ACCESS_CONTEXT_TTL_SECONDS = 5 * 60;

/**
 * Fetches the user's queue IDs, group ID, and permission set IDs in a
 * single cached batch.  The combined result is cached for 5 minutes so
 * that downstream callers (e.g. record CRUD actions) avoid redundant DB
 * queries within the same request lifecycle.
 */
export async function getUserAccessContext(
    userId: number,
    organizationId: number
): Promise<UserAccessContext> {
    if (!userId || Number.isNaN(userId)) {
        return {
            userId,
            organizationId,
            queueIds: [],
            userGroupId: null,
            permissionSetIds: [],
        };
    }

    const cacheKey = CacheKeys.userAccessContext(userId, organizationId);
    const cached = await getOrSet<UserAccessContext>(
        cacheKey,
        USER_ACCESS_CONTEXT_TTL_SECONDS,
        async () => {
            const [queueIds, userRecord, permissionSetIds] = await Promise.all([
                getUserQueueIds(userId, organizationId),
                db.user.findUnique({
                    where: { id: userId },
                    select: { groupId: true },
                }),
                getUserPermissionSetIds(userId),
            ]);

            return {
                userId,
                organizationId,
                queueIds,
                userGroupId: userRecord?.groupId ?? null,
                permissionSetIds,
            };
        }
    );

    if (cached) {
        return cached;
    }

    // Fallback when cache layer is unavailable (getOrSet returns fresh)
    const [queueIds, userRecord, permissionSetIds] = await Promise.all([
        getUserQueueIds(userId, organizationId),
        db.user.findUnique({
            where: { id: userId },
            select: { groupId: true },
        }),
        getUserPermissionSetIds(userId),
    ]);

    return {
        userId,
        organizationId,
        queueIds,
        userGroupId: userRecord?.groupId ?? null,
        permissionSetIds,
    };
}