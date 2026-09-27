#!/usr/bin/env bash

set -u

PROJECT="$(pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="button-fix-backup-$TIMESTAMP"

echo "=============================================="
echo "🔧 SAFE BUTTON / TYPESCRIPT FIX"
echo "=============================================="
echo "📁 Projet : $PROJECT"
echo

# ------------------------------------------------
# 1. Vérifications
# ------------------------------------------------

if [ ! -f package.json ]; then
    echo "❌ package.json introuvable."
    exit 1
fi

if [ ! -d src ]; then
    echo "❌ dossier src introuvable."
    exit 1
fi

# ------------------------------------------------
# 2. Backup EXTERNE au projet
# ------------------------------------------------

BACKUP_PARENT="../openCRM-backups"
mkdir -p "$BACKUP_PARENT"

BACKUP="$BACKUP_PARENT/$BACKUP"

echo "💾 Création du backup : $BACKUP"

mkdir -p "$BACKUP"

cp -a src "$BACKUP/"
cp -a package.json "$BACKUP/" 2>/dev/null || true
cp -a tsconfig.json "$BACKUP/" 2>/dev/null || true
cp -a eslint.config.* "$BACKUP/" 2>/dev/null || true

echo "✅ Backup terminé."
echo

# ------------------------------------------------
# 3. Nettoyage des anciens backups accidentels
# ------------------------------------------------

echo "🧹 Recherche des anciens backups dans le projet..."

find . -maxdepth 1 -type d \
    -name 'button-fix-backup-*' \
    -print

echo

# ------------------------------------------------
# 4. Vérification des fichiers React
# ------------------------------------------------

echo "🔎 Recherche des handlers..."

grep -RInE \
    --include='*.tsx' \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    --exclude-dir=build \
    --exclude-dir=coverage \
    'onClick=\{\(\)\s*=>\s*\{\s*\}\s*\}' \
    src 2>/dev/null || true

echo
echo "🔎 Recherche des boutons disabled en permanence..."

grep -RInE \
    --include='*.tsx' \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    --exclude-dir=build \
    'disabled=\{?(true|"true"|'\"'\"'true'\"'\"')\}?' \
    src 2>/dev/null || true

echo
echo "🔎 Recherche des pointer-events-none..."

grep -RIn \
    --include='*.tsx' \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    --exclude-dir=build \
    'pointer-events-none' \
    src 2>/dev/null || true

echo
echo "🔎 Recherche aria-disabled..."

grep -RIn \
    --include='*.tsx' \
    --include='*.ts' \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    --exclude-dir=build \
    'aria-disabled' \
    src 2>/dev/null || true

# ------------------------------------------------
# 5. TypeScript
# ------------------------------------------------

echo
echo "=============================================="
echo "🟦 TypeScript"
echo "=============================================="

if command -v pnpm >/dev/null 2>&1; then
    pnpm exec tsc --noEmit
elif command -v npm >/dev/null 2>&1; then
    npx tsc --noEmit
else
    echo "⚠️ npm/pnpm introuvable."
fi

TS_EXIT=$?

if [ "$TS_EXIT" -eq 0 ]; then
    echo "✅ TypeScript OK"
else
    echo "❌ TypeScript contient des erreurs."
fi

# ------------------------------------------------
# 6. ESLint UNIQUEMENT SUR SRC
# ------------------------------------------------

echo
echo "=============================================="
echo "🟨 ESLint"
echo "=============================================="

if command -v pnpm >/dev/null 2>&1; then

    pnpm exec eslint src \
        --ignore-pattern '.next/**' \
        --ignore-pattern 'node_modules/**' \
        --ignore-pattern 'dist/**' \
        --ignore-pattern 'build/**' \
        --ignore-pattern 'coverage/**' \
        --ignore-pattern 'button-fix-backup-*/**'

    ESLINT_EXIT=$?

elif command -v npm >/dev/null 2>&1; then

    npx eslint src \
        --ignore-pattern '.next/**' \
        --ignore-pattern 'node_modules/**' \
        --ignore-pattern 'dist/**' \
        --ignore-pattern 'build/**' \
        --ignore-pattern 'coverage/**' \
        --ignore-pattern 'button-fix-backup-*/**'

    ESLINT_EXIT=$?

else
    echo "⚠️ npm/pnpm introuvable."
    ESLINT_EXIT=1
fi

# ------------------------------------------------
# 7. Vérification des fichiers réellement modifiés
# ------------------------------------------------

echo
echo "=============================================="
echo "📋 Fichiers du projet"
echo "=============================================="

find src \
    -type f \
    \( -name '*.tsx' -o -name '*.ts' \) \
    -print | wc -l | \
    xargs echo "Fichiers TypeScript/TSX :"

echo
echo "=============================================="
echo "📊 RÉSULTAT"
echo "=============================================="

if [ "$TS_EXIT" -eq 0 ]; then
    echo "✅ TypeScript : OK"
else
    echo "❌ TypeScript : ERREURS"
fi

if [ "$ESLINT_EXIT" -eq 0 ]; then
    echo "✅ ESLint : OK"
else
    echo "⚠️ ESLint : problèmes détectés"
fi

echo
echo "💾 Backup : $BACKUP"
echo
echo "⚠️ Ce script ne modifie pas automatiquement la logique"
echo "   métier des boutons."
echo
echo "=============================================="
