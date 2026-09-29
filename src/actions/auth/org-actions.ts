"use server";

import { db } from "@/lib/db";
import { assertAuthRuntimeEnv, betterAuthInstance } from "@/auth";
import { getUserContext } from "@/lib/auth/context";

export type OrganizationSummary = {
    id: number;
    name: string;
    slug: string;
};

export type GetUserOrganizationsResult = {
    organizations: OrganizationSummary[];
    currentOrganizationId: number | null;
    error?: string;
};

export async function getUserOrganizations(): Promise<GetUserOrganizationsResult> {
    try {
        const { userId, organizationId } = await getUserContext();

        const memberships = await db.organizationMember.findMany({
            where: { userId },
            select: {
                organization: { select: { id: true, name: true, slug: true } },
            },
        });

        return {
            organizations: memberships.map((m) => m.organization),
            currentOrganizationId: organizationId,
        };
    } catch (error: any) {
        console.error("getUserOrganizations error:", error);
        return {
            organizations: [],
            currentOrganizationId: null,
            error: error?.message ?? "Failed to load organizations",
        };
    }
}

export async function switchOrganization(targetOrganizationId: number): Promise<{
    success: boolean;
    organizationId?: number;
    error?: string;
}> {
    try {
        const { userId } = await getUserContext();

        const targetOrgId = Number(targetOrganizationId);
        if (!Number.isFinite(targetOrgId) || targetOrgId <= 0 || !Number.isInteger(targetOrgId)) {
            return { success: false, error: "Invalid organization ID" };
        }

        const membership = await db.organizationMember.findFirst({
            where: { userId, organizationId: targetOrgId },
        });

        if (!membership) {
            return { success: false, error: "Not a member of the requested organization" };
        }

        const { headers } = await import("next/headers");

        assertAuthRuntimeEnv();

        await betterAuthInstance.api.updateSession({
            headers: await headers(),
            body: { organizationId: targetOrgId },
        });

        return { success: true, organizationId: targetOrgId };
    } catch (error: any) {
        console.error("switchOrganization error:", error);
        return {
            success: false,
            error: error?.message ?? "Failed to switch organization",
        };
    }
}
