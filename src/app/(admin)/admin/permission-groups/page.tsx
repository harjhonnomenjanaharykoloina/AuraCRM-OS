import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
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
import { Users } from "lucide-react";
import { CreatePermissionGroupDialog } from "@/components/admin/permissions/create-permission-group-dialog";
import { getSessionUser } from "@/lib/auth/types";

export default async function PermissionGroupsPage() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;

    const groups = await db.permissionSetGroup.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { permissionSets: true },
            },
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("admin.permissionGroups.title")}</h1>
                    <p className="text-muted-foreground">
                        {t("admin.permissionGroups.subtitle")}
                    </p>
                </div>
                <CreatePermissionGroupDialog />
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("shared.common.name")}</TableHead>
                            <TableHead>{t("shared.common.description")}</TableHead>
                            <TableHead>{t("admin.permissionSets.title")}</TableHead>
                            <TableHead className="w-[100px]">{t("shared.common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.map((group) => (
                            <TableRow key={group.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        {group.name}
                                    </div>
                                </TableCell>
                                <TableCell>{group.description}</TableCell>
                                <TableCell>{group._count.permissionSets}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/permission-groups/${group.id}`}>
                                            {t("shared.buttons.manage")}
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {groups.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {t("admin.permissionGroups.noGroupsFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
