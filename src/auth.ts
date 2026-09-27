import bcryptjs from "bcryptjs"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma-adapter"
import { username } from "better-auth/plugins/username"
import { emailOTP, testUtils } from "better-auth/plugins"
import { admin as adminPlugin } from "better-auth/plugins"
import { toNextJsHandler } from "better-auth/next-js"
import { db } from "@/lib/db"
import { BCRYPT_COST } from "@/lib/crypto"
import { sendVerificationOTPEmail } from "@/lib/email"
import { ac, admin, manager, user } from "@/lib/auth/permissions"

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

// Align the secret between BetterAuth config and any JWT verification.
// BetterAuth_SECRET takes priority, falling back to JWT_SECRET.
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET

// Fail loudly in production if no secret is configured at all
if (process.env.NODE_ENV === "production" && !authSecret) {
    throw new Error(
        "JWT_SECRET (or BETTER_AUTH_SECRET) is not set. This is required for production authentication. " +
        "Set it in your environment variables."
    )
}

// In development, warn about missing or weak/placeholder secrets without failing
if (process.env.NODE_ENV !== "production") {
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

export const betterAuthInstance = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    secret: authSecret,
    onAPIError: {
        throw: true,
    },
    cookie: {
        // In production, cookies must only be sent over HTTPS
        secure: process.env.NODE_ENV === "production",
        // SameSite=Lax prevents CSRF on cross-site requests (middleware CSRF check is defense-in-depth)
        sameSite: "lax",
        // Prevent JavaScript access to session cookies
        httpOnly: true,
        // 30-day session, aligned with better-auth JWT strategy
        maxAge: 30 * 24 * 60 * 60,
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
                required: true,
            },
            userType: {
                type: "string",
                required: true,
            },
            role: {
                type: "string",
                defaultValue: "user",
                input: false,
            },
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
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
