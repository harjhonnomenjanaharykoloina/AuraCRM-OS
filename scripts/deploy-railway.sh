#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Aura CRM — Railway Deployment Helper
# ==============================================================================
# This script is the entrypoint for Railway services. It:
#   1. Validates all required environment variables are set
#   2. Runs `prisma migrate deploy` before startup
#   3. Starts the web server (or background worker with --worker flag)
#
# Usage:
#   ./scripts/deploy-railway.sh              # Starts the Next.js web server
#   ./scripts/deploy-railway.sh --worker     # Starts the background job worker
# ==============================================================================

# ── Color Helpers ───────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*"; }

# ── Parse Flags ─────────────────────────────────────────────────────────────────
MODE="web"
for arg in "$@"; do
  case "$arg" in
    --worker)
      MODE="worker"
      ;;
    --help|-h)
      echo "Usage: deploy-railway.sh [--worker]"
      echo "  (no flag)  Start the Next.js web server"
      echo "  --worker   Start the background job worker"
      exit 0
      ;;
    *)
      error "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ── Validate Required Environment Variables ───────────────────────────────────
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "BETTER_AUTH_SECRET" "BETTER_AUTH_URL")

info "Validating environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
  # Use indirect expansion to get the variable value
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    error "Required environment variable $var is not set."
    error "ACTION REQUIRED: Set $var in the Railway dashboard or .env file."
    exit 1
  fi
done
success "All required environment variables are set."

# ── Run Database Migrations ───────────────────────────────────────────────────
info "Running Prisma migrations (prisma migrate deploy)..."
if ! pnpm prisma migrate deploy; then
  error "Database migration failed. Aborting startup."
  exit 1
fi
success "Database migrations complete."

# ── Start the Appropriate Service ──────────────────────────────────────────────
if [ "$MODE" = "worker" ]; then
  info "Starting background job worker..."
  info "Command: pnpm run jobs:worker"
  exec pnpm run jobs:worker
else
  info "Starting Next.js web server..."
  info "Command: pnpm start"
  exec pnpm start
fi
