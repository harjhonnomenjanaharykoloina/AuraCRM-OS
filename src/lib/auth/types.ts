import type { Session as BetterAuthSession, User as BetterAuthUser } from "better-auth";

/**
 * SessionUser extends BetterAuth's User with the additionalFields
 * configured in src/auth.ts (organizationId, userType) plus the
 * username from the username plugin.
 *
 * BetterAuth's TypeScript types do not properly expose these
 * additional fields, which is why `session.user as any` casts
 * proliferated throughout the codebase. This interface provides
 * a single source of truth for the session user shape.
 */
export interface SessionUser extends BetterAuthUser {
    id: string;
    organizationId?: number;
    userType?: string;
    username?: string;
}

/**
 * Full BetterAuth session shape returned by `getSession`.
 * Equivalent to the return type of `auth()` in src/auth.ts.
 */
export type SessionWithUser = {
    user: SessionUser;
    session: BetterAuthSession;
} | null;

/**
 * Broad input type that accepts any session-like object
 * (BetterAuth session, proxy session, mock sessions in tests).
 */
type SessionLike = { user?: unknown } | null | undefined;

/**
 * Safely extracts and validates the session user.
 * Returns `SessionUser | null` – never throws.
 */
export function getSessionUser(session: SessionLike): SessionUser | null {
    if (!session || typeof session !== "object") return null;

    const user = (session as { user?: unknown }).user;
    if (!user || typeof user !== "object") return null;

    const u = user as Record<string, unknown>;

    if (!u.id) {
        return null;
    }

    return u as unknown as SessionUser;
}

/**
 * Extracts the session user with parseInt conversion for numeric IDs.
 * Throws if the session is invalid or IDs cannot be parsed.
 */
export function parseSessionUser(session: SessionLike): SessionUser {
    const user = getSessionUser(session);

    if (!user) {
        throw new Error(
            "Invalid session: Missing user ID. Please sign out and sign in again."
        );
    }

    if (user.organizationId !== undefined) {
        const organizationId =
            typeof user.organizationId === "number"
                ? user.organizationId
                : parseInt(String(user.organizationId), 10);

        if (isNaN(organizationId)) {
            throw new Error(
                "Invalid session: Organization ID is not a number. Please sign out and sign in again."
            );
        }

        return {
            ...user,
            organizationId,
        };
    }

    return user;
}
