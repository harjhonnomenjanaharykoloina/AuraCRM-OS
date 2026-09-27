"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatDateOnlyForDisplay, formatDateTimeForDisplay } from "@/lib/temporal";
import {
    DndContext,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
    useDraggable,
    useDroppable,
    type DragEndEvent,
} from "@dnd-kit/core";
import { moveRecord } from "@/actions/standard/record-actions";

type KanbanBoardProps = {
    records: any[];
    objectDef: any;
    appApiName: string;
    groupByField: any;
    cardFields: any[];
    lookupResolutions: Record<string, Record<string, { id: number; name: string; targetObjectApiName: string }>>;
};

type KanbanColumn = {
    key: string;
    label: string;
    isInactive?: boolean;
    records: any[];
};

export function KanbanBoard({
    records,
    objectDef,
    appApiName,
    groupByField,
    cardFields,
    lookupResolutions,
}: KanbanBoardProps) {
    const router = useRouter();
    const sensors = useSensors(useSensor(PointerSensor));

    const groupByKey = groupByField.apiName;
    const options = Array.isArray(groupByField.picklistOptions) ? groupByField.picklistOptions : [];
    const optionMap = new Map(options.map((opt: any) => [String(opt.id), opt]));

    const grouped = new Map<string, any[]>();
    records.forEach((record) => {
        const rawValue = record[groupByKey];
        const key = rawValue === null || rawValue === undefined || rawValue === "" ? "__empty" : String(rawValue);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(record);
    });

    const columns: KanbanColumn[] = options.map((opt: any) => ({
        key: String(opt.id),
        label: `${opt.label}${opt.isActive === false ? " (inactive)" : ""}`,
        isInactive: opt.isActive === false,
        records: grouped.get(String(opt.id)) ?? [],
    }));

    if (grouped.has("__empty")) {
        columns.push({
            key: "__empty",
            label: "No value",
            records: grouped.get("__empty") ?? [],
        });
    }

    const unknownKeys = Array.from(grouped.keys()).filter(
        (key) => key !== "__empty" && !optionMap.has(key)
    );
    if (unknownKeys.length) {
        const unknownRecords = unknownKeys.flatMap((key) => grouped.get(key) ?? []);
        columns.push({
            key: "__unknown",
            label: "Unknown",
            records: unknownRecords,
        });
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const overId = String(over.id);
        // Only drops on real picklist columns are valid (skip "No value"/"Unknown" buckets).
        if (!optionMap.has(overId)) return;

        const toOptionId = Number(overId);
        const recordId = Number(String(active.id));
        if (!recordId) return;

        const fromOptionId = active.data.current?.optionId;
        if (fromOptionId != null && Number(fromOptionId) === toOptionId) return;

        const result = await moveRecord(objectDef.apiName, recordId, groupByField.id, toOptionId);
        if (result.success) {
            router.refresh();
        } else {
            toast.error(result.error || "Could not update record stage.");
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.key}
                        column={column}
                        groupByKey={groupByKey}
                        cardFields={cardFields}
                        lookupResolutions={lookupResolutions}
                        appApiName={appApiName}
                        objectDef={objectDef}
                    />
                ))}
            </div>
        </DndContext>
    );
}

function KanbanColumn({
    column,
    groupByKey,
    cardFields,
    lookupResolutions,
    appApiName,
    objectDef,
}: {
    column: KanbanColumn;
    groupByKey: string;
    cardFields: any[];
    lookupResolutions: Record<string, Record<string, { id: number; name: string; targetObjectApiName: string }>>;
    appApiName: string;
    objectDef: any;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.key });

    return (
        <div className="w-72 shrink-0">
            <div
                ref={setNodeRef}
                className={cn(
                    "rounded-xl border border-slate-200 bg-white shadow-sm",
                    isOver && "border-sky-400 bg-sky-50"
                )}
            >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                    <div
                        className={cn("text-sm font-semibold text-slate-800", column.isInactive && "text-slate-500")}
                    >
                        {column.label}
                    </div>
                    <Badge variant="secondary">{column.records.length}</Badge>
                </div>
                <div className="space-y-3 p-3">
                    {column.records.length === 0 && (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500">
                            No records
                        </div>
                    )}
                    {column.records.map((record) => (
                        <KanbanCard
                            key={record.id}
                            record={record}
                            groupByKey={groupByKey}
                            cardFields={cardFields}
                            lookupResolutions={lookupResolutions}
                            appApiName={appApiName}
                            objectDef={objectDef}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function KanbanCard({
    record,
    groupByKey,
    cardFields,
    lookupResolutions,
    appApiName,
    objectDef,
}: {
    record: any;
    groupByKey: string;
    cardFields: any[];
    lookupResolutions: Record<string, Record<string, { id: number; name: string; targetObjectApiName: string }>>;
    appApiName: string;
    objectDef: any;
}) {
    const currentOptionId = record[groupByKey];
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: String(record.id),
        data: { optionId: currentOptionId != null ? Number(currentOptionId) : undefined },
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.45 : 1,
        cursor: isDragging ? "grabbing" : "grab",
    };

    return (
        <div ref={setNodeRef} style={style} {...(attributes as any)} {...(listeners as any)}>
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-3 space-y-2">
                    <Link
                        href={`/app/${appApiName}/${objectDef.apiName}/${record.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        {record.name || `Record #${record.id}`}
                    </Link>
                    <div className="space-y-1">
                        {cardFields
                            .filter((field) => field.apiName !== groupByKey)
                            .slice(0, 3)
                            .map((field) => (
                                <div key={field.id} className="text-xs text-slate-600">
                                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                        {field.label}
                                    </span>
                                    <div className="text-xs text-slate-700">
                                        {renderFieldValue(field, record[field.apiName], lookupResolutions, appApiName)}
                                    </div>
                                </div>
                            ))}
                    </div>
                    <div className="pt-1 text-[11px] text-slate-400">
                        Updated {format(new Date(record.updatedAt), "MMM d, yyyy")}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function renderFieldValue(
    fieldDef: any,
    value: any,
    lookupResolutions: Record<string, Record<string, { id: number; name: string; targetObjectApiName: string }>>,
    appApiName: string
) {
    if (value === null || value === undefined || value === "") return "-";

    switch (fieldDef.type) {
        case "Lookup": {
            const resolution = lookupResolutions[fieldDef.apiName]?.[String(value)];
            if (resolution) {
                return (
                    <Link
                        href={`/app/${appApiName}/${resolution.targetObjectApiName}/${resolution.id}`}
                        className="text-primary hover:underline font-medium"
                    >
                        {resolution.name}
                    </Link>
                );
            }
            return value;
        }
        case "Picklist": {
            const options = Array.isArray(fieldDef.picklistOptions) ? fieldDef.picklistOptions : [];
            const match = options.find((opt: any) => String(opt.id) === String(value));
            if (!match) return value;
            return `${match.label}${match.isActive === false ? " (inactive)" : ""}`;
        }
        case "Date":
            return (
                <span suppressHydrationWarning>
                    {formatDateOnlyForDisplay(value) ?? value}
                </span>
            );
        case "DateTime":
            return (
                <span suppressHydrationWarning>
                    {formatDateTimeForDisplay(value) ?? value}
                </span>
            );
        default:
            return value;
    }
}
