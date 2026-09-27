import type { Redis } from "@upstash/redis";

let redisInstance: Redis | null | undefined;

/**
 * Lazy-initializes and returns the Upstash Redis client.
 * Returns `null` when Redis env vars are not configured,
 * allowing cache helpers to gracefully degrade to no-op.
 */
export function getRedis(): Redis | null {
    if (redisInstance !== undefined) return redisInstance;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_TOKEN;

    if (!url || !token) {
        redisInstance = null;
        return null;
    }

    try {
        // Dynamic require mirrors the lazy-loading pattern in rate-limit-redis.ts
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
        redisInstance = new Redis({ url, token });
    } catch {
        redisInstance = null;
    }

    return redisInstance;
}

/**
 * Tries the cache first; on miss, calls `fetcher`, stores the
 * result, and returns it. When Redis is unavailable, simply
 * delegates to `fetcher` with no caching.
 */
export async function getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T | null>
): Promise<T | null> {
    const redis = getRedis();
    if (!redis) {
        return fetcher();
    }

    const cached = await redis.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
        await redis.set(key, fresh, { ex: ttlSeconds });
    }
    return fresh;
}

/**
 * Deletes all keys matching the given pattern.
 * No-op when Redis is unavailable.
 */
export async function invalidatePattern(pattern: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    let cursor: string = "0";
    do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: pattern });
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        cursor = nextCursor;
    } while (cursor !== "0");
}

/**
 * Atomically increments `key` by `value` (default 1).
 * Returns the new value. When Redis is unavailable, returns 0.
 */
export async function increment(key: string, value = 1): Promise<number> {
    const redis = getRedis();
    if (!redis) return 0;

    return redis.incrby(key, value);
}

/**
 * Pre-built cache key factories for common permission and sharing-rule use cases.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CacheKeys {
    const PREFIX = "ocrm";

    export function userPermissionSets(userId: number): string {
        return `${PREFIX}:perm:user:${userId}`;
    }

    export function userContext(userId: number, organizationId: number | string): string {
        return `${PREFIX}:user:ctx:${userId}:${organizationId}`;
    }

    export function userObjectAccess(userId: number, objectApiName: string): string {
        return `${PREFIX}:perm:obj:${userId}:${objectApiName}`;
    }

    export function userAccessContext(userId: number, organizationId: number): string {
        return `${PREFIX}:perm:ctx:${userId}:${organizationId}`;
    }

    export function sharingRuleRecomputeLock(objectDefId: number): string {
        return `${PREFIX}:sharing:lock:${objectDefId}`;
    }
}
