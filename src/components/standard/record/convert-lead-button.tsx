"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertLead } from "@/actions/standard/lead-actions";

interface ConvertLeadButtonProps {
    objectApiName: string;
    recordId: number;
}

export function ConvertLeadButton({ objectApiName, recordId }: ConvertLeadButtonProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    return (
        <Button
            onClick={() => {
                startTransition(async () => {
                    const result = await convertLead(objectApiName, recordId);
                    if (result.success) {
                        if (result.alreadyConverted) {
                            toast.success("Lead already converted", {
                                description: `Contact: ${result.contactId ?? "—"}, Company: ${result.companyId ?? "—"}, Opportunity: ${result.opportunityId ?? "—"}`,
                            });
                        } else {
                            toast.success("Lead converted", {
                                description: `Contact: ${result.contactId}, Company: ${result.companyId ?? "—"}, Opportunity: ${result.opportunityId}`,
                            });
                        }
                        router.refresh();
                    } else {
                        toast.error(result.error || "Failed to convert lead");
                    }
                });
            }}
            disabled={isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
            <Icons.UserPlus className="mr-2 h-4 w-4" />
            Convert Lead
        </Button>
    );
}
