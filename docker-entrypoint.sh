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

echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "ERROR: Database migration failed." >&2
    exit 1
}
echo "Migrations complete."

exec "$@"
