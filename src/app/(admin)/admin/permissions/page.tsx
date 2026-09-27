import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
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
import { Shield } from "lucide-react";
import { CreatePermissionSetDialog } from "@/components/admin/permissions/create-permission-set-dialog";

export default async function PermissionSetsPage() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;

    const permissionSets = await db.permissionSet.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { assignments: true },
            },
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("admin.permissionSets.title")}</h1>
                    <p className="text-muted-foreground">
                        {t("admin.permissionSets.subtitle")}
                    </p>
                </div>
                <CreatePermissionSetDialog />
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("shared.common.name")}</TableHead>
                            <TableHead>{t("shared.common.description")}</TableHead>
                            <TableHead>{t("admin.permissionSets.assignedUsers")}</TableHead>
                            <TableHead className="w-[100px]">{t("shared.common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissionSets.map((ps) => (
                            <TableRow key={ps.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        {ps.name}
                                    </div>
                                </TableCell>
                                <TableCell>{ps.description}</TableCell>
                                <TableCell>{ps._count.assignments}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/permissions/${ps.id}`}>
                                            {t("shared.buttons.manage")}
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {permissionSets.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {t("admin.permissionSets.noPermissionSetsEmpty")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
