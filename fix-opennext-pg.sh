#!/usr/bin/env bash
set -e

echo "=========================================="
echo " AuraCRM - Fix OpenNext + pg-cloudflare"
echo "=========================================="

echo
echo "[1/7] Vérification du projet..."
pwd

if [ ! -f package.json ]; then
  echo "ERREUR: package.json introuvable."
  exit 1
fi

echo
echo "[2/7] Vérification de pg-cloudflare..."

if ! pnpm list pg-cloudflare --depth 10 >/dev/null 2>&1; then
  echo "pg-cloudflare absent ou non résolu."
fi

echo
echo "[3/7] Installation explicite de pg-cloudflare..."

pnpm add pg-cloudflare@1.4.0

echo
echo "[4/7] Vérification de la résolution..."

node - <<'NODE'
const fs = require("fs");

const paths = [
  "node_modules/pg-cloudflare/package.json",
  "node_modules/.pnpm/pg-cloudflare@1.4.0/node_modules/pg-cloudflare/package.json"
];

let found = false;

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log("OK:", p);

    const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
    console.log("version:", pkg.version);
    console.log("main:", pkg.main);
    console.log("exports:", JSON.stringify(pkg.exports, null, 2));

    found = true;
  }
}

if (!found) {
  console.error("ERREUR: pg-cloudflare n'est toujours pas trouvé.");
  process.exit(1);
}
NODE

echo
echo "[5/7] Nettoyage des anciens artefacts OpenNext..."

rm -rf .open-next

echo "Ancien .open-next supprimé."

echo
echo "[6/7] Nettoyage du store/build pnpm..."

pnpm install --force

echo
echo "[7/7] Lancement du build OpenNext..."

echo "[pre-build] Copying wasm.mjs for ESM resolution..."
if [ -f .open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3/node_modules/.prisma/client/wasm.js ] 2>/dev/null; then
  cp .open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3/node_modules/.prisma/client/wasm.js .open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3/node_modules/.prisma/client/wasm.mjs
  echo "✓ wasm.mjs created in build output"
elif [ -f .open-next/server-functions/default/node_modules/.prisma/client/wasm.js ] 2>/dev/null; then
  cp .open-next/server-functions/default/node_modules/.prisma/client/wasm.js .open-next/server-functions/default/node_modules/.prisma/client/wasm.mjs
  echo "✓ wasm.mjs created in build output (alt path)"
else
  echo "⚠ could not find wasm.js in build output, will search after build..."
fi

pnpm run build:worker

# Ensure wasm.mjs exists in build output for ESM resolution
echo "[post-build] Ensuring wasm.mjs in build output..."
WASM_SRC=".open-next/server-functions/default/node_modules/.prisma/client/wasm.js"
WASM_DEST=".open-next/server-functions/default/node_modules/.prisma/client/wasm.mjs"
WASM_DEST2=".open-next/server-functions/default/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_magicast@0.3.5_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma/client/wasm.mjs"

if [ -f "$WASM_SRC" ] && [ ! -f "$WASM_DEST" ]; then
  cp "$WASM_SRC" "$WASM_DEST"
  echo "✓ wasm.mjs created at $WASM_DEST"
fi

if [ -f "$WASM_SRC" ] && [ ! -f "$WASM_DEST2" ]; then
  cp "$WASM_SRC" "$WASM_DEST2"
  echo "✓ wasm.mjs created at $WASM_DEST2"
fi


echo
echo "=========================================="
echo " BUILD TERMINE"
echo "=========================================="

if [ -f ".open-next/worker.js" ]; then
  echo
  echo "SUCCESS: .open-next/worker.js existe."
  ls -lh .open-next/worker.js
else
  echo
  echo "ERREUR: .open-next/worker.js n'a pas été généré."
  exit 1
fi
