import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OPERATOR_KEYS: Record<string, string> = {
    equals: "admin.ruleOperators.equals",
    not_equals: "admin.ruleOperators.notEquals",
    gt: "admin.ruleOperators.greaterThan",
    gte: "admin.ruleOperators.greaterOrEqual",
    lt: "admin.ruleOperators.lessThan",
    lte: "admin.ruleOperators.lessOrEqual",
    contains: "admin.ruleOperators.contains",
    not_contains: "admin.ruleOperators.doesNotContain",
    is_blank: "admin.ruleOperators.isBlank",
    is_not_blank: "admin.ruleOperators.isNotBlank",
};

type CriteriaFilter = {
    fieldDefId?: number;
    field?: string;
    operator?: string;
    value?: string;
};

type CriteriaPayload = {
    logic?: "ALL" | "ANY";
    filters?: CriteriaFilter[];
};

export default async function AssignmentRuleDetailPage({
    params,
}: {
    params: Promise<{ objectId: string; ruleId: string }>;
}) {
    const session = await auth();
    if (!session?.user) return null;
    const t = await getT();
    const organizationId = Number(session.user.organizationId ?? NaN);
    const { objectId, ruleId } = await params;
    const objectDefId = parseInt(objectId, 10);
    const assignmentRuleId = parseInt(ruleId, 10);

    if (isNaN(objectDefId) || isNaN(assignmentRuleId)) return notFound();

    const rule = await db.assignmentRule.findUnique({
        where: { id: assignmentRuleId, organizationId },
        include: {
            objectDef: {
                include: {
                    fields: {
                        include: {
                            picklistOptions: {
                                select: { id: true, label: true, isActive: true },
                                orderBy: { sortOrder: "asc" },
                            },
                        },
                    },
                },
            },
            targetUser: true,
            targetQueue: true,
        },
    });

    if (!rule || rule.objectDefId !== objectDefId) return notFound();

    const criteria = (rule.criteria as CriteriaPayload | null) ?? {};
    const logic = criteria.logic || "ALL";
    const filters = criteria.filters || [];

    const fieldById = new Map(rule.objectDef.fields.map((field) => [field.id, field]));
    const fieldByApi = new Map(rule.objectDef.fields.map((field) => [field.apiName, field]));

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/admin/assignment-rules/${objectDefId}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{rule.name}</h1>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.assignmentRuleDetail.ruleSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                        <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.object")}</div>
                        <div className="text-sm font-medium">{rule.objectDef.label}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.target")}</div>
                        <div className="text-sm font-medium">
                            {rule.targetType === "USER"
                                ? `${rule.targetUser?.name || rule.targetUser?.email || t("shared.common.userFallback", { id: rule.targetUserId })} (@${rule.targetUser?.username || t("shared.common.unknown")})`
                                : rule.targetQueue?.name || t("shared.common.queueFallback", { id: rule.targetQueueId })}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.status")}</div>
                        <div className="text-sm font-medium">{rule.isActive ? t("shared.status.active") : t("shared.status.inactive")}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.order")}</div>
                        <div className="text-sm font-medium">{rule.sortOrder}</div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.assignmentRuleDetail.criteria")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {filters.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{t("admin.assignmentRuleDetail.noCriteria")}</div>
                    ) : (
                        <>
                            <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.matchLogic", { logic })}</div>
                            <div className="space-y-3">
                                {filters.map((filter, index) => {
                                    const field =
                                        filter.fieldDefId !== undefined
                                            ? fieldById.get(filter.fieldDefId)
                                            : filter.field
                                                ? fieldByApi.get(filter.field)
                                                : null;
                                    const operatorLabel = filter.operator
                    ? (OPERATOR_KEYS[filter.operator] ? t(OPERATOR_KEYS[filter.operator]) : filter.operator)
                    : t("admin.ruleOperators.equals");
                                    const valueLabel =
                                        filter.operator === "is_blank" || filter.operator === "is_not_blank"
                                            ? "-"
                                            : field?.type === "Picklist"
                                                ? (field.picklistOptions || []).find(
                                                    (opt: any) => String(opt.id) === String(filter.value)
                                                )?.label ?? filter.value ?? ""
                                                : filter.value ?? "";

                                    return (
                                        <div key={`${field?.id ?? filter.field ?? index}`} className="rounded-lg border p-3">
                                            <div className="text-xs text-muted-foreground">{t("admin.assignmentRuleDetail.condition", { count: index + 1 })}</div>
                                            <div className="text-sm font-medium">{field?.label ?? filter.field ?? t("admin.assignmentRuleDetail.unknownField")}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {operatorLabel} {valueLabel && valueLabel !== "-" ? `"${valueLabel}"` : ""}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
