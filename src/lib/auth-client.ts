import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"
import { emailOTPClient, adminClient } from "better-auth/client/plugins"
import { ac, admin, manager, user } from "@/lib/auth/permissions"

export const authClient = createAuthClient({
    plugins: [
        usernameClient({ displayUsername: false }),
        emailOTPClient(),
        adminClient({
            ac,
            roles: { admin, manager, user },
        }),
    ],
})

export const { signIn, signUp, signOut, useSession } = authClient
