import bcryptjs from "bcryptjs"
import { User } from "@prisma/client"
import { db } from "@/lib/db"

export async function legacySignIn(
    username: string,
    password: string
): Promise<User | null> {
    const user = await db.user.findUnique({
        where: { username },
    })

    if (!user) {
        return null
    }

    // Better Auth's username plugin uses providerId "credential" (via findCredentialAccount)
    const account = await db.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
    })

    if (!account || !account.password) {
        return null
    }

    const passwordHash = account.password
    const passwordValid = await bcryptjs.compare(password, passwordHash)

    if (!passwordValid) {
        return null
    }

    return user
}
