import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { CreateFieldDialog } from "@/components/admin/objects/create-field-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Info, Layers3, LayoutTemplate, ShieldCheck, TableProperties, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { EditFieldDialog } from "@/components/admin/objects/edit-field-dialog";
import { DeleteFieldButton } from "@/components/admin/objects/delete-field-button";
import { FieldWhereUsedButton } from "@/components/admin/objects/field-where-used-button";
import { DeleteObjectButton } from "@/components/admin/objects/delete-object-button";
import { DependencyList } from "@/components/admin/objects/dependency-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationRulesPanel } from "@/components/admin/objects/validation-rules-panel";
import { ObjectIconCard } from "@/components/admin/objects/object-icon-card";
import { CreateRecordPageLayoutDialog } from "@/components/admin/objects/create-record-page-layout-dialog";
import { CreateRecordPageAssignmentDialog } from "@/components/admin/objects/create-record-page-assignment-dialog";
import { SetDefaultRecordPageLayoutButton } from "@/components/admin/objects/set-default-record-page-layout-button";
import { DeleteRecordPageAssignmentButton } from "@/components/admin/objects/delete-record-page-assignment-button";
import { DeleteRecordPageLayoutButton } from "@/components/admin/objects/delete-record-page-layout-button";
import { getObjectDeleteProtection } from "@/lib/metadata-dependencies";
import { USER_OBJECT_API_NAME } from "@/lib/user-companion";
import { getSessionUser } from "@/lib/auth/types";

export default async function ObjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return null;
    const t = await getT();
    const organizationId = user.organizationId;
    const { id } = await params;
    const objectId = parseInt(id);

    if (isNaN(objectId)) notFound();

    // Fetch Object Definition
    const objectDef = await db.objectDefinition.findUnique({
        where: { id: objectId, organizationId },
        include: {
            fields: {
                orderBy: { createdAt: "asc" },
                include: {
                    picklistOptions: { orderBy: { sortOrder: "asc" } },
                },
            },
            validationRules: {
                orderBy: { createdAt: "desc" },
                include: {
                    conditions: {
                        orderBy: { createdAt: "asc" },
                        include: {
                            fieldDef: {
                                include: {
                                    picklistOptions: { orderBy: { sortOrder: "asc" } },
                                },
                            },
                            compareField: {
                                include: {
                                    picklistOptions: { orderBy: { sortOrder: "asc" } },
                                },
                            },
                            permissionSet: true,
                        },
                    },
                },
            },
        },
    });

    if (!objectDef) notFound();

    // Fetch all objects for Lookup options
    const allObjects = await db.objectDefinition.findMany({
        where: { organizationId },
        select: { id: true, label: true },
        orderBy: { label: "asc" },
    });

    const recordPageLayouts = await db.recordPageLayout.findMany({
        where: { organizationId, objectDefId: objectId },
        orderBy: { updatedAt: "desc" },
    });

    const recordPageAssignments = await db.recordPageAssignment.findMany({
        where: { organizationId, objectDefId: objectId },
        include: {
            app: true,
            permissionSet: true,
            layout: true,
        },
        orderBy: { updatedAt: "desc" },
    });

    const apps = await db.appDefinition.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const permissionSets = await db.permissionSet.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const {
        dependencies: objectDeleteDependencies,
        allDependencies: objectDependencies,
        recordCount,
    } = await getObjectDeleteProtection(organizationId, objectDef.id);
    const blockingDependencyIds = new Set(objectDeleteDependencies.map((dependency) => dependency.id));
    const informationalDependencies = objectDependencies.filter(
        (dependency) => !blockingDependencyIds.has(dependency.id)
    );
    const fieldDependencyMap = new Map<number, typeof objectDependencies>();
    objectDependencies.forEach((dependency) => {
        if (!dependency.fieldDefId) return;
        const bucket = fieldDependencyMap.get(dependency.fieldDefId) ?? [];
        bucket.push(dependency);
        fieldDependencyMap.set(dependency.fieldDefId, bucket);
    });

    return (
        <div className="p-6 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="bg-white" asChild>
                    <Link href="/admin/objects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{objectDef.label}</h1>
                        <Badge variant="outline" className="text-xs font-normal bg-white">
                            {objectDef.isSystem ? t("admin.objectDetail.standardObject") : t("admin.objectDetail.customObject")}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{objectDef.apiName}</span>
                    </div>
                </div>
                </div>
                {!objectDef.isSystem ? (
                    <DeleteObjectButton
                        objectDefId={objectDef.id}
                        label={objectDef.label}
                        isSystem={objectDef.isSystem}
                        initialDependencies={objectDeleteDependencies}
                        initialRecordCount={recordCount}
                    />
                ) : null}
            </div>

            <ObjectIconCard
                objectId={objectDef.id}
                currentIcon={objectDef.icon}
                label={objectDef.label}
                pluralLabel={objectDef.pluralLabel}
                description={objectDef.description}
                notifyOnAssignment={objectDef.notifyOnAssignment}
                enableChatter={objectDef.enableChatter}
                isUserObject={objectDef.apiName === USER_OBJECT_API_NAME}
            />

            <Tabs defaultValue="fields" className="space-y-6">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-2 xl:grid-cols-4">
                    <TabsTrigger
                        value="fields"
                        className="group h-full min-h-[72px] rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-900 data-[state=active]:shadow-none"
                    >
                        <div className="flex h-full w-full items-center">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-data-[state=active]:bg-indigo-100 group-data-[state=active]:text-indigo-700">
                                    <TableProperties className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{t("admin.objectDetail.fieldsAndRelationships")}</div>
                                </div>
                            </div>
                        </div>
                    </TabsTrigger>
                    <TabsTrigger
                        value="validation"
                        className="group h-full min-h-[72px] rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-emerald-200 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-900 data-[state=active]:shadow-none"
                    >
                        <div className="flex h-full w-full items-center">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-data-[state=active]:bg-emerald-100 group-data-[state=active]:text-emerald-700">
                                    <Wrench className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{t("admin.objectDetail.validationRules")}</div>
                                </div>
                            </div>
                        </div>
                    </TabsTrigger>
                    <TabsTrigger
                        value="recordpages"
                        className="group h-full min-h-[72px] rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-violet-200 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-900 data-[state=active]:shadow-none"
                    >
                        <div className="flex h-full w-full items-center">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-data-[state=active]:bg-violet-100 group-data-[state=active]:text-violet-700">
                                    <LayoutTemplate className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{t("admin.objectDetail.recordPages")}</div>
                                </div>
                            </div>
                        </div>
                    </TabsTrigger>
                    <TabsTrigger
                        value="usedin"
                        className="group h-full min-h-[72px] rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-amber-200 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-950 data-[state=active]:shadow-none"
                    >
                        <div className="flex h-full w-full items-center">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-data-[state=active]:bg-amber-100 group-data-[state=active]:text-amber-700">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{t("admin.objectDetail.deleteImpact")}</div>
                                </div>
                            </div>
                        </div>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fields" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("admin.objectDetail.fieldsAndRelationships")}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {t("admin.objectDetail.configureObject")}
                                </p>
                            </div>
                            <CreateFieldDialog objectDefId={objectDef.id} availableObjects={allObjects} />
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("shared.common.label")}</TableHead>
                                            <TableHead>{t("shared.common.apiName")}</TableHead>
                                            <TableHead>{t("shared.common.type")}</TableHead>
                                            <TableHead>{t("shared.common.required")}</TableHead>
                                            <TableHead className="w-[170px]">{t("shared.common.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {objectDef.fields.map((field) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium">{field.label}</TableCell>
                                                <TableCell className="font-mono text-xs">{field.apiName}</TableCell>
                                                <TableCell className="space-x-2">
                                                    <Badge variant="outline">{field.type}</Badge>
                                                    {field.type === "Lookup" && field.lookupTargetId && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {t("admin.objectDetail.lookupRef")} {allObjects.find(o => o.id === field.lookupTargetId)?.label}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {field.required ? (
                                                        <Badge variant="default" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                                                            {t("shared.common.required")}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">{t("shared.common.optional")}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <FieldWhereUsedButton
                                                            label={field.label}
                                                            dependencies={fieldDependencyMap.get(field.id) ?? []}
                                                        />
                                                        <EditFieldDialog field={field} availableObjects={allObjects} />
                                                        <DeleteFieldButton
                                                            fieldId={field.id}
                                                            objectDefId={objectDef.id}
                                                            label={field.label}
                                                            apiName={field.apiName}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {objectDef.fields.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    {t("admin.objectDetail.noFields")}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="validation">
                    <ValidationRulesPanel
                        objectId={objectDef.id}
                        fields={objectDef.fields}
                        validationRules={objectDef.validationRules}
                    />
                </TabsContent>

                <TabsContent value="recordpages" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("admin.objectDetail.recordPageLayouts")}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {t("admin.objectDetail.manageLayouts")}
                                </p>
                            </div>
                            <CreateRecordPageLayoutDialog objectDefId={objectDef.id} />
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 rounded-lg border bg-slate-50/80 p-4 text-sm text-slate-700">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 h-4 w-4 text-slate-500" />
                                    <div>
                                        <p className="font-medium text-slate-900">{t("admin.objectDetail.defaultLayout")}</p>
                                        <p className="mt-1 text-slate-600">
                                            {t("admin.objectDetail.ifNoMatchDefault")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("admin.objectDetail.layout")}</TableHead>
                                            <TableHead>{t("admin.objectDetail.default")}</TableHead>
                                            <TableHead>{t("admin.objectDetail.updated")}</TableHead>
                                            <TableHead className="w-[260px]">{t("shared.common.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recordPageLayouts.map((layout) => (
                                            <TableRow key={layout.id}>
                                                <TableCell className="font-medium">{layout.name}</TableCell>
                                                <TableCell>
                                                    {layout.isDefault ? (
                                                        <Badge variant="outline">{t("admin.objectDetail.default")}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {layout.updatedAt.toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <Link href={`/admin/objects/${objectDef.id}/record-pages/${layout.id}`}>
                                                                {t("admin.objectDetail.openBuilder")}
                                                            </Link>
                                                        </Button>
                                                        <SetDefaultRecordPageLayoutButton
                                                            layoutId={layout.id}
                                                            isDefault={layout.isDefault}
                                                        />
                                                        <DeleteRecordPageLayoutButton
                                                            layoutId={layout.id}
                                                            label={`${layout.name}`}
                                                            isDefault={layout.isDefault}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {recordPageLayouts.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    {t("admin.objectDetail.noRecordPageLayouts")}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("admin.objectDetail.recordPageAssignments")}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {t("admin.objectDetail.chooseLayoutApplies")}
                                </p>
                            </div>
                            <CreateRecordPageAssignmentDialog
                                objectDefId={objectDef.id}
                                apps={apps}
                                layouts={recordPageLayouts.map((layout) => ({ id: layout.id, name: layout.name }))}
                                permissionSets={permissionSets}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 rounded-lg border bg-slate-50/80 p-4 text-sm text-slate-700">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 h-4 w-4 text-slate-500" />
                                    <div>
                                        <p className="font-medium text-slate-900">{t("admin.objectDetail.howAssignmentsMatched")}</p>
                                        <p className="mt-1 text-slate-600">
                                            {t("admin.objectDetail.lowerNumbersWin")}
                                        </p>
                                        <p className="mt-2 text-xs text-slate-600">
                                            {t("admin.objectDetail.assignmentPriorityNote")}
                                        </p>
                                        <ol className="mt-3 space-y-1 text-slate-700">
                                            <li className="flex items-center gap-2">
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">1</span>
                                                {t("admin.objectDetail.appAndPermission")}
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">2</span>
                                                {t("admin.objectDetail.appOnly")}
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-lg border">
                                <Table>
                                    <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("admin.objectDetail.app")}</TableHead>
                                                <TableHead>{t("admin.objectDetail.permissionSet")}</TableHead>
                                                <TableHead className="w-[100px]">{t("admin.objectDetail.priority")}</TableHead>
                                                <TableHead>{t("admin.objectDetail.layout")}</TableHead>
                                                <TableHead className="w-[120px]">{t("shared.common.actions")}</TableHead>
                                            </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...recordPageAssignments]
                                            .map((assignment) => {
                                            const hasPermissionSet = Boolean(assignment.permissionSetId);
                                            const priority = hasPermissionSet ? 1 : 2;

                                            return {
                                                assignment,
                                                priority,
                                            };
                                        })
                                        .sort((a, b) => {
                                            if (a.priority !== b.priority) return a.priority - b.priority;
                                            return a.assignment.id - b.assignment.id;
                                        })
                                        .map(({ assignment, priority }) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell className="font-medium">{assignment.app.name}</TableCell>
                                                <TableCell>
                                                    {assignment.permissionSet?.name || t("admin.objectDetail.any")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-slate-900 text-white">#{priority}</Badge>
                                                </TableCell>
                                                <TableCell>{assignment.layout.name}</TableCell>
                                                <TableCell>
                                                    <DeleteRecordPageAssignmentButton
                                                        assignmentId={assignment.id}
                                                        label={`${assignment.app.name} -> ${assignment.layout.name}`}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {recordPageAssignments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    {t("admin.objectDetail.noRecordPageAssignments")}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="usedin" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.objectDetail.deleteImpact")}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t("admin.objectDetail.deleteImpactDescription")}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-red-100 p-2 text-red-700">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-red-950">{t("admin.objectDetail.blockingReferencesHeader")}</p>
                                            <p className="text-2xl font-bold tracking-tight text-red-900">
                                                {objectDeleteDependencies.length}
                                            </p>
                                            <p className="text-xs leading-5 text-red-800">
                                                {t("admin.objectDetail.blockingReferencesDesc")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                                            <Layers3 className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-amber-950">{t("admin.objectDetail.objectOwnedHeader")}</p>
                                            <p className="text-2xl font-bold tracking-tight text-amber-900">
                                                {informationalDependencies.length}
                                            </p>
                                            <p className="text-xs leading-5 text-amber-800">
                                                {t("admin.objectDetail.objectOwnedDesc")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-lg bg-white p-2 text-slate-700 shadow-sm">
                                            <ShieldCheck className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-900">{t("admin.objectDetail.records")}</p>
                                            <p className="text-2xl font-bold tracking-tight text-slate-900">
                                                {recordCount}
                                            </p>
                                            <p className="text-xs leading-5 text-slate-600">
                                                {t("admin.objectDetail.existingRecordsBlock")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 h-4 w-4 text-slate-500" />
                                    <div className="space-y-1">
                                        <p className="font-medium text-slate-900">{t("admin.objectDetail.howToReadTab")}</p>
                                        <p className="leading-6">
                                            <span className="font-medium text-red-900">{t("admin.objectDetail.blocksObjectDelete")}</span> {t("admin.objectDetail.blocksObjectDeleteDesc")}
                                            <span className="mx-1 text-slate-300">|</span>
                                            <span className="font-medium text-amber-900">{t("admin.objectDetail.belongsToObject")}</span> {t("admin.objectDetail.belongsToObjectDesc")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {recordCount > 0 ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    {t("admin.objectDetail.thisObjectHasRecords", { count: recordCount })}
                                    {t("admin.objectDetail.recordsMustBeRemoved")}
                                </div>
                            ) : null}
                            <div className="rounded-xl border border-red-200 bg-red-50/40">
                                <div className="border-b border-red-200 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-red-950">{t("admin.objectDetail.blocksObjectDelete")}</h3>
                                            <p className="mt-1 text-sm text-red-800">
                                                {t("admin.objectDetail.blocksDeleteDesc")}
                                            </p>
                                        </div>
                                        <Badge className="border-red-200 bg-white text-red-800 hover:bg-white">
                                            {t("admin.objectDetail.countBlockers", { count: objectDeleteDependencies.length })}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="px-5 py-4">
                                    <DependencyList
                                        dependencies={objectDeleteDependencies}
                                        emptyMessage={t("admin.objectDetail.noMetadataReferences")}
                                    />
                                </div>
                            </div>
                            <div className="rounded-xl border border-amber-200 bg-amber-50/40">
                                <div className="border-b border-amber-200 px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-amber-950">{t("admin.objectDetail.belongsToObject")}</h3>
                                            <p className="mt-1 text-sm text-amber-800">
                                                {t("admin.objectDetail.objectOwnedContextDesc")}
                                            </p>
                                        </div>
                                        <Badge className="border-amber-200 bg-white text-amber-800 hover:bg-white">
                                            {t("admin.objectDetail.countItems", { count: informationalDependencies.length })}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="px-5 py-4">
                                    <DependencyList
                                        dependencies={informationalDependencies}
                                        emptyMessage={t("admin.objectDetail.noObjectOwned")}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
