import { auth } from "@/auth";

export async function getUserContext() {
    const session = await auth();
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    const user = session.user as any;

    if (!user.id || !user.organizationId) {
        console.error("User context missing required fields:", user);
        throw new Error("Invalid session: Missing user ID or Organization ID. Please sign out and sign in again.");
    }

    const userId = parseInt(user.id);
    const organizationId = parseInt(user.organizationId);

    if (isNaN(userId) || isNaN(organizationId)) {
        console.error("User context has invalid IDs:", user);
        throw new Error("Invalid session: IDs are not numbers. Please sign out and sign in again.");
    }

    return { userId, organizationId, userType: user.userType };
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
