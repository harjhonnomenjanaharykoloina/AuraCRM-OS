import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CircleHelp, LayoutGrid } from "lucide-react";
import { ObjectPermissionToggle } from "@/components/admin/permissions/object-permission-toggle";
import { AppPermissionToggle } from "@/components/admin/permissions/app-permission-toggle";
import { SystemPermissionToggle } from "@/components/admin/permissions/system-permission-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { USER_OBJECT_API_NAME } from "@/lib/user-companion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type TFunction } from "@/i18n/t";

type PermissionHeaderName = "read" | "create" | "edit" | "delete" | "viewAll" | "modifyAll" | "modifyListViews";

function PermissionHeader({ t, name }: { t: TFunction; name: PermissionHeaderName }) {
    const labelKey = `admin.permissionSetDetail.objectPermissionHelp.${name}Label`;
    const helpKey = `admin.permissionSetDetail.objectPermissionHelp.${name}Help`;
    return (
        <div className="flex items-center justify-center gap-1.5">
            <span>{t(labelKey)}</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label={t("admin.permissionSetDetail.permissionHelpAria", { permission: t(labelKey) })}
                    >
                        <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-sm leading-relaxed">
                    {t(helpKey)}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default async function PermissionSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;
    const { id } = await params;
    const permissionSetId = parseInt(id);

    if (isNaN(permissionSetId)) notFound();

    const permissionSet = await db.permissionSet.findUnique({
        where: { id: permissionSetId, organizationId },
    });

    if (!permissionSet) notFound();

    // 1. Fetch Object Permissions
    const objectDefs = await db.objectDefinition.findMany({
        where: { organizationId },
        orderBy: { label: "asc" },
        include: {
            permissions: {
                where: { permissionSetId },
            },
        },
    });

    // 2. Fetch App Permissions
    const apps = await db.appDefinition.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: {
            permissions: {
                where: { permissionSetId },
            },
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/permissions">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{permissionSet.name}</h1>
                    <p className="text-muted-foreground">{permissionSet.description}</p>
                </div>
            </div>

            <Tabs defaultValue="objects" className="w-full space-y-6">
                <TabsList className="flex w-full justify-start border-b bg-transparent p-0 h-auto">
                    <TabsTrigger
                        value="objects"
                        className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                        {t("admin.permissionSetDetail.objectPermissions")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="apps"
                        className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                        {t("admin.permissionSetDetail.appPermissions")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="system"
                        className="rounded-none border-b-2 border-transparent px-4 py-2 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                        {t("admin.permissionSetDetail.systemPermissions")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="objects" className="space-y-4 mt-4">
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("admin.permissionSetDetail.object")}</TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="read" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="create" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="edit" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="delete" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="viewAll" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="modifyAll" /></TableHead>
                                    <TableHead className="text-center"><PermissionHeader t={t} name="modifyListViews" /></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {objectDefs.map((obj) => {
                                    const perm = obj.permissions[0] || {};
                                    const isLockedUserPermission = (field: string) =>
                                        obj.apiName === USER_OBJECT_API_NAME &&
                                        ["allowCreate", "allowEdit", "allowDelete", "allowModifyAll"].includes(field);
                                    return (
                                        <TableRow key={obj.id}>
                                            <TableCell className="font-medium">{obj.label}</TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowRead"
                                                    initialValue={perm.allowRead || false}
                                                    disabled={false}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowCreate"
                                                    initialValue={perm.allowCreate || false}
                                                    disabled={isLockedUserPermission("allowCreate")}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowEdit"
                                                    initialValue={perm.allowEdit || false}
                                                    disabled={isLockedUserPermission("allowEdit")}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowDelete"
                                                    initialValue={perm.allowDelete || false}
                                                    disabled={isLockedUserPermission("allowDelete")}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowViewAll"
                                                    initialValue={perm.allowViewAll || false}
                                                    disabled={false}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowModifyAll"
                                                    initialValue={perm.allowModifyAll || false}
                                                    disabled={isLockedUserPermission("allowModifyAll")}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <ObjectPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    objectDefId={obj.id}
                                                    field="allowModifyListViews"
                                                    initialValue={perm.allowModifyListViews || false}
                                                    disabled={false}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="apps" className="space-y-4 mt-4">
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("admin.permissionSetDetail.appName")}</TableHead>
                                    <TableHead>{t("shared.common.description")}</TableHead>
                                    <TableHead className="w-[100px] text-center">{t("admin.permissionSetDetail.access")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apps.map((app) => {
                                    const hasAccess = app.permissions.length > 0;
                                    return (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                                                    {app.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{app.description}</TableCell>
                                            <TableCell className="text-center">
                                                <AppPermissionToggle
                                                    permissionSetId={permissionSetId}
                                                    appId={app.id}
                                                    initialValue={hasAccess}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {apps.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            {t("admin.permissionSetDetail.noAppsFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="system" className="space-y-4 mt-4">
                    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("admin.permissionSetDetail.permission")}</TableHead>
                                    <TableHead>{t("shared.common.description")}</TableHead>
                                    <TableHead className="w-[120px] text-center">{t("admin.permissionSetDetail.enabled")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">{t("admin.permissionSetDetail.dataLoading")}</TableCell>
                                    <TableCell>
                                        {t("admin.permissionSetDetail.dataLoadingHelp")}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <SystemPermissionToggle
                                            permissionSetId={permissionSetId}
                                            field="allowDataLoading"
                                            initialValue={permissionSet.allowDataLoading || false}
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
