"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { seedDemoData } from "@/actions/admin/seed-demo-data";
import { useTranslations } from "@/i18n/client";

export function DemoDataButton() {
    const t = useTranslations();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSeed = async () => {
        setLoading(true);
        try {
            const result = await seedDemoData();
            if (result.success) {
                toast.success(t("admin.demoData.success"));
                setOpen(false);
            } else {
                toast.error(result.error || t("admin.demoData.error"));
            }
        } catch {
            toast.error(t("admin.demoData.unexpectedError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Database className="h-4 w-4" />
                    {t("admin.demoData.button")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("admin.demoData.title")}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="text-muted-foreground text-sm">
                            {t("admin.demoData.description")}
                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                <li>{t("admin.demoData.bulletApps")}</li>
                                <li>{t("admin.demoData.bulletObjects")}</li>
                                <li>{t("admin.demoData.bulletUsers")}</li>
                                <li>{t("admin.demoData.bulletWidgets")}</li>
                            </ul>
                            <br />
                            {t("admin.demoData.warning")}{" "}
                            <strong>{t("admin.demoData.cannotUndo")}</strong>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{t("admin.demoData.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleSeed();
                        }}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? t("admin.demoData.creating") : t("admin.demoData.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
