#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# scan-secrets.sh — Detect hardcoded secrets in source files
#
# Patterns checked:
#   - Hardcoded JWT_SECRET / BETTER_AUTH_SECRET values
#   - AWS access key IDs (AKIA...)
#   - Private keys (BEGIN ... PRIVATE KEY)
#   - Generic API keys (sk-...)
#   - GitHub tokens (ghp_..., github_pat_...)
#
# Excludes: node_modules, .git, .env*, *.lock, build artifacts
# ==============================================================================

echo "🔍 Scanning for hardcoded secrets..."

RESULTS=$(mktemp)
trap 'rm -f "$RESULTS"' EXIT

# Only scan source/config files (skip docs, markdown, etc.)
INCLUDES=(
  --include='*.ts'
  --include='*.tsx'
  --include='*.js'
  --include='*.jsx'
  --include='*.sh'
  --include='*.json'
  --include='*.yaml'
  --include='*.yml'
)

# Directories and files to exclude from scanning
EXCLUDES=(
  --exclude-dir=node_modules
  --exclude-dir=.git
  --exclude-dir=.next
  --exclude-dir=out
  --exclude-dir=.open-next
  --exclude-dir=.wrangler
  --exclude-dir=coverage
  --exclude=.env
  --exclude='.env.*'
  --exclude=scan-secrets.sh
  --exclude=pnpm-lock.yaml
  --exclude=package-lock.json
  --exclude='*.lock'
)

GREP_OPTS=("${INCLUDES[@]}" "${EXCLUDES[@]}" -rnI)

# 1. AWS access key IDs (AKIA...)
grep "${GREP_OPTS[@]}" -E 'AKIA[0-9A-Z]{16}' . >> "$RESULTS" 2>/dev/null || true

# 2. Private keys (BEGIN ... PRIVATE KEY)
grep "${GREP_OPTS[@]}" -E '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----' . >> "$RESULTS" 2>/dev/null || true

# 3. GitHub PAT (classic): ghp_...
grep "${GREP_OPTS[@]}" -E 'ghp_[A-Za-z0-9]{36}' . >> "$RESULTS" 2>/dev/null || true

# 4. GitHub PAT (fine-grained): github_pat_...
grep "${GREP_OPTS[@]}" -E 'github_pat_[A-Za-z0-9_]{22,}' . >> "$RESULTS" 2>/dev/null || true

# 5. Generic API keys (sk-...)
grep "${GREP_OPTS[@]}" -E 'sk-[A-Za-z0-9-]{20,}' . >> "$RESULTS" 2>/dev/null || true

# 6. Hardcoded JWT_SECRET / BETTER_AUTH_SECRET values
#    Match assignments with a substantial value (8+ chars after =),
#    excluding env references (process.env, ${...})
grep "${GREP_OPTS[@]}" \
  -E '(JWT_SECRET|BETTER_AUTH_SECRET)[[:space:]]*=[[:space:]]*[^$[:space:]]{8,}' \
  . 2>/dev/null \
  | grep -v 'process\.env' \
  | grep -v '\${' \
  | grep -v 'BETTER_AUTH_URL' \
  >> "$RESULTS" 2>/dev/null || true

if [ -s "$RESULTS" ]; then
  echo ""
  echo "❌ Potential secrets detected:"
  echo "--------------------------------------"
  cat "$RESULTS"
  echo "--------------------------------------"
  echo ""
  echo "Remove hardcoded secrets and use environment variables instead."
  exit 1
fi

echo "✓ No hardcoded secrets found."
