"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteSharingRule, toggleSharingRule } from "@/actions/admin/sharing-rule-actions";
import { useRouter } from "next/navigation";
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

export function SharingRuleActions({
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
            const result = await toggleSharingRule(ruleId, !isActive);
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
            const result = await deleteSharingRule(ruleId);
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
                        <AlertDialogTitle>{t("admin.sharingRuleDelete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.sharingRuleDelete.description")}
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
