"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_WIDGET_COLOR, useBuilderStore, WidgetConfig, WidgetFilter } from "./builder-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { IconPicker } from "../../objects/icon-picker";
import { formatDateOnlyForInput, formatDateTimeForInput } from "@/lib/temporal";
import type { TFunction } from "@/i18n";
import { useTranslations } from "@/i18n/client";
import { validateWidget } from "./builder-store";

interface WidgetConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableObjects: any[];
    availableQueues: { id: number; name: string }[];
}

const OPERATOR_KEYS = [
    { value: "equals", key: "admin.ruleOperators.equals" },
    { value: "not_equals", key: "admin.ruleOperators.notEquals" },
    { value: "contains", key: "admin.ruleOperators.contains" },
    { value: "not_contains", key: "admin.ruleOperators.doesNotContain" },
    { value: "gt", key: "admin.ruleOperators.greaterThan" },
    { value: "gte", key: "admin.ruleOperators.greaterOrEqual" },
    { value: "lt", key: "admin.ruleOperators.lessThan" },
    { value: "lte", key: "admin.ruleOperators.lessOrEqual" },
    { value: "is_blank", key: "admin.ruleOperators.isBlank" },
    { value: "is_not_blank", key: "admin.ruleOperators.isNotBlank" },
] as const;

function getBaseOperators(t: TFunction) {
    return OPERATOR_KEYS.map((op) => ({ value: op.value, label: t(op.key) }));
}

function getOperatorOptions(fieldType: string | undefined, t: TFunction) {
    const operators = getBaseOperators(t);
    if (!fieldType) return operators;
    if (fieldType === "Lookup") {
        return operators.filter((op) => ["is_blank", "is_not_blank"].includes(op.value));
    }
    if (fieldType === "Picklist") {
        return operators.filter((op) => ["equals", "not_equals", "is_blank", "is_not_blank"].includes(op.value));
    }
    if (fieldType === "Checkbox") {
        return operators.filter((op) => ["equals", "not_equals", "is_blank", "is_not_blank"].includes(op.value));
    }
    if (fieldType === "Number" || fieldType === "Date" || fieldType === "DateTime") {
        return operators.filter((op) => !["contains", "not_contains"].includes(op.value));
    }
    return operators.filter((op) => !["gt", "gte", "lt", "lte"].includes(op.value));
}

const generateId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function getValueInputType(fieldType?: string) {
    if (fieldType === "Date") return "date";
    if (fieldType === "DateTime") return "datetime-local";
    return "text";
}

function getValueInputValue(fieldType: string | undefined, value: string | undefined) {
    if (fieldType === "Date") return formatDateOnlyForInput(value);
    if (fieldType === "DateTime") return formatDateTimeForInput(value);
    return value || "";
}

export function WidgetConfigDialog({ open: _open, onOpenChange: _onOpenChange, availableObjects, availableQueues }: WidgetConfigDialogProps) {
    const t = useTranslations();
    const { widgets, selectedWidgetId, updateWidget } = useBuilderStore();
    const widget = widgets.find((w) => w.id === selectedWidgetId);
    const [objectFields, setObjectFields] = useState<any[]>([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [localColor, setLocalColor] = useState("");
    const colorCommitRef = useRef<string | null>(null);

    useEffect(() => {
        if (!widget?.objectDefId) {
            setObjectFields([]);
            return;
        }

        const selectedObj = availableObjects.find((o) => o.id === widget.objectDefId);
        if (!selectedObj?.apiName) {
            setObjectFields([]);
            return;
        }

        const fetchFields = async () => {
            setLoadingFields(true);
            try {
                const response = await fetch(`/api/fields/${selectedObj.apiName}`);
                if (response.ok) {
                    const data = await response.json();
                    setObjectFields(data.fields || []);
                }
            } catch (error) {
                console.error("Failed to fetch fields:", error);
            } finally {
                setLoadingFields(false);
            }
        };

        fetchFields();
    }, [widget?.objectDefId, availableObjects]);

    const filterableFields = useMemo(
        () => objectFields.filter((field) => !["TextArea", "File"].includes(field.type)),
        [objectFields]
    );
    const fieldMap = new Map(filterableFields.map((f) => [f.id, f]));
    const listFields = filterableFields.filter((field) => !["TextArea", "File"].includes(field.type));
    const systemFieldOptions = [
        { id: "createdAt", label: t("admin.builder.sysFieldCreatedAt") },
        { id: "updatedAt", label: t("admin.builder.sysFieldUpdatedAt") },
    ] as const;

    
    useEffect(() => {
        if (!widget) return;
        const next = widget.color || DEFAULT_WIDGET_COLOR;
        setLocalColor(next);
        colorCommitRef.current = next;
        if (!widget.color) {
            updateWidget(widget.id, { color: DEFAULT_WIDGET_COLOR });
        }
    }, [widget, updateWidget]);
    if (!widget) {
        return (
            <div className="p-6 text-sm text-muted-foreground">
                {t("admin.builder.widgetConfigEmpty")}
            </div>
        );
    }

    const handleChange = (key: keyof WidgetConfig, value: any) => {
        updateWidget(widget.id, { [key]: value });
    };

    const commitColor = (value: string) => {
        const trimmed = value.trim();
        const normalized = HEX_COLOR_PATTERN.test(trimmed) ? trimmed : DEFAULT_WIDGET_COLOR;
        setLocalColor(normalized);
        if (colorCommitRef.current === normalized) return;
        colorCommitRef.current = normalized;
        updateWidget(widget.id, { color: normalized });
    };

    const handleObjectChange = (objectDefId: number) => {
        updateWidget(widget.id, {
            objectDefId,
            valueFieldDefId: undefined,
            groupByFieldDefId: undefined,
            fieldDefIds: [],
            systemFields: [],
            sortFieldDefId: undefined,
            sortSystemField: undefined,
            filters: [],
            ownerScope: "any",
            ownerQueueId: undefined,
        });
    };

    const addFilter = () => {
        const filters = widget.filters || [];
        const newFilter: WidgetFilter = {
            id: generateId(),
            fieldDefId: null,
            operator: "equals",
            value: "",
        };
        handleChange("filters", [...filters, newFilter]);
    };

    const updateFilter = (filterId: string, updates: Partial<WidgetFilter>) => {
        const filters = widget.filters || [];
        handleChange(
            "filters",
            filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
        );
    };

    const removeFilter = (filterId: string) => {
        const filters = widget.filters || [];
        handleChange("filters", filters.filter((f) => f.id !== filterId));
    };

    const validationErrors = validateWidget(widget);
    const customLogicError = validationErrors.find((error) => error.toLowerCase().includes("expression"));

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold capitalize">{t("admin.builder.widgetConfigTitle", { type: widget.type })}</h3>
                <p className="text-sm text-muted-foreground">
                    {t("admin.builder.widgetConfigDesc")}
                </p>
                {validationErrors.length > 0 && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {validationErrors[0]}
                    </div>
                )}
            </div>

            <Tabs defaultValue="general">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="data">Data</TabsTrigger>
                        <TabsTrigger value="filters">Filters</TabsTrigger>
                        <TabsTrigger value="styling">Styling</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 mt-4">
                        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">{t("admin.builder.widgetTitle")}</Label>
                                <Input
                                    value={widget.title}
                                    onChange={(e) => handleChange("title", e.target.value)}
                                    placeholder={t("admin.builder.widgetTitlePlaceholder")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">{t("admin.builder.widgetWidth")}</Label>
                                <Select
                                    value={widget.colSpan.toString()}
                                    onValueChange={(val) => handleChange("colSpan", parseInt(val))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">{t("admin.builder.sizeSmall")}</SelectItem>
                                        <SelectItem value="4">{t("admin.builder.sizeMedium")}</SelectItem>
                                        <SelectItem value="6">{t("admin.builder.sizeHalf")}</SelectItem>
                                        <SelectItem value="8">{t("admin.builder.sizeLarge")}</SelectItem>
                                        <SelectItem value="12">{t("admin.builder.sizeFull")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="data" className="space-y-4 mt-4">
                        <div className="rounded-lg border bg-slate-50 p-4 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">{t("admin.builder.dataObject")}</Label>
                                <Select
                                    value={widget.objectDefId?.toString() || ""}
                                    onValueChange={(val) => handleObjectChange(parseInt(val))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("admin.builder.selectObject")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableObjects.map((obj) => (
                                            <SelectItem key={obj.id} value={obj.id.toString()}>
                                                {obj.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {widget.type === "metric" && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.aggregation")}</Label>
                                        <Select
                                            value={widget.aggregation || "count"}
                                            onValueChange={(val) => handleChange("aggregation", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="count">{t("admin.builder.countRecords")}</SelectItem>
                                                <SelectItem value="sum">{t("admin.builder.sum")}</SelectItem>
                                                <SelectItem value="avg">{t("admin.builder.average")}</SelectItem>
                                                <SelectItem value="min">{t("admin.builder.min")}</SelectItem>
                                                <SelectItem value="max">{t("admin.builder.max")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {widget.aggregation && widget.aggregation !== "count" && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">{t("admin.builder.numberField")}</Label>
                                            <Select
                                                value={widget.valueFieldDefId?.toString() || ""}
                                                onValueChange={(val) =>
                                                    handleChange("valueFieldDefId", parseInt(val))
                                                }
                                                disabled={loadingFields}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={loadingFields ? t("shared.common.loading") : t("admin.builder.selectField")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {objectFields
                                                        .filter((f) => f.type === "Number")
                                                        .map((field) => (
                                                            <SelectItem key={field.id} value={field.id.toString()}>
                                                                {field.label}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            )}

                            {widget.type === "chart" && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.chartType")}</Label>
                                        <Select
                                            value={widget.chartType || "bar"}
                                            onValueChange={(val) => handleChange("chartType", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bar">{t("admin.builder.bar")}</SelectItem>
                                                <SelectItem value="line">{t("admin.builder.line")}</SelectItem>
                                                <SelectItem value="pie">{t("admin.builder.pie")}</SelectItem>
                                                <SelectItem value="area">{t("admin.builder.area")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.groupBy")}</Label>
                                        <Select
                                            value={widget.groupByFieldDefId?.toString() || ""}
                                            onValueChange={(val) =>
                                                handleChange("groupByFieldDefId", parseInt(val))
                                            }
                                            disabled={loadingFields}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingFields ? t("shared.common.loading") : t("admin.builder.selectPicklist")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {objectFields
                                                    .filter((f) => f.type === "Picklist")
                                                    .map((field) => (
                                                        <SelectItem key={field.id} value={field.id.toString()}>
                                                            {field.label}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.aggregation")}</Label>
                                        <Select
                                            value={widget.aggregation || "count"}
                                            onValueChange={(val) => handleChange("aggregation", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="count">{t("admin.builder.count")}</SelectItem>
                                                <SelectItem value="sum">{t("admin.builder.sum")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {widget.aggregation === "sum" && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">{t("admin.builder.numberField")}</Label>
                                            <Select
                                                value={widget.valueFieldDefId?.toString() || ""}
                                                onValueChange={(val) =>
                                                    handleChange("valueFieldDefId", parseInt(val))
                                                }
                                                disabled={loadingFields}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={loadingFields ? t("shared.common.loading") : t("admin.builder.selectField")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {objectFields
                                                        .filter((f) => f.type === "Number")
                                                        .map((field) => (
                                                            <SelectItem key={field.id} value={field.id.toString()}>
                                                                {field.label}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </>
                            )}

                            {widget.type === "list" && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.displayLimit")}</Label>
                                        <Select
                                            value={(widget.limit || 5).toString()}
                                            onValueChange={(val) => handleChange("limit", parseInt(val))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="3">{t("admin.builder.recordsCount", { count: 3 })}</SelectItem>
                                                <SelectItem value="5">{t("admin.builder.recordsCount", { count: 5 })}</SelectItem>
                                                <SelectItem value="10">{t("admin.builder.recordsCount", { count: 10 })}</SelectItem>
                                                <SelectItem value="20">{t("admin.builder.recordsCount", { count: 20 })}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.listColumns")}</Label>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {listFields.map((field) => {
                                                const selected = (widget.fieldDefIds || []).includes(field.id);
                                                return (
                                                    <label
                                                        key={field.id}
                                                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => {
                                                                const next = new Set(widget.fieldDefIds || []);
                                                                if (selected) next.delete(field.id);
                                                                else next.add(field.id);
                                                                handleChange("fieldDefIds", Array.from(next));
                                                            }}
                                                        />
                                                        <span>{field.label}</span>
                                                    </label>
                                                );
                                            })}
                                            {systemFieldOptions.map((field) => {
                                                const selected = (widget.systemFields || []).includes(field.id);
                                                return (
                                                    <label
                                                        key={field.id}
                                                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => {
                                                                const next = new Set(widget.systemFields || []);
                                                                if (selected) next.delete(field.id);
                                                                else next.add(field.id);
                                                                handleChange("systemFields", Array.from(next));
                                                            }}
                                                        />
                                                        <span>{field.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.sortField")}</Label>
                                        <Select
                                            value={
                                                widget.sortSystemField
                                                    ? `system:${widget.sortSystemField}`
                                                    : widget.sortFieldDefId?.toString() || ""
                                            }
                                            onValueChange={(val) => {
                                                if (!val) {
                                                    handleChange("sortFieldDefId", undefined);
                                                    handleChange("sortSystemField", undefined);
                                                    return;
                                                }
                                                if (val.startsWith("system:")) {
                                                    const systemField = val.replace("system:", "") as "createdAt" | "updatedAt";
                                                    handleChange("sortSystemField", systemField);
                                                    handleChange("sortFieldDefId", undefined);
                                                    return;
                                                }
                                                handleChange("sortFieldDefId", parseInt(val));
                                                handleChange("sortSystemField", undefined);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("admin.builder.selectField")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {listFields.map((field) => (
                                                    <SelectItem key={field.id} value={field.id.toString()}>
                                                        {field.label}
                                                    </SelectItem>
                                                ))}
                                                {systemFieldOptions.map((field) => (
                                                    <SelectItem key={field.id} value={`system:${field.id}`}>
                                                        {field.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">{t("admin.builder.sortDirection")}</Label>
                                        <Select
                                            value={widget.sortDirection || "desc"}
                                            onValueChange={(val) => handleChange("sortDirection", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="asc">{t("shared.listViewEditor.ascending")}</SelectItem>
                                                <SelectItem value="desc">{t("shared.listViewEditor.descending")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="filters" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">{t("admin.builder.filterConditions")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t("admin.builder.limitRecords")}
                                </p>
                            </div>
                            <Button onClick={addFilter} size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                {t("admin.builder.addFilter")}
                            </Button>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                            <div>
                                <Label className="text-sm font-semibold">{t("admin.builder.recordOwner")}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t("admin.builder.recordOwnerDesc")}
                                </p>
                            </div>
                            <Select
                                value={widget.ownerScope || "any"}
                                onValueChange={(val) => {
                                    handleChange("ownerScope", val);
                                    if (val !== "queue") {
                                        handleChange("ownerQueueId", undefined);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("admin.builder.selectOwnerFilter")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">{t("admin.builder.allRecords")}</SelectItem>
                                    <SelectItem value="mine">{t("admin.builder.myRecords")}</SelectItem>
                                    <SelectItem value="queue">{t("admin.builder.specificQueue")}</SelectItem>
                                </SelectContent>
                            </Select>
                            {widget.ownerScope === "queue" && (
                                <Select
                                    value={widget.ownerQueueId?.toString() || ""}
                                    onValueChange={(val) => handleChange("ownerQueueId", parseInt(val))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={availableQueues.length ? t("admin.builder.selectQueue") : t("admin.builder.noQueues")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableQueues.map((queue) => (
                                            <SelectItem key={queue.id} value={queue.id.toString()}>
                                                {queue.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {!widget.filters || widget.filters.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                                {t("admin.builder.noFilters")}
                            </div>
                        ) : (
                            widget.filters.map((filter, index) => {
                                const field = filter.fieldDefId ? fieldMap.get(filter.fieldDefId) : null;
                                const operators = getOperatorOptions(field?.type, t);
                                const needsValue = !["is_blank", "is_not_blank"].includes(filter.operator);

                                return (
                                    <div key={filter.id} className="border rounded-lg p-4 space-y-3 bg-white">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="secondary">{t("admin.builder.filterCondition", { count: index + 1 })}</Badge>
                                            <Button
                                                onClick={() => removeFilter(filter.id)}
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold">{t("admin.builder.field")}</Label>
                                                <Select
                                                    value={filter.fieldDefId?.toString() || ""}
                                                    onValueChange={(val) =>
                                                        updateFilter(filter.id, {
                                                            fieldDefId: parseInt(val),
                                                            operator: "equals",
                                                            value: "",
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("admin.builder.selectShort")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filterableFields.map((f) => (
                                                            <SelectItem key={f.id} value={f.id.toString()}>
                                                                {f.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold">{t("admin.builder.operator")}</Label>
                                                <Select
                                                    value={filter.operator}
                                                    onValueChange={(val) => updateFilter(filter.id, { operator: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {operators.map((op) => (
                                                            <SelectItem key={op.value} value={op.value}>
                                                                {op.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {needsValue && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">{t("admin.builder.value")}</Label>
                                                    {field?.type === "Picklist" ? (
                                                        <Select
                                                            value={filter.value || ""}
                                                            onValueChange={(val) => updateFilter(filter.id, { value: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("admin.builder.selectShort")} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(field.picklistOptions || [])
                                                                    .filter((opt: any) => opt.isActive !== false)
                                                                    .map((opt: any) => (
                                                                        <SelectItem key={opt.id} value={String(opt.id)}>
                                                                            {opt.label}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : field?.type === "Checkbox" ? (
                                                        <Select
                                                            value={filter.value || ""}
                                                            onValueChange={(val) => updateFilter(filter.id, { value: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("admin.builder.selectShort")} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="true">{t("admin.builder.trueOpt")}</SelectItem>
                                                                <SelectItem value="false">{t("admin.builder.falseOpt")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            type={getValueInputType(field?.type)}
                                                            value={getValueInputValue(field?.type, filter.value)}
                                                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                            placeholder={t("admin.builder.enterValue")}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        <div className="rounded-lg border p-4 space-y-3 bg-slate-50">
                            <Label className="text-sm font-semibold">{t("admin.builder.filterLogic")}</Label>
                            <Select
                                value={widget.filterLogic || "ALL"}
                                onValueChange={(val: any) => handleChange("filterLogic", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">{t("admin.builder.logicAnd")}</SelectItem>
                                    <SelectItem value="ANY">{t("admin.builder.logicOr")}</SelectItem>
                                    <SelectItem value="CUSTOM">{t("admin.builder.logicCustom")}</SelectItem>
                                </SelectContent>
                            </Select>

                            {widget.filterLogic === "CUSTOM" && (
                                <div className="space-y-2">
                                    <Input
                                        value={widget.filterExpression || ""}
                                        onChange={(e) => handleChange("filterExpression", e.target.value)}
                                        placeholder={t("admin.builder.customLogicPlaceholder")}
                                        className="font-mono"
                                    />
                                    {customLogicError && (
                                        <p className="text-xs text-destructive">
                                            {customLogicError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="styling" className="space-y-6 mt-4">
                        <div className="space-y-3">
                            <Label>{t("admin.builder.widgetIcon")}</Label>
                            <div className="border rounded-lg p-4 bg-slate-50">
                                <IconPicker
                                    value={widget.icon}
                                    onChange={(icon) => handleChange("icon", icon)}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label className="block">{t("admin.builder.accentColor")}</Label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={HEX_COLOR_PATTERN.test(localColor) ? localColor : DEFAULT_WIDGET_COLOR}
                                    onChange={(e) => setLocalColor(e.target.value)}
                                    className="h-10 w-12 rounded border"
                                    onPointerUp={() => commitColor(localColor)}
                                    onKeyUp={() => commitColor(localColor)}
                                    onBlur={() => commitColor(localColor)}
                                />
                                <Input
                                    value={localColor || DEFAULT_WIDGET_COLOR}
                                    onChange={(e) => setLocalColor(e.target.value)}
                                    placeholder="#3B82F6"
                                    onBlur={() => commitColor(localColor)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("admin.builder.accentColorDesc")}
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
        </div>
    );
}
