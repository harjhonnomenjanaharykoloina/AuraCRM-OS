export type SeedObjectDef = { id: number; apiName: string };

type PermissionFlags = {
    allowRead: boolean;
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    allowViewAll: boolean;
    allowModifyAll: boolean;
    allowModifyListViews: boolean;
};

const FULL: PermissionFlags = {
    allowRead: true,
    allowCreate: true,
    allowEdit: true,
    allowDelete: true,
    allowViewAll: true,
    allowModifyAll: true,
    allowModifyListViews: true,
};

type RoleSpec = {
    name: string;
    description: string;
    allowDataLoading: boolean;
    objectPermissions: (obj: SeedObjectDef) => PermissionFlags | null;
};

const ROLES: RoleSpec[] = [
    {
        name: "Owner",
        description: "Full access to all records and administration.",
        allowDataLoading: true,
        objectPermissions: () => FULL,
    },
    {
        name: "Admin",
        description: "Administrator with full access to business records.",
        allowDataLoading: true,
        objectPermissions: (obj) => (obj.apiName === "user" ? null : FULL),
    },
    {
        name: "Manager",
        description: "Manage team records: read, create, edit, and view all.",
        allowDataLoading: false,
        objectPermissions: (obj) =>
            obj.apiName === "user"
                ? null
                : {
                      allowRead: true,
                      allowCreate: true,
                      allowEdit: true,
                      allowDelete: true,
                      allowViewAll: true,
                      allowModifyAll: false,
                      allowModifyListViews: true,
                  },
    },
    {
        name: "Sales",
        description: "Create and edit your own records.",
        allowDataLoading: false,
        objectPermissions: (obj) =>
            obj.apiName === "user"
                ? null
                : {
                      allowRead: true,
                      allowCreate: true,
                      allowEdit: true,
                      allowDelete: true,
                      allowViewAll: false,
                      allowModifyAll: false,
                      allowModifyListViews: true,
                  },
    },
    {
        name: "Viewer",
        description: "Read-only access to records.",
        allowDataLoading: false,
        objectPermissions: (obj) =>
            obj.apiName === "user"
                ? null
                : {
                      allowRead: true,
                      allowCreate: false,
                      allowEdit: false,
                      allowDelete: false,
                      allowViewAll: false,
                      allowModifyAll: false,
                      allowModifyListViews: false,
                  },
    },
];

export async function createDefaultAppAndPermissionSets(
    tx: any,
    organizationId: number,
    objectDefs: SeedObjectDef[]
) {
    // 1. Default CRM app
    const app = await tx.appDefinition.create({
        data: {
            organizationId,
            name: "CRM",
            apiName: "crm",
            icon: "LayoutDashboard",
        },
    });

    // 2. A nav item for every seeded object, in the given order
    await tx.appNavItem.createMany({
        data: objectDefs.map((obj, index) => ({
            appId: app.id,
            objectDefId: obj.id,
            sortOrder: index,
        })),
    });

    // 3. Role-based permission sets
    const permissionSets: Record<string, { id: number }> = {};
    for (const role of ROLES) {
        const created = await tx.permissionSet.create({
            data: {
                organizationId,
                name: role.name,
                description: role.description,
                allowDataLoading: role.allowDataLoading,
            },
        });
        permissionSets[role.name] = { id: created.id };

        const rows: Array<Record<string, unknown>> = [];
        for (const obj of objectDefs) {
            const flags = role.objectPermissions(obj);
            if (!flags) continue;
            rows.push({
                permissionSetId: created.id,
                objectDefId: obj.id,
                ...flags,
            });
        }
        if (rows.length > 0) {
            await tx.objectPermission.createMany({ data: rows });
        }

        await tx.appPermission.createMany({
            data: [{ permissionSetId: created.id, appId: app.id }],
        });
    }

    return {
        app: { id: app.id, apiName: app.apiName },
        permissionSets,
    };
}
