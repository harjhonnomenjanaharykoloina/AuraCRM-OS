import bcryptjs from "bcryptjs"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma-adapter"
import { username } from "better-auth/plugins/username"
import { emailOTP, testUtils } from "better-auth/plugins"
import { admin as adminPlugin } from "better-auth/plugins"
import { nextCookies, toNextJsHandler } from "better-auth/next-js"
import { db } from "@/lib/db"
import { BCRYPT_COST } from "@/lib/crypto"
import { sendVerificationOTPEmail } from "@/lib/email"
import { ac, admin, manager, user } from "@/lib/auth/permissions"
import { logInfo, logWarn, logError } from "@/lib/logger"
import { createOrgTemplate } from "@/lib/seeding/create-org-template"
import { ensureUserCompanionRecord } from "@/lib/user-companion"

const PRODUCTION_ORIGIN = "https://auracrm-production.up.railway.app"
const DEVELOPMENT_ORIGIN = "http://localhost:3000"
const GOOGLE_CALLBACK_PATH = "/api/auth/callback/google"

const WEAK_SECRET_VALUES = new Set([
    "replace-with-a-strong-secret",
    "your-secret-here",
    "your-secret",
    "secret",
    "changeme",
    "changeme123",
    "password",
    "password123",
])

function isWeakSecret(secret?: string): boolean {
    if (!secret) {
        return true
    }
    if (WEAK_SECRET_VALUES.has(secret)) {
        return true
    }
    if (secret.length < 16) {
        return true
    }
    return false
}

// Returns a trimmed, non-empty env var or undefined.
// Empty strings coming from Railway/`.env` are treated as "not set" so they
// never leak into provider config (e.g. `redirectURI: ""`).
function readEnv(name: string): string | undefined {
    const value = process.env[name]
    if (typeof value !== "string") {
        return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

// Production names first, legacy names kept as backwards-compatible fallbacks.
function readFirstEnv(...names: string[]): string | undefined {
    for (const name of names) {
        const value = readEnv(name)
        if (value) {
            return value
        }
    }
    return undefined
}

const isProduction = process.env.NODE_ENV === "production"

// Align the secret between BetterAuth config and any JWT verification.
// BETTER_AUTH_SECRET takes priority, falling back to JWT_SECRET.
const authSecret = readFirstEnv("BETTER_AUTH_SECRET", "JWT_SECRET")

// Railway injects production environment variables at runtime.
const configuredAuthUrl = readEnv("BETTER_AUTH_URL")
const authBaseUrl = configuredAuthUrl ?? (isProduction ? PRODUCTION_ORIGIN : undefined)

// GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are the production variable names.
// GOOGLE_ID/GOOGLE_SECRET remain supported as fallbacks for older deployments.
const googleClientId = readFirstEnv("GOOGLE_CLIENT_ID", "GOOGLE_ID")
const googleClientSecret = readFirstEnv("GOOGLE_CLIENT_SECRET", "GOOGLE_SECRET")
const googleCallbackUrl = readEnv("GOOGLE_CALLBACK_URL")
const hasGoogleOAuth = Boolean(googleClientId && googleClientSecret)

// The same redirect URI is used for createAuthorizationURL (auth URL) and
// validateAuthorizationCode (token exchange), so Google must have exactly this
// value registered.
const expectedGoogleCallbackUrl = authBaseUrl
    ? `${authBaseUrl.replace(/\/+$/, "")}${GOOGLE_CALLBACK_PATH}`
    : `${DEVELOPMENT_ORIGIN}${GOOGLE_CALLBACK_PATH}`

const trustedOrigins = Array.from(
    new Set(
        [
            PRODUCTION_ORIGIN,
            DEVELOPMENT_ORIGIN,
            configuredAuthUrl,
            readEnv("NEXT_PUBLIC_APP_URL"),
        ].filter((origin): origin is string => Boolean(origin))
    )
)

function assertProductionEnv(): void {
    if (!isProduction) {
        return
    }

    const missing: string[] = []

    if (!authSecret) {
        missing.push("BETTER_AUTH_SECRET (or JWT_SECRET)")
    }
    if (!configuredAuthUrl) {
        missing.push(`BETTER_AUTH_URL (expected ${PRODUCTION_ORIGIN})`)
    }
    if (!googleClientId) {
        missing.push("GOOGLE_CLIENT_ID (or GOOGLE_ID)")
    }
    if (!googleClientSecret) {
        missing.push("GOOGLE_CLIENT_SECRET (or GOOGLE_SECRET)")
    }

    if (missing.length > 0) {
        throw new Error(
            `[auth] Missing required production environment variables: ${missing.join(", ")}. ` +
            "Set them on the Railway service before starting the app."
        )
    }
}

// Fail loudly in production if required auth configuration is absent.
assertProductionEnv()

// In development, warn about missing or weak/placeholder secrets without failing.
if (!isProduction) {
    if (!authSecret) {
        console.warn(
            "[auth] JWT_SECRET (or BETTER_AUTH_SECRET) is not set. " +
            "Authentication may not work correctly. Generate one with: openssl rand -base64 32"
        )
    } else if (isWeakSecret(authSecret)) {
        console.warn(
            "[auth] BETTER_AUTH_SECRET/JWT_SECRET appears to be a weak or placeholder value. " +
            "Please replace it with a strong secret generated via: openssl rand -base64 32"
        )
    }
}

// Validate Google OAuth credentials. Configuration is validated at runtime rather
// than during Next.js static/build-time page collection.
if (!googleClientId) {
    console.warn(
        "[auth] GOOGLE_CLIENT_ID (or GOOGLE_ID) is not set. Google Sign-In will not be available."
    )
}
if (!googleClientSecret) {
    console.warn(
        "[auth] GOOGLE_CLIENT_SECRET (or GOOGLE_SECRET) is not set. Google Sign-In will not be available."
    )
}

if (hasGoogleOAuth) {
    logInfo("[auth] Google OAuth provider configured", {
        providerId: "google",
        hasClientId: true,
        hasClientSecret: true,
        redirectURI: googleCallbackUrl ?? expectedGoogleCallbackUrl,
    })
}

const SENSITIVE_KEY_PATTERN =
    /(pass(word)?|secret|token|cookie|otp|code_verifier|authorization|credential|api[-_]?key|session)/i

const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
    /\beyJ[A-Za-z0-9_-]{10,}\.?[A-Za-z0-9_-]*/g, // JWTs / session tokens
    /\bya29\.[A-Za-z0-9._-]+/g, // Google access tokens
    /\b1\/\/[A-Za-z0-9._-]{20,}/g, // OAuth refresh tokens
]

function sanitizeText(value: string): string {
    let sanitized = value
    for (const pattern of SENSITIVE_VALUE_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[REDACTED]")
    }
    if (SENSITIVE_KEY_PATTERN.test(sanitized)) {
        return "[REDACTED]"
    }
    return sanitized
}

// Log-safe error description. Never logs stack traces, which can embed request
// bodies (passwords, OTPs, OAuth codes) or credential material.
function describeError(error: unknown): {
    name: string
    message: string
    status?: number
} {
    if (error instanceof Error) {
        const status = (error as { status?: unknown }).status
        const message = error.message || error.name
        return {
            name: error.name || "Error",
            message: SENSITIVE_KEY_PATTERN.test(message)
                ? "[REDACTED]"
                : sanitizeText(message).slice(0, 300),
            ...(typeof status === "number" ? { status } : {}),
        }
    }
    if (typeof error === "string") {
        return { name: "Error", message: sanitizeText(error).slice(0, 300) }
    }
    return { name: "UnknownError", message: "[UNSERIALIZABLE_ERROR]" }
}

function safePath(input: unknown): string | undefined {
    if (typeof input !== "string") {
        return undefined
    }
    return input.split("?")[0]
}

// Safe server-side logging for authentication failures. Only non-sensitive
// metadata (path, method, status, redacted message) is ever recorded.
function logAuthFailure(message: string, context: Record<string, unknown> = {}): void {
    logError(`[auth] ${message}`, {
        ...context,
        redacted: true,
    })
}

// Better Auth does not expose the error-callback context type publicly, so it
// is treated as opaque: only non-sensitive fields are read out of it.
type AuthErrorContext = any
type AuthErrorHandler = (error: unknown, ctx: AuthErrorContext) => void

function buildAuthFailureLogger(message: string): AuthErrorHandler {
    return (error, ctx) => {
        logAuthFailure(message, {
            path: safePath(ctx?.path as unknown),
            method: ctx?.method as unknown,
            ...describeError(error),
        })
    }
}

export const betterAuthInstance = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    secret: authSecret,
    baseURL: authBaseUrl,
    basePath: "/api/auth",
    trustedOrigins,
    // Return proper HTTP error responses instead of unhandled 500s.
    onAPIError: {
        throw: false,
        onError: buildAuthFailureLogger("API error during auth request"),
    },
    onError: buildAuthFailureLogger("Unhandled authentication error"),
    advanced: {
        defaultCookieAttributes: {
            httpOnly: true,
            sameSite: "lax",
            secure: isProduction,
        },
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        password: {
            hash: async (password: string) => {
                return bcryptjs.hash(password, BCRYPT_COST)
            },
            verify: async (data: { hash: string; password: string }) => {
                return bcryptjs.compare(data.password, data.hash)
            },
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            strategy: "jwt",
        },
        additionalFields: {
            organizationId: {
                type: "number",
                required: false,
            },
        },
    },
    user: {
        additionalFields: {
            organizationId: {
                type: "number",
                required: false,
            },
            userType: {
                type: "string",
                required: false,
            },
            role: {
                type: "string",
                defaultValue: "user",
                input: false,
            },
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
            disableImplicitLinking: false,
            requireLocalEmailVerified: false,
        },
    },
    socialProviders: {
        // Google OAuth callback path: /api/auth/callback/google, handled by the
        // catch-all [...all]/route.ts handler. The redirect URI is:
        //   1. redirectURI, only when GOOGLE_CALLBACK_URL is a non-empty string
        //   2. ${baseURL}/api/auth/callback/google (auto-generated from baseURL)
        ...(hasGoogleOAuth
            ? {
                  google: {
                      clientId: googleClientId as string,
                      clientSecret: googleClientSecret as string,
                      ...(googleCallbackUrl ? { redirectURI: googleCallbackUrl } : {}),
                  },
              }
            : {}),
    },
    hooks: {
        before: async (ctx) => {
            const path = (ctx as any)?.path as string | undefined;
            if (path?.includes("callback/google")) {
                logInfo("[OAuth] Google callback received", { path: safePath(path) });
            }
            return {};
        },
        after: async (ctx) => {
            const path = (ctx as any)?.path as string | undefined;
            if (path?.includes("callback/google")) {
                logInfo("[OAuth] Google callback completed", { path: safePath(path) });
            }
            return {};
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (data, context) => {
                    // Only provision org if the user doesn't already have one
                    // (The custom register() action sets organizationId directly via Prisma,
                    //  so this hook only fires for OAuth/email-OTP/BetterAuth-native sign-ups)
                    if (!data.organizationId) {
                        const email = data.email ?? "";
                        const orgName = email
                            ? `${email.split("@")[0]}'s Organization`
                            : `Organization-${Date.now()}`;
                        const slug = `org-${crypto.randomUUID().slice(0, 8)}`;

                        try {
                            const org = await db.organization.create({
                                data: { name: orgName, slug },
                            });
                            logInfo("[OAuth] Organization provisioned for new user", {
                                email: data.email,
                                provider: context?.path?.includes("callback") ? "google" : "unknown",
                                organizationId: org.id,
                            });
                            return {
                                data: {
                                    organizationId: org.id,
                                    userType: "admin",
                                },
                            };
                        } catch (error) {
                            logError("[OAuth] Failed to create organization for new user", {
                                email: data.email,
                                ...describeError(error),
                            });
                            throw error;
                        }
                    }

                    if (context?.path?.includes("callback")) {
                        logInfo("[OAuth] New user created with existing organization", {
                            email: data.email,
                            organizationId: data.organizationId,
                        });
                    }

                    return { data };
                },
                after: async (user) => {
                    if (!user.organizationId) {
                        logWarn("[OAuth] New user created without organizationId", {
                            userId: user.id,
                            email: user.email,
                        });
                        return;
                    }

                    const orgId = Number(user.organizationId);

                    // Create organization member record (admin role)
                    try {
                        await db.organizationMember.create({
                            data: {
                                userId: Number(user.id),
                                organizationId: orgId,
                                role: "org_admin",
                                isDefault: true,
                                isActive: true,
                            },
                        });
                        logInfo("[OAuth] Organization membership created", {
                            userId: user.id,
                            email: user.email,
                            organizationId: orgId,
                        });
                    } catch (error) {
                        logError("[OAuth] Failed to create organization membership", {
                            userId: user.id,
                            email: user.email,
                            organizationId: orgId,
                            ...describeError(error),
                        });
                    }

                    // Seed organization template (objects, fields, permission sets)
                    // and create user companion record + assign owner permission set
                    try {
                        const template = await createOrgTemplate(orgId);
                        logInfo("[OAuth] Organization template seeded", {
                            userId: user.id,
                            organizationId: orgId,
                        });

                        await db.$transaction(async (tx) => {
                            await ensureUserCompanionRecord(tx, orgId, Number(user.id));
                            if (template?.ownerPermissionSet?.id) {
                                await tx.permissionSetAssignment.create({
                                    data: {
                                        userId: Number(user.id),
                                        permissionSetId: template.ownerPermissionSet.id,
                                    },
                                });
                            }
                        });
                        logInfo("[OAuth] User companion and permissions set up", {
                            userId: user.id,
                            organizationId: orgId,
                        });
                    } catch (error) {
                        logError("[OAuth] Failed to seed organization or create companion", {
                            userId: user.id,
                            organizationId: orgId,
                            ...describeError(error),
                        });
                    }
                },
            },
        },
        account: {
            create: {
                after: async (account) => {
                    logInfo("[OAuth] Account linked/created for user", {
                        providerId: account.providerId,
                        userId: account.userId,
                    });
                },
            },
        },
        session: {
            create: {
                after: async (session) => {
                    logInfo("[OAuth] Session created", {
                        userId: session.userId,
                    });
                },
            },
        },
    },
    plugins: [
        username({
            displayUsername: false,
        }),
        emailOTP({
            sendVerificationOTP: async ({ email, otp, type }) => {
                if (process.env.NODE_ENV !== "production") {
                    console.log(`[Auth] OTP for ${email}: ${otp} (${type})`)
                    return
                }
                await sendVerificationOTPEmail(email, otp, type)
            },
            disableSignUp: false,
        }),
        ...(process.env.NODE_ENV !== "production"
            ? [testUtils({ captureOTP: true })]
            : []),
        adminPlugin({
            ac,
            roles: { admin, manager, user },
            defaultRole: "user",
        }),
        nextCookies(),
    ],
})

export const handlers = toNextJsHandler(betterAuthInstance)

export async function auth() {
    const { headers } = await import("next/headers")
    return betterAuthInstance.api.getSession({ headers: await headers() })
}

export async function signOut() {
    return betterAuthInstance.api.signOut()
}
