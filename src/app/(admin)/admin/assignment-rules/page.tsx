import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Shuffle, UserRound, Workflow } from "lucide-react";
import { USER_OBJECT_API_NAME } from "@/lib/user-companion";

export default async function AssignmentRulesPage() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;

    const objects = await db.objectDefinition.findMany({
        where: {
            organizationId,
            apiName: { not: USER_OBJECT_API_NAME },
        },
        select: {
            id: true,
            label: true,
            apiName: true,
            _count: { select: { assignmentRules: true } },
        },
        orderBy: { label: "asc" },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-6 shadow-sm">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-200/40 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                <div className="relative space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                            <ClipboardList className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("admin.assignmentRules.title")}</h1>
                            <p className="text-sm text-slate-600">
                                {t("admin.assignmentRules.listDescription")}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">{t("admin.assignmentRules.badges.createTimeOnly")}</Badge>
                        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">{t("admin.assignmentRules.badges.firstMatchWins")}</Badge>
                        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{t("admin.assignmentRules.badges.priorityOrder")}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                            <Workflow className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.assignmentRules.features.routingLogic.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.assignmentRules.features.routingLogic.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Shuffle className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.assignmentRules.features.priorityOrder.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.assignmentRules.features.priorityOrder.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <UserRound className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.assignmentRules.features.targetedOwnership.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.assignmentRules.features.targetedOwnership.description")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("admin.assignmentRules.table.object")}</TableHead>
                            <TableHead>{t("admin.assignmentRules.table.rules")}</TableHead>
                            <TableHead className="w-[140px]">{t("admin.assignmentRules.table.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {objects.map((object) => (
                            <TableRow key={object.id}>
                                <TableCell className="font-medium">{object.label}</TableCell>
                                <TableCell>{object._count.assignmentRules}</TableCell>
                                <TableCell>
                                    <Link
                                        href={`/admin/assignment-rules/${object.id}`}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        {t("admin.assignmentRules.table.manage")}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {objects.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    {t("admin.assignmentRules.table.noObjects")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
