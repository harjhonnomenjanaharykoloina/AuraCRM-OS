import { NextResponse } from "next/server";
import { RateLimiter } from "@/lib/rate-limit";
import type { RateLimitResult } from "@/lib/rate-limit";

export type DataRateLimiter = {
    consume(key: string): RateLimitResult | Promise<RateLimitResult>;
};

export const dataRateLimiter: DataRateLimiter = new RateLimiter({
    windowSeconds: 60,
    maxRequests: 60,
});

export const uploadRateLimiter: DataRateLimiter = new RateLimiter({
    windowSeconds: 60,
    maxRequests: 20,
});

export async function checkRateLimit(
    limiter: DataRateLimiter,
    key: string,
): Promise<RateLimitResult> {
    return await limiter.consume(key);
}

export function tooManyRequestsResponse(resetAt: Date): NextResponse {
    const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const retryAfter = Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    res.headers.set("Retry-After", String(retryAfter));
    return res;
}
