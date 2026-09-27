import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SharingRuleActions } from "@/components/admin/sharing-rules/sharing-rule-actions";
import { SharingRuleOrderControls } from "@/components/admin/sharing-rules/sharing-rule-order-controls";

export default async function SharingRulesObjectPage({ params }: { params: Promise<{ objectId: string }> }) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;
    const { objectId } = await params;
    const objectDefId = parseInt(objectId, 10);

    if (isNaN(objectDefId)) return notFound();

    const [objectDef, rules] = await Promise.all([
        db.objectDefinition.findUnique({
            where: { id: objectDefId, organizationId },
            select: { id: true, label: true, apiName: true },
        }),
        db.sharingRule.findMany({
            where: { organizationId, objectDefId },
            include: { targetGroup: true },
            orderBy: { sortOrder: "asc" },
        }),
    ]);

    if (!objectDef) return notFound();

    const ruleIds = rules.map((rule) => rule.id);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/sharing-rules">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("admin.sharingRuleDetail.title", { objectLabel: objectDef.label })}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("admin.sharingRuleDetail.evaluationNote")}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {t("admin.sharingRuleDetail.orderHelp")}
                </div>
                <Button asChild>
                    <Link href={`/admin/sharing-rules/${objectDef.id}/new`}>{t("admin.sharingRuleDetail.newRule")}</Link>
                </Button>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("admin.sharingRuleDetail.order")}</TableHead>
                            <TableHead>{t("shared.common.name")}</TableHead>
                            <TableHead>{t("admin.sharingRuleDetail.group")}</TableHead>
                            <TableHead>{t("admin.sharingRuleDetail.access")}</TableHead>
                            <TableHead>{t("admin.sharingRuleDetail.status")}</TableHead>
                            <TableHead className="w-[180px]">{t("shared.common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.map((rule, index) => (
                            <TableRow key={rule.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{index + 1}</span>
                                        <SharingRuleOrderControls
                                            objectDefId={objectDef.id}
                                            ruleIds={ruleIds}
                                            index={index}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/admin/sharing-rules/${objectDef.id}/${rule.id}`} className="hover:underline">
                                        {rule.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{rule.targetGroup?.name ?? t("admin.sharingRuleDetail.unknownGroup")}</TableCell>
                                <TableCell>{rule.accessLevel === "DELETE" ? t("admin.sharingRuleDetail.editDelete") : rule.accessLevel}</TableCell>
                                <TableCell>{rule.isActive ? t("shared.status.active") : t("shared.status.inactive")}</TableCell>
                                <TableCell>
                                    <SharingRuleActions ruleId={rule.id} isActive={rule.isActive} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {rules.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    {t("admin.sharingRuleDetail.noRulesYet")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
