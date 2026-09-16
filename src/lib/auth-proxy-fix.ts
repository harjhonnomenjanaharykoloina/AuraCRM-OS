import bcryptjs from "bcryptjs";
import { User } from "@prisma/client";
import { db } from "@/lib/db";

export async function legacySignIn(
    username: string,
    password: string
): Promise<User | null> {
    const user = await db.user.findUnique({
        where: { username },
    });

    if (!user) {
        return null;
    }

    const usernameAccount = await db.account.findFirst({
        where: {
            userId: user.id,
            providerId: "username",
        },
    });

    if (!usernameAccount || !usernameAccount.password) {
        return null;
    }

    const passwordHash = usernameAccount.password;

    const passwordValid = await bcryptjs.compare(password, passwordHash);

    if (!passwordValid) {
        return null;
    }

    await db.account.upsert({
        where: {
            providerId_accountId: {
                providerId: "credential",
                accountId: String(user.id),
            },
        },
        update: {
            password: passwordHash,
        },
        create: {
            id: crypto.randomUUID(),
            userId: user.id,
            accountId: String(user.id),
            providerId: "credential",
            password: passwordHash,
        },
    });

    return user;
}
