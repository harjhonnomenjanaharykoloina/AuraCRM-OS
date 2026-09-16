#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Aura CRM — Automated Railway Deployment Script (CLI v5 compatible)
# ==============================================================================
# Performs a full Railway deployment:
#   1. Checks/installs Railway CLI
#   2. Authenticates (logs in via browser if needed)
#   3. Links or initializes the Railway project
#   4. Adds a PostgreSQL plugin
#   5. Sets required environment variables
#   6. Ensures a postinstall script for Prisma in package.json
#   7. Deploys with `railway up --detach`
#   8. Auto-detects the Railway domain and sets BETTER_AUTH_URL
#   9. Ensures DATABASE_URL is available on the app service
#  10. Adds SSH keys and applies Prisma migrations via `railway ssh`
#  11. Prints a deployment summary
# ==============================================================================

# ── Color Helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
info_s()  { echo -e "${BLUE}ℹ${NC}  $*" >&2; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
warn_s()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
error()   { echo -e "${RED}✗${NC}  $*"; }
section() { echo; echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"; echo -e "${BOLD}  $1${NC}"; echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}"; }

# Track whether user interaction is needed
NEEDS_USER_ACTION=false
ACTION_ITEMS=()

# Project root and app service name
PROJECT_ROOT="/home/cathenon/Desktop/openCRM"
APP_SERVICE_NAME="auracrm"
cd "$PROJECT_ROOT"

# ── Helper: get current environment name ──────────────────────────────────────
get_env_name() {
    railway status 2>&1 | grep -i "^Environment:" | sed 's/^Environment:[[:space:]]*//' | tr -d ' ' || echo "production"
}

# ── Helper: check if a variable is set ────────────────────────────────────────
var_is_set() {
    local varname="$1"
    local env_name
    env_name=$(get_env_name)
    local output
    output=$(railway variable list -e "$env_name" --kv 2>&1 || true)
    if echo "$output" | grep -q "^${varname}=" 2>/dev/null; then
        return 0
    fi
    return 1
}

# ── Helper: set a variable ────────────────────────────────────────────────────
set_var() {
    local key="$1"
    local value="$2"
    local env_name
    env_name=$(get_env_name)
    railway variable set "${key}=${value}" -e "$env_name" --skip-deploys 2>&1 || true
}

# ── Helper: unset/delete a variable ───────────────────────────────────────────
# Note: `railway variable delete` does NOT support --skip-deploys
unset_var() {
    local varname="$1"
    local env_name
    env_name=$(get_env_name)
    railway variable delete "$varname" -e "$env_name" 2>&1 || true
}

# ── Helper: list current variables ────────────────────────────────────────────
list_vars() {
    local env_name
    env_name=$(get_env_name)
    railway variable list -e "$env_name" 2>&1 || true
}

# ── Helper: wait for deployment to reach a target status ──────────────────────
wait_for_deployment() {
    local service_name="$1"
    local target_status="$2"
    local max_attempts="${3:-60}"
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local status_out
        status_out=$(railway service status --service "$service_name" 2>&1 || true)
        if echo "$status_out" | grep -qi "Status:.*${target_status}"; then
            return 0
        fi
        info_s "Waiting for $service_name to reach $target_status... (attempt $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done
    return 1
}

# ==============================================================================
# STEP 1 — Install Railway CLI
# ==============================================================================
section "STEP 1: Install Railway CLI"

if command -v railway &>/dev/null; then
    RAILWAY_VERSION=$(railway --version 2>/dev/null || echo "unknown")
    success "Railway CLI already installed (version: $RAILWAY_VERSION)"
else
    info "Railway CLI not found. Installing @railway/cli globally via npm..."
    npm install -g @railway/cli 2>&1
    success "Railway CLI installed."
fi

if ! command -v railway &>/dev/null; then
    error "Railway CLI installation failed."
    error "ACTION REQUIRED: Run manually — npm install -g @railway/cli"
    exit 1
fi

# ==============================================================================
# STEP 2 — Authentication
# ==============================================================================
section "STEP 2: Railway Authentication"

if railway whoami &>/dev/null 2>&1; then
    WHOAMI_OUT=$(railway whoami 2>&1)
    success "Authenticated: $WHOAMI_OUT"
else
    warn "Not logged in to Railway."
    warn "ACTION REQUIRED: Railway uses browser-based OAuth authentication."
    info "Attempting 'railway login' (will try to open a browser)..."
    if railway login 2>&1; then
        success "Login successful."
    else
        error "railway login failed."
        warn "If you're in a headless/SSH environment, Railway will print a device code URL to visit."
        ACTION_ITEMS+=("Run 'railway login' in a terminal with browser access, or visit the device code URL.")
        NEEDS_USER_ACTION=true
    fi
fi

# ==============================================================================
# STEP 3 — Link or Initialize Railway Project
# ==============================================================================
section "STEP 3: Link / Initialize Railway Project"

PROJECT_LINKED=false
STATUS_OUT=$(railway status 2>&1 || true)
if echo "$STATUS_OUT" | grep -qi "Project:"; then
    PROJECT_LINKED=true
fi

if [ "$PROJECT_LINKED" = true ]; then
    success "Project is already linked to Railway. Skipping init."
else
    warn "No existing Railway project link found."
    info "Running 'railway init' to create a new project..."
    PROJECT_NAME="AuraCRM"
    if railway init --name "$PROJECT_NAME" --json 2>&1; then
        success "Railway project initialized: $PROJECT_NAME"
    else
        warn "railway init failed. ACTION REQUIRED: Run 'railway link' or 'railway init' manually."
        ACTION_ITEMS+=("Run 'railway init' or 'railway link' to set up the Railway project.")
        NEEDS_USER_ACTION=true
    fi
fi

# ==============================================================================
# STEP 4 — Add PostgreSQL Plugin
# ==============================================================================
section "STEP 4: Add PostgreSQL Plugin"

PG_EXISTS=false
STATUS_OUT=$(railway status 2>&1 || true)
if echo "$STATUS_OUT" | grep -qi "postgres"; then
    PG_EXISTS=true
    success "PostgreSQL plugin already exists in the project."
else
    info "Adding PostgreSQL database..."
    if railway add --database postgres 2>&1; then
        success "PostgreSQL added via 'railway add --database postgres'."
    else
        warn "'railway add --database postgres' failed. Trying older CLI syntax..."
        if railway plugins add postgresql 2>&1; then
            success "PostgreSQL added via 'railway plugins add postgresql'."
        else
            warn "Failed to add PostgreSQL plugin."
            warn "ACTION REQUIRED: Add PostgreSQL via the Railway dashboard."
            ACTION_ITEMS+=("Add PostgreSQL manually via Railway dashboard or 'railway add --database postgres'.")
            NEEDS_USER_ACTION=true
        fi
    fi
fi

# Wait for PostgreSQL to be Online
if [ "$PG_EXISTS" = true ] || railway status 2>&1 | grep -qi "postgres"; then
    info "Waiting for PostgreSQL to be ready..."
    PG_READY=false
    for i in $(seq 1 20); do
        PG_STATUS=$(railway status 2>&1 || true)
        if echo "$PG_STATUS" | grep -qi "Postgres"; then
            if echo "$PG_STATUS" | grep -qiE "Online|Ready|Running"; then
                PG_READY=true
                success "PostgreSQL is ready."
                break
            fi
        fi
        sleep 3
    done
    if [ "$PG_READY" = false ]; then
        warn "PostgreSQL may still be provisioning. Continuing anyway..."
    fi
fi

# ==============================================================================
# STEP 4b — Ensure App Service Exists
# ==============================================================================
section "STEP 4b: Ensure App Service Exists"

SERVICE_EXISTS=false
if railway service list 2>&1 | grep -qi "$APP_SERVICE_NAME"; then
    SERVICE_EXISTS=true
    success "App service '$APP_SERVICE_NAME' already exists."
else
    info "Creating app service '$APP_SERVICE_NAME'..."
    if echo "" | railway add --service "$APP_SERVICE_NAME" --json 2>&1; then
        success "App service '$APP_SERVICE_NAME' created."
    else
        warn "Failed to create app service. ACTION REQUIRED: Create manually."
        ACTION_ITEMS+=("Run 'railway add --service $APP_SERVICE_NAME' to create the app service.")
        NEEDS_USER_ACTION=true
    fi
fi

# Link to the app service
info "Linking to app service '$APP_SERVICE_NAME'..."
railway service link "$APP_SERVICE_NAME" 2>&1 || warn "Could not link service. Using existing link."

# ==============================================================================
# STEP 5 — Set Environment Variables
# ==============================================================================
section "STEP 5: Set Environment Variables"

# Unset obsolete variables
info "Removing obsolete variables (NEXTAUTH_SECRET, NEXTAUTH_URL)..."
unset_var "NEXTAUTH_SECRET"
unset_var "NEXTAUTH_URL"
success "Obsolete variables cleaned up."

# Generate or reuse JWT_SECRET
if var_is_set "JWT_SECRET"; then
    EXISTING_JWT=$(railway variable list -e "$(get_env_name)" --kv 2>/dev/null | grep "^JWT_SECRET=" | sed 's/^JWT_SECRET=//' || true)
    if [ -n "$EXISTING_JWT" ]; then
        JWT_VALUE="$EXISTING_JWT"
        info "Reusing existing JWT_SECRET."
    else
        # JWT_SECRET is sealed/hidden — generate a replacement
        JWT_VALUE=$(openssl rand -base64 32 | tr -d '\n')
        info "JWT_SECRET exists but value is sealed. Generating replacement..."
        set_var "JWT_SECRET" "$JWT_VALUE"
        success "JWT_SECRET regenerated."
    fi
else
    JWT_VALUE=$(openssl rand -base64 32 | tr -d '\n')
    info "Generating new JWT_SECRET..."
    set_var "JWT_SECRET" "$JWT_VALUE"
    success "JWT_SECRET set."
fi

# Set BETTER_AUTH_SECRET = same as JWT_SECRET
if var_is_set "BETTER_AUTH_SECRET"; then
    info "BETTER_AUTH_SECRET is already set. Skipping."
else
    info "Setting BETTER_AUTH_SECRET to match JWT_SECRET..."
    set_var "BETTER_AUTH_SECRET" "$JWT_VALUE"
    success "BETTER_AUTH_SECRET set."
fi

# Set AUTH_TRUST_HOST=true
if var_is_set "AUTH_TRUST_HOST"; then
    info "AUTH_TRUST_HOST is already set. Skipping."
else
    info "Setting AUTH_TRUST_HOST=true..."
    set_var "AUTH_TRUST_HOST" "true"
    success "AUTH_TRUST_HOST set."
fi

info "BETTER_AUTH_URL will be set after domain detection in Step 8."

# ==============================================================================
# STEP 6 — Ensure postinstall Script in package.json
# ==============================================================================
section "STEP 6: Ensure postinstall Script"

PACKAGE_JSON="$PROJECT_ROOT/package.json"

if [ ! -f "$PACKAGE_JSON" ]; then
    error "package.json not found."
    exit 1
fi

if node -e "
const pkg = require('./package.json');
const s = pkg.scripts && pkg.scripts.postinstall;
process.exit(s && s.includes('prisma generate') ? 0 : 1);
" 2>/dev/null; then
    success "postinstall already includes 'prisma generate'. Skipping."
else
    info "Adding postinstall: prisma generate to package.json..."
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
if (!pkg.scripts) pkg.scripts = {};
if (pkg.scripts.postinstall) {
    pkg.scripts.postinstall = pkg.scripts.postinstall + ' && prisma generate';
} else {
    pkg.scripts.postinstall = 'prisma generate';
}
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('  postinstall script updated in package.json');
" 2>&1
    success "postinstall script added."
fi

# ==============================================================================
# STEP 7 — Deploy
# ==============================================================================
section "STEP 7: Deploy to Railway"

info "Deploying to service '$APP_SERVICE_NAME'..."
if railway up --detach --yes 2>&1; then
    success "Deployment initiated."
    info "Build is in progress. This may take several minutes."
else
    error "Deployment command failed."
    warn "ACTION REQUIRED: Check Railway dashboard for build errors."
    ACTION_ITEMS+=("Investigate deployment failure on the Railway dashboard.")
    NEEDS_USER_ACTION=true
fi

# Wait for deployment to reach SUCCESS
info "Waiting for deployment to complete..."
DEPLOY_SUCCESS=false
for i in $(seq 1 60); do
    STATUS_OUT=$(railway service status --service "$APP_SERVICE_NAME" 2>&1 || true)
    if echo "$STATUS_OUT" | grep -qi "Status:.*SUCCESS"; then
        DEPLOY_SUCCESS=true
        success "Deployment completed successfully."
        break
    fi
    if echo "$STATUS_OUT" | grep -qiE "Status:.*FAIL|Status:.*ERROR"; then
        warn "Deployment failed. Check logs for details."
        break
    fi
    info_s "Waiting for deployment... (attempt $i/60)"
    sleep 5
done
if [ "$DEPLOY_SUCCESS" = false ]; then
    warn "Deployment did not reach SUCCESS status within timeout."
    warn "Continuing with domain detection — service may still be starting."
fi

# ==============================================================================
# STEP 8 — Retrieve Domain & Set BETTER_AUTH_URL
# ==============================================================================
section "STEP 8: Auto-Detect Domain & Set BETTER_AUTH_URL"

detect_domain() {
    local attempts=0
    local max_attempts=20
    local domain=""

    while [ $attempts -lt $max_attempts ]; do
        attempts=$((attempts + 1))
        info_s "Checking for domain (attempt $attempts/$max_attempts)..."

        # Strategy 1: Use `railway domain` (targets linked service)
        domain=$(railway domain 2>&1 | grep -oiE 'https://[a-z0-9._-]+\.up\.railway\.app' | head -1 || true)

        # Strategy 2: Parse `railway status` for a .up.railway.app URL
        if [ -z "$domain" ]; then
            domain=$(railway status 2>&1 | grep -oiE 'https://[a-z0-9._-]+\.up\.railway\.app' | head -1 || true)
        fi

        if [ -n "$domain" ]; then
            echo "$domain"
            return 0
        fi

        warn_s "Domain not yet available. Waiting 5 seconds..."
        sleep 5
    done

    return 1
}

RAILWAY_DOMAIN=$(detect_domain)

if [ -n "$RAILWAY_DOMAIN" ] && [ -n "$(echo "$RAILWAY_DOMAIN" | tr -d '[:space:]')" ]; then
    # Clean domain: extract just the URL
    BETTER_AUTH_URL_VAL=$(echo "$RAILWAY_DOMAIN" | grep -oiE 'https://[a-z0-9._-]+\.up\.railway\.app' | head -1)

    if [ -n "$BETTER_AUTH_URL_VAL" ]; then
        info "Setting BETTER_AUTH_URL=$BETTER_AUTH_URL_VAL..."
        set_var "BETTER_AUTH_URL" "$BETTER_AUTH_URL_VAL"
        success "BETTER_AUTH_URL set."

        info "Setting NEXTAUTH_URL=$BETTER_AUTH_URL_VAL (backward compatibility)..."
        set_var "NEXTAUTH_URL" "$BETTER_AUTH_URL_VAL"
        success "NEXTAUTH_URL set."

        # Trigger redeploy to apply new variables
        info "Triggering redeploy to apply new variables..."
        railway up --detach --yes 2>&1 || warn "Redeploy trigger failed. Variables will apply on next deploy."
        success "Domain: $BETTER_AUTH_URL_VAL"
    else
        warn "Domain detection returned unexpected value. ACTION REQUIRED: Set manually."
        ACTION_ITEMS+=("Set BETTER_AUTH_URL and NEXTAUTH_URL manually after deployment.")
        NEEDS_USER_ACTION=true
    fi
else
    warn "Could not detect domain after multiple attempts."
    warn "ACTION REQUIRED: Find your Railway domain in the dashboard and run:"
    warn "  railway variable set BETTER_AUTH_URL=<your-domain-url>"
    ACTION_ITEMS+=("Manually set BETTER_AUTH_URL and NEXTAUTH_URL after deployment completes.")
    NEEDS_USER_ACTION=true
fi

# Wait for the redeploy to complete
if [ "$DEPLOY_SUCCESS" = true ]; then
    info "Waiting for redeploy to complete..."
    for i in $(seq 1 60); do
        STATUS_OUT=$(railway service status --service "$APP_SERVICE_NAME" 2>&1 || true)
        if echo "$STATUS_OUT" | grep -qi "Status:.*SUCCESS"; then
            success "Redeploy completed."
            break
        fi
        sleep 5
    done
fi

# ==============================================================================
# STEP 9 — Ensure DATABASE_URL on App Service & SSH Keys
# ==============================================================================
section "STEP 9: Ensure DATABASE_URL & SSH Keys"

# Ensure DATABASE_URL is available on the app service (may need manual propagation)
info "Checking DATABASE_URL on app service..."
if ! var_is_set "DATABASE_URL"; then
    info "DATABASE_URL not found on app service. Propagating from Postgres service..."
    # Find the Postgres service
    PG_SERVICE=$(railway service list 2>&1 | grep -i "postgres" | head -1 | awk '{print $1}' || true)
    if [ -n "$PG_SERVICE" ]; then
        PG_DB_URL=$(railway variable list --service "$PG_SERVICE" --kv 2>/dev/null | grep "^DATABASE_URL=" | sed 's/^DATABASE_URL=//' || true)
        if [ -n "$PG_DB_URL" ]; then
            set_var "DATABASE_URL" "$PG_DB_URL"
            success "DATABASE_URL propagated from $PG_SERVICE to app service."
            # Redeploy to pick up the new variable
            info "Triggering redeploy to apply DATABASE_URL..."
            railway up --detach --yes 2>&1 || warn "Redeploy failed."
            sleep 10
            # Wait for deployment
            for i in $(seq 1 30); do
                STATUS_OUT=$(railway service status --service "$APP_SERVICE_NAME" 2>&1 || true)
                if echo "$STATUS_OUT" | grep -qi "Status:.*SUCCESS"; then
                    success "Redeploy completed."
                    break
                fi
                sleep 5
            done
        else
            warn "Could not retrieve DATABASE_URL from $PG_SERVICE."
            ACTION_ITEMS+=("Manually set DATABASE_URL on the app service.")
            NEEDS_USER_ACTION=true
        fi
    else
        warn "No PostgreSQL service found to extract DATABASE_URL from."
        ACTION_ITEMS+=("Manually set DATABASE_URL on the app service.")
        NEEDS_USER_ACTION=true
    fi
else
    success "DATABASE_URL already set on app service."
fi

# Ensure SSH keys are registered
info "Checking SSH key registration..."
SSH_KEYS_OUT=$(railway ssh keys list 2>&1 || true)
if echo "$SSH_KEYS_OUT" | grep -qi "No SSH keys registered\|No registered SSH"; then
    warn "No SSH keys found. Registering SSH key..."
    if railway ssh keys add 2>&1; then
        success "SSH key registered."
    else
        warn "SSH key registration failed. ACTION REQUIRED: Run 'railway ssh keys add' manually."
        ACTION_ITEMS+=("Register an SSH key with 'railway ssh keys add' for migrations.")
        NEEDS_USER_ACTION=true
    fi
else
    success "SSH key(s) already registered."
fi

# ==============================================================================
# STEP 10 — Apply Prisma Migrations
# ==============================================================================
section "STEP 10: Apply Prisma Migrations"

info "Running 'railway ssh \"npx prisma migrate deploy\"'..."
MIGRATE_SUCCESS=false
for attempt in 1 2 3; do
    info "Migration attempt $attempt/3..."
    if railway ssh "npx prisma migrate deploy" 2>&1; then
        success "Migrations applied successfully."
        MIGRATE_SUCCESS=true
        break
    else
        warn "Migration attempt $attempt failed."
        # If DATABASE_URL is not in the SSH session, try passing it explicitly
        DB_URL_VAL=$(railway variable list --service "$APP_SERVICE_NAME" --kv 2>/dev/null | grep "^DATABASE_URL=" | sed 's/^DATABASE_URL=//' || true)
        if [ -n "$DB_URL_VAL" ]; then
            warn "Retrying with explicit DATABASE_URL..."
            if railway ssh "DATABASE_URL=\"${DB_URL_VAL}\" npx prisma migrate deploy" 2>&1; then
                success "Migrations applied successfully (with explicit DATABASE_URL)."
                MIGRATE_SUCCESS=true
                break
            fi
        fi
        if [ $attempt -lt 3 ]; then
            info "Waiting 10 seconds before retry..."
            sleep 10
        fi
    fi
done

if [ "$MIGRATE_SUCCESS" = false ]; then
    warn "Could not apply migrations via railway ssh."
    warn "ACTION REQUIRED: Ensure the service is running and SSH keys are registered, then run:"
    warn "  railway ssh \"npx prisma migrate deploy\""
    warn "Or with explicit DATABASE_URL:"
    warn "  railway ssh \"DATABASE_URL='<your-db-url>' npx prisma migrate deploy\""
    ACTION_ITEMS+=("Run 'railway ssh \"npx prisma migrate deploy\"' after verifying the service is fully up.")
    NEEDS_USER_ACTION=true
fi

# ==============================================================================
# STEP 11 — Summary
# ==============================================================================
section "DEPLOYMENT SUMMARY"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚂  Aura CRM — Railway Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

info "Railway Status:"
railway status 2>&1 || true
echo

info "Environment Variables:"
list_vars
echo

if [ -n "$BETTER_AUTH_URL_VAL" ]; then
    success "Deployed Domain: $BETTER_AUTH_URL_VAL"
fi

if [ -n "$JWT_VALUE" ]; then
    echo
    info "JWT_SECRET / BETTER_AUTH_SECRET (generated this run): $JWT_VALUE"
fi

if [ "$NEEDS_USER_ACTION" = true ]; then
    echo
    warn "ACTION ITEMS REQUIRED:"
    for item in "${ACTION_ITEMS[@]}"; do
        echo "  - $item"
    done
else
    success "All steps completed automatically!"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment process completed."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
