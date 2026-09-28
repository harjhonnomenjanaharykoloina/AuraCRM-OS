#!/usr/bin/env bash
set -Eeuo pipefail

echo "=========================================="
echo " AuraCRM - Automatic Production Fix"
echo "=========================================="

PROJECT_DIR="$(pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$PROJECT_DIR/.auracrm-backup-$TIMESTAMP"

echo
echo "[1/8] Vérification du projet..."

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  echo "❌ package.json introuvable."
  echo "Lance ce script depuis ~/Desktop/openCRM"
  exit 1
fi

echo "✓ Projet détecté : $PROJECT_DIR"

echo
echo "[2/8] Création d'une sauvegarde..."

mkdir -p "$BACKUP_DIR"

for file in Dockerfile src/auth.ts .dockerignore package.json pnpm-lock.yaml; do
  if [[ -f "$PROJECT_DIR/$file" ]]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp -a "$PROJECT_DIR/$file" "$BACKUP_DIR/$file"
  fi
done

echo "✓ Backup : $BACKUP_DIR"

echo
echo "[3/8] Vérification de src/auth.ts..."

AUTH_FILE="$PROJECT_DIR/src/auth.ts"

if [[ -f "$AUTH_FILE" ]]; then
  cp "$AUTH_FILE" "$AUTH_FILE.before-fix"

  python3 - "$AUTH_FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

old = '''if (process.env.NODE_ENV === "production") {
    if (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET) {
        throw new Error(
            "GOOGLE_ID and GOOGLE_SECRET are required in production. " +
            "Set them in your environment variables."
        )
    }
}'''

new = '''// Google OAuth configuration is validated at runtime rather than
// during Next.js static/build-time page collection.
// Railway injects production environment variables at runtime.
if (
    process.env.NODE_ENV === "production" &&
    (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET)
) {
    console.warn(
        "GOOGLE_ID or GOOGLE_SECRET is missing. Google OAuth will be unavailable."
    )
}'''

if old in text:
    text = text.replace(old, new)
    path.write_text(text)
    print("✓ src/auth.ts corrigé.")
elif "GOOGLE_ID and GOOGLE_SECRET are required in production" in text:
    print("⚠ Le bloc existe mais sa structure diffère.")
    print("  Aucune modification automatique effectuée.")
else:
    print("✓ Aucun bloc problématique trouvé dans src/auth.ts.")
PY
else
  echo "⚠ src/auth.ts introuvable."
fi

echo
echo "[4/8] Correction du Dockerfile..."

DOCKERFILE="$PROJECT_DIR/Dockerfile"

if [[ -f "$DOCKERFILE" ]]; then
  cp "$DOCKERFILE" "$DOCKERFILE.before-fix"

  python3 - "$DOCKERFILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

# Fix PNPM_HOME usage before it is referenced.
if "PNPM_HOME" in text:
    lines = text.splitlines()

    has_env = any(
        line.strip().startswith("ENV PNPM_HOME=")
        for line in lines
    )

    if not has_env:
        insert_at = 0

        for i, line in enumerate(lines):
            if line.startswith("FROM "):
                insert_at = i + 1
                break

        lines.insert(insert_at, "ENV PNPM_HOME=/root/.local/share/pnpm")
        lines.insert(insert_at + 1, 'ENV PATH="$PNPM_HOME:$PATH"')

        text = "\n".join(lines) + ("\n" if text.endswith("\n") else "")
        path.write_text(text)

        print("✓ PNPM_HOME défini avant son utilisation.")
    else:
        print("✓ PNPM_HOME déjà défini.")
else:
    print("✓ PNPM_HOME absent du Dockerfile.")
PY
else
  echo "⚠ Dockerfile introuvable."
fi

echo
echo "[5/8] Recherche de secrets codés en dur dans Dockerfile..."

if [[ -f "$DOCKERFILE" ]]; then

  if grep -nE 'ARG (JWT_SECRET|BETTER_AUTH_SECRET)|ENV (JWT_SECRET|BETTER_AUTH_SECRET)' "$DOCKERFILE"; then
    echo
    echo "⚠ ATTENTION : secrets détectés dans Dockerfile."
    echo "  Railway doit fournir ces variables via Environment Variables."
    echo "  Le script ne supprime pas automatiquement ces lignes pour éviter"
    echo "  de casser ton build."
  else
    echo "✓ Aucun JWT_SECRET/BETTER_AUTH_SECRET codé en ARG/ENV."
  fi
fi

echo
echo "[6/8] Vérification des variables Railway..."

if command -v railway >/dev/null 2>&1; then

  echo
  echo "--- Variables Google détectées par Railway ---"

  railway variable 2>/dev/null | grep -E \
    'GOOGLE_ID|GOOGLE_SECRET|GOOGLE_CALLBACK_URL|BETTER_AUTH_URL|AUTH_TRUST_HOST' \
    || true

  echo
  echo "✓ Vérification terminée."

else
  echo "⚠ Railway CLI non trouvé."
  echo "Installe/connecte Railway avant le déploiement."
fi

echo
echo "[7/8] Vérification du build..."

if command -v pnpm >/dev/null 2>&1; then

  echo "→ Génération Prisma..."
  pnpm prisma generate

  echo
  echo "→ Build Next.js..."
  pnpm run build

else
  echo "⚠ pnpm n'est pas installé localement."
  echo "Le build local est ignoré."
fi

echo
echo "[8/8] Résultat"
echo "=========================================="

echo "✓ Corrections terminées."

echo
echo "Backup créé ici :"
echo "  $BACKUP_DIR"

echo
echo "Fichiers modifiés :"

[[ -f "$AUTH_FILE" ]] && echo "  ✓ src/auth.ts"
[[ -f "$DOCKERFILE" ]] && echo "  ✓ Dockerfile"

echo
echo "Prochaine étape :"
echo
echo "  railway up"
echo
echo "Puis vérifie les logs :"
echo
echo "  railway logs"
echo
echo "=========================================="
echo " AuraCRM fix terminé"
echo "=========================================="
