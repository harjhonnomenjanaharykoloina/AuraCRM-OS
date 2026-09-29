FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    PRISMA_ENABLE_DOWNLOADS="true" \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY patches ./patches

RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate

RUN pnpm run build:worker

# Build-time secrets are passed as build args, never baked into the final image.
# In production, supply real values via --build-arg JWT_SECRET=... --build-arg BETTER_AUTH_SECRET=...
ARG JWT_SECRET="build-time-not-valid-for-production"
ARG BETTER_AUTH_SECRET="build-time-not-valid-for-production"
ARG GOOGLE_ID=""
ARG GOOGLE_SECRET=""
ARG BETTER_AUTH_URL=""
ARG GOOGLE_CALLBACK_URL=""
RUN JWT_SECRET=${JWT_SECRET} BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} GOOGLE_ID=${GOOGLE_ID} GOOGLE_SECRET=${GOOGLE_SECRET} BETTER_AUTH_URL=${BETTER_AUTH_URL} GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL} pnpm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

# Create a non-root user for the application process
RUN addgroup -g 1001 -S nextjs && \
    adduser -u 1001 -S -G nextjs -s /bin/sh nextjs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@9.15.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

RUN pnpm install --prod --ignore-scripts

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY --from=builder /app/dist/worker.js ./dist/worker.js

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set ownership of all app files to the non-root user
RUN chown -R nextjs:nextjs /app

USER nextjs

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
