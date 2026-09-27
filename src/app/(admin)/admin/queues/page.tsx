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
import { Bell, Inbox, UserCheck, Workflow } from "lucide-react";
import { CreateQueueDialog } from "@/components/admin/queues/create-queue-dialog";
import { Badge } from "@/components/ui/badge";

export default async function QueuesPage() {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;

    const queues = await db.queue.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: {
            _count: { select: { members: true } },
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 via-white to-amber-50 p-6 shadow-sm">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-200/40 blur-2xl" />
                <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
                                <Inbox className="h-6 w-6" />
                            </span>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("admin.queues.title")}</h1>
                                <p className="text-sm text-slate-600">
                                    {t("admin.queues.description")}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">{t("admin.queues.badges.readOnly")}</Badge>
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">{t("admin.queues.badges.notifications")}</Badge>
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{t("admin.queues.badges.global")}</Badge>
                        </div>
                    </div>
                    <CreateQueueDialog />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <Workflow className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.queues.features.assignmentRules.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.queues.features.assignmentRules.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <Bell className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.queues.features.instantAlerts.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.queues.features.instantAlerts.description")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <UserCheck className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{t("admin.queues.features.claimToEdit.title")}</p>
                            <p className="text-xs text-slate-600">
                                {t("admin.queues.features.claimToEdit.description")}
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
                            <TableHead>{t("admin.queues.table.members")}</TableHead>
                            <TableHead className="w-[100px]">{t("shared.common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {queues.map((queue) => (
                            <TableRow key={queue.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Inbox className="h-4 w-4 text-muted-foreground" />
                                        {queue.name}
                                    </div>
                                </TableCell>
                                <TableCell>{queue.description}</TableCell>
                                <TableCell>{queue._count.members}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/queues/${queue.id}`}>{t("admin.queues.manage")}</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {queues.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    {t("admin.queues.noQueuesFound")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
