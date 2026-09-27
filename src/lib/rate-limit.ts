export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

export class RateLimiter {
    private readonly windowSeconds: number;
    private readonly maxRequests: number;
    private readonly now: () => number;
    private readonly store: Map<string, number[]>;

    constructor({
        windowSeconds,
        maxRequests,
        now,
    }: {
        windowSeconds: number;
        maxRequests: number;
        now?: () => number;
    }) {
        this.windowSeconds = windowSeconds;
        this.maxRequests = maxRequests;
        this.now = now ?? (() => Date.now());
        this.store = new Map();
    }

    consume(key: string): RateLimitResult {
        const now = this.now();
        const windowMs = this.windowSeconds * 1000;
        const cutoff = now - windowMs;

        let timestamps = this.store.get(key);
        if (!timestamps) {
            timestamps = [];
            this.store.set(key, timestamps);
        }

        while (timestamps.length > 0 && timestamps[0] <= cutoff) {
            timestamps.shift();
        }

        if (timestamps.length >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(timestamps[0] + windowMs),
            };
        }

        timestamps.push(now);
        return {
            allowed: true,
            remaining: this.maxRequests - timestamps.length,
            resetAt: new Date(timestamps[0] + windowMs),
        };
    }
}
