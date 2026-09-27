"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserOrganizations, switchOrganization } from "@/actions/auth/org-actions";
import type { OrganizationSummary } from "@/actions/auth/org-actions";

export default function OrgSwitcher() {
    const router = useRouter();
    const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentOrg = orgs.find((o) => o.id === currentId);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            const result = await getUserOrganizations();
            if (cancelled) return;
            if (result.error) {
                setError(result.error);
                setOrgs([]);
                setCurrentId(null);
            } else {
                setOrgs(result.organizations);
                setCurrentId(result.currentOrganizationId);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSelectOrg(orgId: number) {
        setError(null);
        const result = await switchOrganization(orgId);
        if (result.success) {
            setCurrentId(orgId);
            router.refresh();
        } else if (result.error) {
            setError(result.error);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex w-full min-w-[200px] items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    aria-label="Switch organization"
                >
                    <span>
                        {loading
                            ? "Loading..."
                            : currentOrg
                              ? currentOrg.name
                              : "Switch Organization"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {error ? (
                    <span className="block px-2 py-1.5 text-sm text-destructive">
                        {error}
                    </span>
                ) : orgs.length === 0 ? (
                    <DropdownMenuItem disabled>No organizations found</DropdownMenuItem>
                ) : (
                    orgs.map((org) => (
                        <DropdownMenuItem
                            key={org.id}
                            disabled={org.id === currentId}
                            onSelect={() => handleSelectOrg(org.id)}
                        >
                            <span className="flex flex-col">
                                <span>{org.name}</span>
                                <span className="text-xs opacity-60">/{org.slug}</span>
                            </span>
                            {org.id === currentId && (
                                <span className="ml-auto text-xs">(current)</span>
                            )}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
