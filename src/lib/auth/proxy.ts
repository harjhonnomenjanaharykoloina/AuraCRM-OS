import { jwtVerify } from "jose"

const COOKIE_NAME = "better-auth.session_data"

function getCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.get("cookie") || req.headers.get("cookie") || ""
    if (!cookieHeader) return {}

    const cookies: Record<string, string> = {}
    for (const part of cookieHeader.split(";")) {
        const trimmed = part.trim()
        const eq = trimmed.indexOf("=")
        if (eq > 0) {
            const key = trimmed.slice(0, eq).trim()
            const val = trimmed.slice(eq + 1).trim()
            cookies[key] = val
        }
    }
    return cookies
}

function getSessionToken(cookies: Record<string, string>): string | null {
    if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME]
    if (cookies[`__Secure-${COOKIE_NAME}`]) return cookies[`__Secure-${COOKIE_NAME}`]

    const keys = Object.keys(cookies)
    const baseKey = COOKIE_NAME
    const chunked: string[] = []
    for (const key of keys) {
        if (key === baseKey) return cookies[key]
        if (key === `__Secure-${baseKey}`) return cookies[key]
        const match = key.match(new RegExp(`^(?:__Secure-)?${baseKey}\\.(\\d+)$`))
        if (match) {
            const idx = parseInt(match[1], 10)
            chunked[idx] = cookies[key]
        }
    }
    if (chunked.length > 0) {
        return chunked
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .filter((v) => v !== undefined)
            .join("")
    }

    return null
}

export async function getProxySession(req: Request): Promise<{
    user: {
        id: string
        email: string
        name?: string
        username?: string
        organizationId?: number
        userType?: string
    }
} | null> {
    const cookies = getCookies(req)
    const token = getSessionToken(cookies)

    if (!token) return null

    const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET

    if (!secret) {
        console.error("[proxy] JWT_SECRET or BETTER_AUTH_SECRET is not set")
        return null
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        )

        const user = payload.user as Record<string, unknown> | undefined
        if (!user || !user.id || !user.email) {
            return null
        }

        return {
            user: {
                id: user.id as string,
                email: user.email as string,
                name: user.name as string | undefined,
                username: user.username as string | undefined,
                organizationId: user.organizationId as number | undefined,
                userType: user.userType as string | undefined,
            },
        }
    } catch (err) {
        console.error("[proxy] JWT verification failed:", err)
        return null
    }
}
