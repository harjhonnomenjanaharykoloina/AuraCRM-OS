import type { Redis } from "@upstash/redis";
import type { RateLimitResult } from "@/lib/rate-limit";

export interface RedisRateLimiterConfig {
    redisUrl: string;
    redisToken: string;
    windowSeconds: number;
    maxRequests: number;
}

export class RedisRateLimiter {
    private readonly redisUrl: string;
    private readonly redisToken: string;
    private readonly windowSeconds: number;
    private readonly maxRequests: number;
    private clientPromise: Promise<Redis> | null = null;

    constructor(config: RedisRateLimiterConfig) {
        this.redisUrl = config.redisUrl;
        this.redisToken = config.redisToken;
        this.windowSeconds = config.windowSeconds;
        this.maxRequests = config.maxRequests;
    }

    private async getClient(): Promise<Redis> {
        if (!this.clientPromise) {
            this.clientPromise = (async () => {
                const { Redis } = await import("@upstash/redis");
                return new Redis({
                    url: this.redisUrl,
                    token: this.redisToken,
                });
            })();
        }
        return this.clientPromise;
    }

    async consume(key: string): Promise<RateLimitResult> {
        const redis = await this.getClient();
        const now = Date.now();
        const windowMs = this.windowSeconds * 1000;
        const cutoff = now - windowMs;
        const redisKey = `rate_limit:auth:${key}`;
        const member = `${now}-${Math.random().toString(36).slice(2)}`;

        const pipeline = redis
            .multi()
            .zremrangebyscore(redisKey, 0, cutoff)
            .zcard(redisKey)
            .zadd(redisKey, { score: now, member })
            .expire(redisKey, this.windowSeconds)
            .zrange(redisKey, 0, 0, { withScores: true });

        const results = (await pipeline.exec()) as unknown as [
            number,
            number,
            number | null,
            0 | 1,
            unknown,
        ];

        const count = results[1];
        const earliestScore = parseEarliestScore(results[4], now);
        const resetAt = new Date(earliestScore + windowMs);

        if (count >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt,
            };
        }

        return {
            allowed: true,
            remaining: this.maxRequests - count - 1,
            resetAt,
        };
    }
}

function parseEarliestScore(entries: unknown, fallback: number): number {
    if (!Array.isArray(entries) || entries.length === 0) {
        return fallback;
    }
    const first = entries[0];
    if (first != null && typeof first === "object") {
        const score = (first as { score?: unknown }).score;
        const numeric = Number(score);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    if (Array.isArray(first)) {
        const numeric = Number(first[1]);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }
    const numeric = Number(entries[1]);
    return Number.isFinite(numeric) ? numeric : fallback;
}
