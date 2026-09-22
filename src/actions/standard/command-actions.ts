"use server";

import { getUserContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getAvailableApps, getSearchableObjects } from "@/lib/permissions";
import { buildRecordAccessFilter, getUserQueueIds } from "@/lib/record-access";
import { getMessages, createTFunction } from "@/i18n/server";

export type CommandCategory = "object" | "record" | "action";

export interface CommandItem {
    id: string;
    label: string;
    objectApiName: string;
    recordId?: number;
    href: string;
    icon: string;
    category: CommandCategory;
}

const RECENT_LIMIT = 8;
const QUICK_ACTION_OBJECTS = ["lead", "opportunity", "task", "company", "contact"];

function matchesQuery(label: string, apiName: string, query: string): boolean {
    if (!query) return true;
    return `${label} ${apiName}`.toLowerCase().includes(query);
}

export async function getCommandItems(search?: string): Promise<CommandItem[]> {
    const { userId, organizationId, userType } = await getUserContext();
    const query = (search ?? "").trim().toLowerCase();

    const messages = await getMessages();
    const t = createTFunction(messages);

    const apps = await getAvailableApps(userId, organizationId, userType);
    const firstApp = apps.length > 0 ? apps[0] : null;

    const searchable = await getSearchableObjects(userId, organizationId);
    const readableById = new Map(searchable.map((o) => [o.id, o]));

    const items: CommandItem[] = [];

    if (!firstApp) {
        return items;
    }

    const appApiName = firstApp.apiName;

    const navItems = await db.appNavItem.findMany({
        where: { appId: firstApp.id },
        include: { objectDef: true },
        orderBy: { sortOrder: "asc" },
    });

    const dashboard: CommandItem = {
        id: "object-dashboard",
        label: t("standard.pages.dashboard.title"),
        objectApiName: "dashboard",
        href: `/app/${appApiName}/dashboard`,
        icon: "LayoutDashboard",
        category: "object",
    };
    if (matchesQuery(dashboard.label, dashboard.objectApiName, query)) {
        items.push(dashboard);
    }

    const readableNavObjects: Array<{
        id: number;
        apiName: string;
        label: string;
        icon: string | null;
    }> = [];

    for (const nav of navItems) {
        if (!readableById.has(nav.objectDefId)) continue;

        const objectItem: CommandItem = {
            id: `object-${nav.objectDef.apiName}`,
            label: nav.objectDef.pluralLabel,
            objectApiName: nav.objectDef.apiName,
            href: `/app/${appApiName}/${nav.objectDef.apiName}`,
            icon: nav.objectDef.icon ?? "Box",
            category: "object",
        };
        if (matchesQuery(objectItem.label, objectItem.objectApiName, query)) {
            items.push(objectItem);
        }

        readableNavObjects.push({
            id: nav.objectDef.id,
            apiName: nav.objectDef.apiName,
            label: nav.objectDef.label,
            icon: nav.objectDef.icon,
        });
    }

    const queueIds = await getUserQueueIds(userId);
    const userGroupId = (
        await db.user.findUnique({
            where: { id: userId },
            select: { groupId: true },
        })
    )?.groupId ?? null;

    for (const obj of readableNavObjects) {
        const readable = readableById.get(obj.id);
        const accessFilter = readable?.access.canReadAll
            ? null
            : buildRecordAccessFilter(userId, queueIds, userGroupId);

        const records = await db.record.findMany({
            where: {
                organizationId,
                objectDefId: obj.id,
                isDeleted: false,
                ...(accessFilter ?? {}),
            },
            select: { id: true, name: true },
            orderBy: { updatedAt: "desc" },
            take: RECENT_LIMIT,
        });

        for (const record of records) {
            const name = record.name || `Record #${record.id}`;
            if (!matchesQuery(name, obj.apiName, query)) continue;
            items.push({
                id: `record-${obj.apiName}-${record.id}`,
                label: name,
                objectApiName: obj.apiName,
                recordId: record.id,
                href: `/app/${appApiName}/${obj.apiName}/${record.id}`,
                icon: obj.icon ?? "Box",
                category: "record",
            });
        }
    }

    const readableApiNames = new Set(readableNavObjects.map((o) => o.apiName));
    for (const apiName of QUICK_ACTION_OBJECTS) {
        if (!readableApiNames.has(apiName)) continue;
        const readable = searchable.find((o) => o.apiName === apiName);
        const label = `Create ${readable?.label ?? apiName}`;
        const actionItem: CommandItem = {
            id: `action-${apiName}`,
            label,
            objectApiName: apiName,
            href: `/app/${appApiName}/${apiName}/new`,
            icon: readable?.icon ?? "Plus",
            category: "action",
        };
        if (matchesQuery(actionItem.label, actionItem.objectApiName, query)) {
            items.push(actionItem);
        }
    }

    return items;
}
