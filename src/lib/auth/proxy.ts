import { assertAuthRuntimeEnv, betterAuthInstance } from "@/auth";
import { logError } from "@/lib/logger";

export async function getProxySession(req: Request): Promise<{
    user: {
        id: string;
        email?: string;
        name?: string;
        username?: string;
        organizationId?: number;
        userType?: string;
    };
} | null> {
    // WHY this is wrapped: getProxySession is called from Next.js middleware,
    // which has no error handling of its own. An uncaught throw here becomes
    // a site-wide 500 — and because the Railway healthcheck hits /api/health,
    // that 500 prevents replica promotion and every request 404s at the edge.
    //
    // So the proxy layer DEGRADES to "no session" on config error: log loudly
    // and return null. The strict, fail-fast behaviour is preserved in the
    // real auth entrypoints (src/lib/auth/context.ts and
    // src/app/api/auth/[...all]/route.ts), which call assertAuthRuntimeEnv()
    // unguarded and surface a real error to actual users.
    try {
        assertAuthRuntimeEnv();
    } catch (error) {
        logError("[getProxySession] Auth runtime env validation failed; treating as no session", {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }

    try {
        /*
         * IMPORTANT:
         * Do not manually decode better-auth.session_data here.
         *
         * Better Auth owns:
         * - session_token
         * - session_data
         * - cookie signatures
         * - session expiration
         * - session/database validation
         *
         * Using Better Auth's official getSession() avoids
         * depending on the internal cookie format.
         */
        const session = await betterAuthInstance.api.getSession({
            headers: req.headers,
        });

        if (!session?.user) {
            return null;
        }

        const user = session.user as typeof session.user & {
            organizationId?: number | string;
            userType?: string;
            username?: string;
        };

        let organizationId: number | undefined;

        if (typeof user.organizationId === "number") {
            organizationId = user.organizationId;
        } else if (user.organizationId != null) {
            const parsed = Number(user.organizationId);

            if (!Number.isNaN(parsed)) {
                organizationId = parsed;
            }
        }

        return {
            user: {
                id: user.id,
                email:
                    typeof user.email === "string"
                        ? user.email
                        : undefined,
                name:
                    typeof user.name === "string"
                        ? user.name
                        : undefined,
                username:
                    typeof user.username === "string"
                        ? user.username
                        : undefined,
                organizationId,
                userType:
                    typeof user.userType === "string"
                        ? user.userType
                        : undefined,
            },
        };
    } catch (error) {
        console.error(
            "[getProxySession] Better Auth session verification failed:",
            error
        );

        return null;
    }
}
