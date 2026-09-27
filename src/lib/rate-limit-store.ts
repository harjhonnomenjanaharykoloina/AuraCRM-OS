import { RateLimiter } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/lib/rate-limit";
import { RedisRateLimiter } from "@/lib/rate-limit-redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

export const authRateLimiter: {
    consume(key: string): RateLimitResult | Promise<RateLimitResult>;
} = REDIS_URL && REDIS_TOKEN
    ? new RedisRateLimiter({
        redisUrl: REDIS_URL,
        redisToken: REDIS_TOKEN,
        windowSeconds: 60,
        maxRequests: 20,
      })
    : new RateLimiter({ windowSeconds: 60, maxRequests: 20 });

export function getClientIp(req: Request): string | null {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0].trim();
        if (first) return first;
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
        const ip = realIp.trim();
        if (ip) return ip;
    }

    return null;
}

export { RateLimiter };
export type { RateLimitResult };
