"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createApp, updateApp, deleteApp } from "@/actions/admin/admin-actions";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowLeft, ArrowUp, LayoutGrid, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { IconPicker } from "@/components/admin/objects/icon-picker";
import { normalizeApiName } from "@/lib/api-names";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "@/i18n/client";


interface AppFormProps {
    initialData?: {
        id: number;
        name: string;
        apiName: string;
        description: string | null;
        icon: string | null;
        navItems: { objectDefId: number }[];
        widgets: any[];
    };
    availableObjects: { id: number; label: string; apiName: string }[];
}

export function AppForm({ initialData, availableObjects }: AppFormProps) {
    const t = useTranslations();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [apiNameEdited, setApiNameEdited] = useState(Boolean(initialData?.apiName));

    const formSchema = useMemo(() => z.object({
        name: z.string().min(1, t("admin.appForm.nameRequired")),
        apiName: z.string().min(1, t("admin.appForm.apiNameRequired")),
        description: z.string().optional(),
        icon: z.string().optional(),
        navItems: z.array(z.number()),
    }), [t]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            apiName: initialData?.apiName || "",
            description: initialData?.description || "",
            icon: initialData?.icon || "",
            navItems: initialData?.navItems.map((item) => item.objectDefId) || [],
        },
    });
    const nameValue = form.watch("name");
    const selectedNavItemIds = form.watch("navItems");
    const selectedNavObjects = selectedNavItemIds
        .map((objectId) => availableObjects.find((obj) => obj.id === objectId))
        .filter((obj): obj is { id: number; label: string; apiName: string } => Boolean(obj));

    useEffect(() => {
        if (apiNameEdited) return;
        const normalized = normalizeApiName(nameValue || "");
        form.setValue("apiName", normalized, { shouldValidate: true });
    }, [apiNameEdited, form, nameValue]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (initialData) {
                const result = await updateApp(initialData.id, values);
                if (result.success) {
                    toast.success(t("admin.appForm.updateSuccess"));
                    router.refresh();
                } else {
                    toast.error(result.error);
                }
            } else {
                const result = await createApp(values);
                if (result.success) {
                    toast.success(t("admin.appForm.createSuccess"));
                    router.push("/admin/apps");
                } else {
                    toast.error(result.error);
                }
            }
        } catch {
            toast.error(t("admin.appForm.error"));
        }
    }

    async function handleDelete() {
        if (!initialData) return;
        setIsDeleting(true);
        try {
            const result = await deleteApp(initialData.id);
            if (result.success) {
                toast.success(t("admin.appForm.deleteSuccess"));
                router.push("/admin/apps");
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error(t("admin.appForm.error"));
        } finally {
            setIsDeleting(false);
        }
    }

    function moveNavItem(objectId: number, direction: "up" | "down") {
        const current = form.getValues("navItems");
        const index = current.indexOf(objectId);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= current.length) return;

        const next = [...current];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        form.setValue("navItems", next, { shouldDirty: true, shouldValidate: true });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/apps">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {initialData ? t("admin.appForm.editApp") : t("admin.appForm.newApp")}
                    </h1>
            </div>
                {initialData && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("admin.appForm.deleteApp")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("admin.appForm.deleteConfirm")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("admin.appForm.deleteDesc")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("admin.appForm.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>
                                    {t("admin.appForm.deleteApp")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Left Column: General Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("admin.appForm.appDetails")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("admin.appForm.appName")}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t("admin.appForm.namePlaceholder")} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="apiName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("shared.common.apiName")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t("admin.appForm.apiNamePlaceholder")}
                                                        {...field}
                                                        onChange={(event) => {
                                                            setApiNameEdited(true);
                                                            field.onChange(normalizeApiName(event.target.value));
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    {t("admin.appForm.apiNameDescription")}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("admin.appForm.description")}</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={t("admin.appForm.descriptionPlaceholder")}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="icon"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>{t("admin.appForm.appIcon")}</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between pl-3 font-normal h-12",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {(() => {
                                                                            const Icon = (LucideIcons as any)[field.value] || LucideIcons.Box;
                                                                            return <Icon className="h-5 w-5 text-primary" />;
                                                                        })()}
                                                                        <span className="font-medium">{field.value}</span>
                                                                    </div>
                                                                ) : (
                                                                    t("admin.appForm.selectIcon")
                                                                )}
                                                                <LayoutGrid className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[380px] p-0" align="start">
                                                        <div className="p-4">
                                                            <IconPicker value={field.value || ""} onChange={field.onChange} />
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormDescription>
                                                    {t("admin.appForm.iconDescription")}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Navigation */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("admin.appForm.navigationItems")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FormField
                                        control={form.control}
                                        name="navItems"
                                        render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel className="text-base">{t("admin.appForm.selectObjects")}</FormLabel>
                                                    <FormDescription>
                                                        {t("admin.appForm.selectObjectsHelp")}
                                                    </FormDescription>
                                                </div>
                                                <div className="space-y-5">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {availableObjects.map((obj) => (
                                                            <FormField
                                                                key={obj.id}
                                                                control={form.control}
                                                                name="navItems"
                                                                render={({ field }) => {
                                                                    return (
                                                                        <FormItem
                                                                            key={obj.id}
                                                                            className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-slate-200 hover:bg-slate-50/70"
                                                                        >
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={field.value?.includes(obj.id)}
                                                                                    onCheckedChange={(checked) => {
                                                                                        const current = field.value ?? [];
                                                                                        return checked
                                                                                            ? field.onChange([...current, obj.id])
                                                                                            : field.onChange(
                                                                                                current.filter((value) => value !== obj.id)
                                                                                            );
                                                                                    }}
                                                                                />
                                                                            </FormControl>
                                                                            <FormLabel className="font-normal">
                                                                                {obj.label}
                                                                            </FormLabel>
                                                                        </FormItem>
                                                                    );
                                                                }}
                                                            />
                                                        ))}
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-900">{t("admin.appForm.navigationOrder")}</div>
                                                                <div className="text-xs text-slate-500">
                                                                    {t("admin.appForm.navOrderDescription")}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs font-medium text-slate-500">
                                                                {t("admin.appForm.selectedCount", { count: selectedNavObjects.length })}
                                                            </div>
                                                        </div>

                                                        {selectedNavObjects.length === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                                                                {t("admin.appForm.selectAtLeastOne")}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {selectedNavObjects.map((obj, index) => (
                                                                    <div
                                                                        key={obj.id}
                                                                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                                                    >
                                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                                                            {index + 1}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="truncate text-sm font-medium text-slate-900">
                                                                                {obj.label}
                                                                            </div>
                                                                            <div className="truncate text-xs text-slate-500">
                                                                                {obj.apiName}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="h-8 w-8"
                                                                                onClick={() => moveNavItem(obj.id, "up")}
                                                                                disabled={index === 0}
                                                                                aria-label={t("admin.appForm.moveUp", { label: obj.label })}
                                                                            >
                                                                                <ArrowUp className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="icon"
                                                                                className="h-8 w-8"
                                                                                onClick={() => moveNavItem(obj.id, "down")}
                                                                                disabled={index === selectedNavObjects.length - 1}
                                                                                aria-label={t("admin.appForm.moveDown", { label: obj.label })}
                                                                            >
                                                                                <ArrowDown className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Dashboard Builder Link - Only if App Exists */}
                    {initialData && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">{t("admin.appForm.dashboardWidgets")}</h3>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t("admin.appForm.dashboardTitle")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        {t("admin.appForm.dashboardDesc")}
                                    </p>

                                    <div className="flex items-center gap-4">
                                        <Button asChild variant="default" className="gap-2">
                                            <Link href={`/admin/apps/${initialData.id}/builder`}>
                                                <LayoutGrid className="h-4 w-4" />
                                                {t("admin.appForm.launchBuilder")}
                                            </Link>
                                        </Button>
                                        <div className="text-xs text-muted-foreground">
                                            {t("admin.appForm.configuredCount", { count: initialData.widgets?.length || 0 })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => router.back()}>
                            {t("admin.appForm.cancel")}
                        </Button>
                        <Button type="submit">
                            {initialData ? t("admin.appForm.saveChanges") : t("admin.appForm.createApp")}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
