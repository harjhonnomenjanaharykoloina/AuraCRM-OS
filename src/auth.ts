import bcryptjs from "bcryptjs"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "@better-auth/prisma-adapter"
import { username } from "better-auth/plugins/username"
import { toNextJsHandler } from "better-auth/next-js"
import { db } from "@/lib/db"

export const betterAuthInstance = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        password: {
            hash: async (password: string) => {
                return bcryptjs.hash(password, 12)
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
        },
    },
    plugins: [
        username({
            displayUsername: false,
        }),
    ],
    secret: process.env.JWT_SECRET,
})

export const handlers = toNextJsHandler(betterAuthInstance)

export async function auth() {
    const { headers } = await import("next/headers")
    return betterAuthInstance.api.getSession({ headers: await headers() })
}

export async function signIn(credentials?: { username: string; password: string }) {
    if (!credentials) return null
    try {
        console.log("[AUTH][signIn] Attempting signInUsername for:", credentials.username)
        const result = await betterAuthInstance.api.signInUsername({
            body: {
                username: credentials.username,
                password: credentials.password,
            },
        })
        console.log("[AUTH][signIn] Success - userId:", result?.user?.id)
        return result
    } catch (error) {
        console.error("[AUTH][signIn] Error:", error instanceof Error ? error.message : String(error))
        return { error: error instanceof Error ? error.message : "An error occurred" }
    }
}

export async function signOut() {
    return betterAuthInstance.api.signOut()
}
