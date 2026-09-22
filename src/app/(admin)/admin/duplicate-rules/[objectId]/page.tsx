import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DuplicateRuleActions } from "@/components/admin/duplicate-rules/duplicate-rule-actions";
import { DuplicateRuleOrderControls } from "@/components/admin/duplicate-rules/duplicate-rule-order-controls";
import { USER_OBJECT_API_NAME } from "@/lib/user-companion";

export default async function DuplicateRulesObjectPage({ params }: { params: Promise<{ objectId: string }> }) {
    const session = await auth();
    if (!session?.user) return null;
    const t = await getT();
    const organizationId = Number(session.user.organizationId ?? NaN);
    const { objectId } = await params;
    const objectDefId = parseInt(objectId, 10);

    if (Number.isNaN(objectDefId)) return notFound();

    const [objectDef, rules] = await Promise.all([
        db.objectDefinition.findFirst({
            where: { id: objectDefId, organizationId, apiName: { not: USER_OBJECT_API_NAME } },
            select: { id: true, label: true },
        }),
        db.duplicateRule.findMany({
            where: { organizationId, objectDefId },
            include: {
                conditions: {
                    include: {
                        fieldDef: { select: { label: true } },
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: { sortOrder: "asc" },
        }),
    ]);

    if (!objectDef) return notFound();

    const ruleIds = rules.map((rule) => rule.id);

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/duplicate-rules">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("admin.duplicateRuleDetail.title", { objectLabel: objectDef.label })}</h1>
                    <p className="text-sm text-muted-foreground">{t("admin.duplicateRuleDetail.evaluationNote")}</p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{t("admin.duplicateRuleDetail.orderHelp")}</div>
                <Button asChild>
                    <Link href={`/admin/duplicate-rules/${objectDef.id}/new`}>{t("admin.duplicateRuleDetail.newRule")}</Link>
                </Button>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("admin.duplicateRuleDetail.order")}</TableHead>
                            <TableHead>{t("shared.common.name")}</TableHead>
                            <TableHead>{t("admin.duplicateRuleDetail.create")}</TableHead>
                            <TableHead>{t("admin.duplicateRuleDetail.edit")}</TableHead>
                            <TableHead>{t("admin.duplicateRuleDetail.fields")}</TableHead>
                            <TableHead>{t("admin.duplicateRuleDetail.status")}</TableHead>
                            <TableHead className="w-[180px]">{t("shared.common.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.map((rule, index) => (
                            <TableRow key={rule.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{index + 1}</span>
                                        <DuplicateRuleOrderControls objectDefId={objectDef.id} ruleIds={ruleIds} index={index} />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    <Link href={`/admin/duplicate-rules/${objectDef.id}/${rule.id}`} className="hover:underline">
                                        {rule.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{rule.createAction}</TableCell>
                                <TableCell>{rule.editAction}</TableCell>
                                <TableCell>
                                    {rule.conditions.map((condition) => condition.fieldDef.label).join(", ")}
                                </TableCell>
                                <TableCell>{rule.isActive ? t("shared.status.active") : t("shared.status.inactive")}</TableCell>
                                <TableCell>
                                    <DuplicateRuleActions ruleId={rule.id} isActive={rule.isActive} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {rules.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                    {t("admin.duplicateRuleDetail.noRulesYet")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
