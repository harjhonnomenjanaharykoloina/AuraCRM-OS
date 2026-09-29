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

# Bundle the worker into a standalone CJS file that runs with node.
# This avoids needing tsx (a devDependency) at runtime.
RUN pnpm run build:worker

FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

RUN addgroup -g 1001 -S nextjs && \
    adduser -u 1001 -S -G nextjs -s /bin/sh nextjs

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@9.15.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --prod --ignore-scripts

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

COPY --from=builder /app/dist/worker.js ./dist/worker.js

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R nextjs:nextjs /app

USER nextjs

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/worker.js"]
