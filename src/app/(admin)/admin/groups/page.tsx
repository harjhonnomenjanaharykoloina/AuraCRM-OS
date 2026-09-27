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
import { BadgeCheck, Layers, Shield, Users } from "lucide-react";
import { CreateGroupDialog } from "@/components/admin/groups/create-group-dialog";
import { Badge } from "@/components/ui/badge";

export default async function GroupsPage() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;

    const groups = await db.group.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: {
            _count: { select: { users: true } },
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-200/40 blur-2xl" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                                <Users className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("admin.groups.title")}</h1>
                                <p className="text-sm text-slate-600">
                                    {t("admin.groups.description")}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{t("admin.groups.badges.sharingAudiences")}</Badge>
                            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">{t("admin.groups.badges.onePerUser")}</Badge>
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{t("admin.groups.badges.userOwned")}</Badge>
                        </div>
                    </div>
                    <CreateGroupDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <Shield className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.groups.features.sharingRules.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.groups.features.sharingRules.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <Layers className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.groups.features.audienceScope.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.groups.features.audienceScope.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <BadgeCheck className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.groups.features.permissionAware.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.groups.features.permissionAware.description")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("shared.common.name")}</TableHead>
                            <TableHead>{t("shared.common.description")}</TableHead>
                            <TableHead>{t("admin.groups.table.users")}</TableHead>
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
                                <TableCell>{group._count.users}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/groups/${group.id}`}>{t("admin.groups.manage")}</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {groups.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {t("admin.groups.noGroupsFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
