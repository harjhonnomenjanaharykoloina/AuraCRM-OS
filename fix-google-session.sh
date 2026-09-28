#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo " AuraCRM - Fix Google OAuth Session"
echo "=============================================="

ROOT="$(pwd)"
FILE="$ROOT/src/lib/auth/proxy.ts"
BACKUP="$FILE.backup-$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$FILE" ]; then
    echo "❌ Fichier introuvable: $FILE"
    exit 1
fi

echo
echo "1. Backup du proxy actuel..."
cp "$FILE" "$BACKUP"
echo "✅ Backup: $BACKUP"

echo
echo "2. Remplacement de getProxySession..."
cat > "$FILE" <<'PROXY'
import { betterAuthInstance } from "@/auth";

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
PROXY

echo "✅ getProxySession utilise maintenant Better Auth directement."

echo
echo "3. Vérification du fichier..."
sed -n '1,220p' "$FILE"

echo
echo "4. Vérification TypeScript..."
npx tsc --noEmit

echo
echo "5. Vérification du build..."
npm run build

echo
echo "=============================================="
echo " ✅ CORRECTION TERMINÉE"
echo "=============================================="
echo
echo "Backup conservé:"
echo "$BACKUP"
echo
echo "Prochaine étape:"
echo "  railway up"
echo
echo "Puis teste Google Sign-In sur:"
echo "  https://auracrm-production.up.railway.app"
echo
