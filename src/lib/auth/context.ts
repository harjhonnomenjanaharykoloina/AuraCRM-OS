import { auth } from "@/auth";
import { parseSessionUser } from "@/lib/auth/types";
import { CacheKeys, getOrSet } from "@/lib/cache";
import { logDebug, logWarn } from "@/lib/logger";

export interface UserContext {
    userId: number;
    organizationId: number;
    userType: string;
}

const CONTEXT_CACHE_TTL_SECONDS = 60;

export async function getUserContext(): Promise<UserContext> {
    const session = await auth();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    const user = parseSessionUser(session);
    const userId = parseInt(user.id, 10);
    const organizationId = user.organizationId;

    if (organizationId == null || isNaN(userId) || isNaN(organizationId)) {
        throw new Error(
            "Invalid session: Missing user ID or Organization ID. Please sign out and sign in again."
        );
    }

    const context: UserContext = { userId, organizationId, userType: user.userType ?? "user" };

    const cached = await getOrSet<UserContext>(
        CacheKeys.userContext(userId, organizationId),
        CONTEXT_CACHE_TTL_SECONDS,
        async () => context
    );

    if (!cached) {
        logWarn("getUserContext: cache returned null after fetch", {
            userId,
            organizationId,
        });
    }

    logDebug("User context resolved", { userId, organizationId, userType: user.userType });

    return cached ?? context;
}

export async function requireAuth() {
    return getUserContext();
}

export async function requireAdmin() {
    const { userId, organizationId, userType } = await getUserContext();
    if (userType !== "admin") {
        throw new Error("Forbidden: Admin access required");
    }
    return { userId, organizationId };
}
