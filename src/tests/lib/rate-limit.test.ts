import { describe, expect, it } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/rate-limit-store";

describe("RateLimiter", () => {
    it("allows requests up to the configured limit", () => {
        const time = 1_000_000;
        const limiter = new RateLimiter({
            windowSeconds: 60,
            maxRequests: 3,
            now: () => time,
        });

        const first = limiter.consume("a");
        expect(first.allowed).toBe(true);
        expect(first.remaining).toBe(2);

        const second = limiter.consume("a");
        expect(second.allowed).toBe(true);
        expect(second.remaining).toBe(1);

        const third = limiter.consume("a");
        expect(third.allowed).toBe(true);
        expect(third.remaining).toBe(0);
    });

    it("blocks requests over the configured limit", () => {
        const time = 1_000_000;
        const limiter = new RateLimiter({
            windowSeconds: 60,
            maxRequests: 3,
            now: () => time,
        });

        for (let i = 0; i < 3; i++) {
            expect(limiter.consume("a").allowed).toBe(true);
        }

        const over = limiter.consume("a");
        expect(over.allowed).toBe(false);
        expect(over.remaining).toBe(0);
    });

    it("resets the bucket after the window elapses", () => {
        const start = 1_000_000;
        let time = start;
        const limiter = new RateLimiter({
            windowSeconds: 2,
            maxRequests: 2,
            now: () => time,
        });

        expect(limiter.consume("a").allowed).toBe(true);
        expect(limiter.consume("a").allowed).toBe(true);
        expect(limiter.consume("a").allowed).toBe(false);

        time = start + 2_001;

        const after = limiter.consume("a");
        expect(after.allowed).toBe(true);
        expect(after.remaining).toBe(1);
    });

    it("keeps separate buckets per key", () => {
        const time = 1_000_000;
        const limiter = new RateLimiter({
            windowSeconds: 60,
            maxRequests: 1,
            now: () => time,
        });

        expect(limiter.consume("a").allowed).toBe(true);
        expect(limiter.consume("b").allowed).toBe(true);

        expect(limiter.consume("a").allowed).toBe(false);
        expect(limiter.consume("b").allowed).toBe(false);
    });

    it("reports a resetAt that advances with the window", () => {
        const time = 1_000_000;
        const limiter = new RateLimiter({
            windowSeconds: 60,
            maxRequests: 1,
            now: () => time,
        });

        const ok = limiter.consume("a");
        expect(ok.allowed).toBe(true);
        expect(ok.resetAt.getTime()).toBe(1_000_000 + 60_000);
    });
});

describe("getClientIp", () => {
    function makeRequest(headers: HeadersInit): Request {
        return new Request("http://localhost/api/auth/session", { headers });
    }

    it("returns the first hop from x-forwarded-for", () => {
        const req = makeRequest({
            "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
        });
        expect(getClientIp(req)).toBe("203.0.113.7");
    });

    it("returns x-real-ip when x-forwarded-for is absent", () => {
        const req = makeRequest({ "x-real-ip": "198.51.100.42" });
        expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("ignores an empty x-forwarded-for and falls back to x-real-ip", () => {
        const req = makeRequest({
            "x-forwarded-for": " , , ",
            "x-real-ip": "198.51.100.42",
        });
        expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("returns null when neither header is present", () => {
        const req = makeRequest({});
        expect(getClientIp(req)).toBeNull();
    });
});
