"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createDuplicateRule, updateDuplicateRule } from "@/actions/admin/duplicate-rule-actions";
import { validateCustomLogicExpressionInput } from "@/lib/validation/rule-logic";
import { useTranslations } from "@/i18n/client";

type FieldOption = {
    id: number;
    label: string;
    apiName: string;
    type: string;
};

type ObjectOption = {
    id: number;
    label: string;
    apiName: string;
};

type DuplicateRuleFormProps = {
    mode: "create" | "edit";
    objectDef: ObjectOption;
    fields: FieldOption[];
    initial?: {
        id?: number;
        name?: string;
        description?: string | null;
        isActive?: boolean;
        createAction?: "NONE" | "WARN" | "BLOCK";
        editAction?: "NONE" | "WARN" | "BLOCK";
        logicOperator?: "ALL" | "ANY" | "CUSTOM";
        logicExpression?: string | null;
        fieldDefIds?: number[];
    };
    backHref: string;
};

const generateId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

type ConditionState = {
    id: string;
    fieldDefId: number | null;
};

function toReadableExpression(expression?: string | null) {
    if (!expression) return "";
    return expression
        .replace(/\bAND\b/gi, " AND ")
        .replace(/\bOR\b/gi, " OR ")
        .replace(/\bNOT\b/gi, " NOT ")
        .replace(/\s+/g, " ")
        .trim();
}

export function DuplicateRuleForm({
    mode,
    objectDef,
    fields,
    initial,
    backHref,
}: DuplicateRuleFormProps) {
    const t = useTranslations();
    const router = useRouter();
    const [name, setName] = useState(initial?.name ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [isActive, setIsActive] = useState(initial?.isActive ?? true);
    const [createAction, setCreateAction] = useState<"NONE" | "WARN" | "BLOCK">(initial?.createAction ?? "WARN");
    const [editAction, setEditAction] = useState<"NONE" | "WARN" | "BLOCK">(initial?.editAction ?? "WARN");
    const [logicOperator, setLogicOperator] = useState<"ALL" | "ANY" | "CUSTOM">(initial?.logicOperator ?? "ALL");
    const [logicExpression, setLogicExpression] = useState(toReadableExpression(initial?.logicExpression));
    const [conditions, setConditions] = useState<ConditionState[]>(() => {
        const seeded = initial?.fieldDefIds ?? [];
        if (seeded.length > 0) {
            return seeded.map((fieldDefId) => ({
                id: generateId(),
                fieldDefId,
            }));
        }
        return fields.slice(0, 2).map((field) => ({
            id: generateId(),
            fieldDefId: field.id,
        }));
    });

    const fieldMap = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);

    const customLogicValidation = useMemo(() => {
        if (logicOperator !== "CUSTOM") return { valid: true, message: "" };
        const result = validateCustomLogicExpressionInput(logicExpression, conditions.length);
        if (!result.valid) {
            if (result.message === "Expression references a condition number that does not exist.") {
                return { valid: false, message: t("admin.ruleCommon.useConditionNumbers", { count: conditions.length }) };
            }
            return { valid: false, message: result.message };
        }
        return { valid: true, message: "" };
    }, [logicOperator, logicExpression, conditions.length, t]);

    const addCondition = () => {
        const nextField = fields.find((field) => !conditions.some((condition) => condition.fieldDefId === field.id)) ?? fields[0];
        setConditions((prev) => [...prev, { id: generateId(), fieldDefId: nextField?.id ?? null }]);
    };

    const updateCondition = (id: string, fieldDefId: number) => {
        setConditions((prev) => prev.map((condition) => (condition.id === id ? { ...condition, fieldDefId } : condition)));
    };

    const removeCondition = (id: string) => {
        setConditions((prev) => prev.filter((condition) => condition.id !== id));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error(t("admin.duplicateRuleCreate.nameRequired"));
            return;
        }

        const fieldDefIds = conditions
            .map((condition) => condition.fieldDefId)
            .filter((value): value is number => typeof value === "number");
        if (fieldDefIds.length < 2) {
            toast.error(t("admin.duplicateRuleCreate.chooseTwoFields"));
            return;
        }
        if (new Set(fieldDefIds).size !== fieldDefIds.length) {
            toast.error(t("admin.duplicateRuleCreate.fieldOnce"));
            return;
        }
        if (logicOperator === "CUSTOM" && !customLogicValidation.valid) {
            toast.error(customLogicValidation.message || t("admin.duplicateRuleCreate.fixCustomLogic"));
            return;
        }

        const payload = {
            objectDefId: objectDef.id,
            name: name.trim(),
            description: description.trim() || undefined,
            isActive,
            createAction,
            editAction,
            logicOperator,
            logicExpression: logicOperator === "CUSTOM" ? logicExpression : undefined,
            fieldDefIds,
        };

        const result =
            mode === "create"
                ? await createDuplicateRule(payload)
                : await updateDuplicateRule(initial?.id ?? 0, payload);

        if (!result.success) {
            toast.error(result.error || t("admin.duplicateRuleCreate.saveError"));
            return;
        }

        toast.success(mode === "create" ? t("admin.duplicateRuleCreate.created") : t("admin.duplicateRuleCreate.updated"));
        router.push(backHref);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>{mode === "create" ? t("admin.duplicateRuleCreate.newRule") : t("admin.duplicateRuleCreate.editRule")}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {t("admin.duplicateRuleCreate.subtitle", { objectLabel: objectDef.label })}
                        </p>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>{isActive ? t("shared.status.active") : t("shared.status.inactive")}</Badge>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>{t("admin.duplicateRuleCreate.ruleName")}</Label>
                        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("admin.duplicateRuleCreate.ruleNamePlaceholder")} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                        <div>
                            <p className="text-sm font-medium">{t("admin.duplicateRuleCreate.ruleStatus")}</p>
                            <p className="text-xs text-muted-foreground">{t("admin.duplicateRuleCreate.pauseHint")}</p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>{t("admin.duplicateRuleCreate.description")}</Label>
                        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("admin.duplicateRuleCreate.descriptionPlaceholder")} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("admin.duplicateRuleCreate.onCreate")}</Label>
                        <Select value={createAction} onValueChange={(value) => setCreateAction(value as "NONE" | "WARN" | "BLOCK")}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">{t("admin.duplicateRuleCreate.actionNone")}</SelectItem>
                                <SelectItem value="WARN">{t("admin.duplicateRuleCreate.actionWarn")}</SelectItem>
                                <SelectItem value="BLOCK">{t("admin.duplicateRuleCreate.actionBlock")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("admin.duplicateRuleCreate.onEdit")}</Label>
                        <Select value={editAction} onValueChange={(value) => setEditAction(value as "NONE" | "WARN" | "BLOCK")}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">{t("admin.duplicateRuleCreate.actionNone")}</SelectItem>
                                <SelectItem value="WARN">{t("admin.duplicateRuleCreate.actionWarn")}</SelectItem>
                                <SelectItem value="BLOCK">{t("admin.duplicateRuleCreate.actionBlock")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>{t("admin.duplicateRuleCreate.matchingFields")}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {t("admin.duplicateRuleCreate.matchingHint")}
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addCondition} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t("admin.duplicateRuleCreate.addField")}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {conditions.map((condition, index) => (
                        <div key={condition.id} className="rounded-xl border bg-card/70 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">{t("admin.duplicateRuleCreate.condition", { count: index + 1 })}</p>
                                    <p className="text-xs text-muted-foreground">{t("admin.duplicateRuleCreate.exactMatchHint")}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeCondition(condition.id)}
                                    disabled={conditions.length <= 2}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label>{t("admin.duplicateRuleCreate.field")}</Label>
                                <Select
                                    value={condition.fieldDefId ? String(condition.fieldDefId) : undefined}
                                    onValueChange={(value) => updateCondition(condition.id, Number(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("admin.duplicateRuleCreate.selectField")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fields.map((field) => (
                                            <SelectItem key={field.id} value={String(field.id)}>
                                                {field.label} ({field.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}

                    <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                        {t("admin.duplicateRuleCreate.strongKeysHint")}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>{t("admin.duplicateRuleCreate.ruleLogic")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t("admin.duplicateRuleCreate.howCombine")}</Label>
                        <Select value={logicOperator} onValueChange={(value) => setLogicOperator(value as "ALL" | "ANY" | "CUSTOM")}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("admin.duplicateRuleCreate.allMustMatch")}</SelectItem>
                                <SelectItem value="ANY">{t("admin.duplicateRuleCreate.anyCanMatch")}</SelectItem>
                                <SelectItem value="CUSTOM">{t("admin.duplicateRuleCreate.customLogic")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {logicOperator === "CUSTOM" && (
                        <div className="space-y-2">
                            <Label>{t("admin.duplicateRuleCreate.customLogic")}</Label>
                            <Input
                                value={logicExpression}
                                onChange={(event) => setLogicExpression(event.target.value)}
                                placeholder={t("admin.duplicateRuleCreate.customLogicPlaceholder")}
                            />
                            {!customLogicValidation.valid && (
                                <p className="text-xs text-destructive">{customLogicValidation.message}</p>
                            )}
                        </div>
                    )}

                    <Separator />

                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        {conditions.map((condition, index) => (
                            <div key={condition.id} className="rounded-lg border bg-muted/20 px-3 py-2">
                                <span className="font-medium text-foreground">{index + 1}.</span>{" "}
                                {condition.fieldDefId ? fieldMap.get(condition.fieldDefId)?.label ?? t("admin.duplicateRuleCreate.unknownField") : t("admin.duplicateRuleCreate.selectAField")}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4 border-t border-border/50 pt-4">
                <Button type="button" onClick={handleSubmit}>
                    {mode === "create" ? t("admin.duplicateRuleCreate.createRule") : t("admin.duplicateRuleCreate.saveChanges")}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
                    {t("admin.duplicateRuleCreate.cancel")}
                </Button>
            </div>
        </div>
    );
}
