"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { deleteDuplicateRule, toggleDuplicateRule } from "@/actions/admin/duplicate-rule-actions";
import { useTranslations } from "@/i18n/client";

export function DuplicateRuleActions({
    ruleId,
    isActive,
}: {
    ruleId: number;
    isActive: boolean;
}) {
    const t = useTranslations();
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await toggleDuplicateRule(ruleId, !isActive);
            if (result.success) {
                toast.success(
                    isActive ? t("admin.ruleCommon.ruleDeactivated") : t("admin.ruleCommon.ruleActivated")
                );
                router.refresh();
            } else {
                toast.error(result.error);
            }
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteDuplicateRule(ruleId);
            if (result.success) {
                toast.success(t("admin.ruleCommon.ruleDeleted"));
                router.refresh();
            } else {
                toast.error(result.error);
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToggle} disabled={isPending}>
                {isActive ? t("admin.ruleCommon.deactivate") : t("admin.ruleCommon.activate")}
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isPending}>
                        {t("shared.buttons.delete")}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.duplicateRuleDelete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.duplicateRuleDelete.description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("admin.ruleCommon.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>{t("shared.buttons.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
