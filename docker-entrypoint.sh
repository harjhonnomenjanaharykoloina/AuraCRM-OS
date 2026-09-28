#!/bin/sh
set -e

REQUIRED_VARS="JWT_SECRET BETTER_AUTH_SECRET DATABASE_URL"

for var in $REQUIRED_VARS; do
    eval "value=\$$var"
    if [ -z "$value" ]; then
        echo "ERROR: $var environment variable is not set. Aborting." >&2
        exit 1
    fi
done

echo "Environment validation passed."

# Optional warnings for missing recommended env vars
eval "value=\$BETTER_AUTH_URL"
if [ -z "$value" ]; then
    echo "WARNING: BETTER_AUTH_URL environment variable is not set. OAuth redirect URIs may be incorrect."
fi

eval "value=\$GOOGLE_ID"
if [ -z "$value" ]; then
    echo "WARNING: GOOGLE_ID environment variable is not set. Google Sign-In won't work."
fi

eval "value=\$GOOGLE_SECRET"
if [ -z "$value" ]; then
    echo "WARNING: GOOGLE_SECRET environment variable is not set. Google Sign-In won't work."
fi

eval "value=\$EMAIL_ENCRYPTION_KEY"
if [ -z "$value" ]; then
    echo "WARNING: EMAIL_ENCRYPTION_KEY environment variable is not set. Email account encryption is not configured (required for production)."
fi

echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "ERROR: Database migration failed." >&2
    exit 1
}
echo "Migrations complete."

exec "$@"
