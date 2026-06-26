import { describe, expect, it } from "vitest";

import { __resetRateLimitStore, consumeRateLimit } from "@/lib/security/rate-limit";

describe("rate limit utility", () => {
  it("allows requests until max and blocks after", () => {
    __resetRateLimitStore();

    const first = consumeRateLimit({
      key: "k1",
      maxRequests: 2,
      windowMs: 60_000,
      now: 1_000,
    });
    const second = consumeRateLimit({
      key: "k1",
      maxRequests: 2,
      windowMs: 60_000,
      now: 2_000,
    });
    const third = consumeRateLimit({
      key: "k1",
      maxRequests: 2,
      windowMs: 60_000,
      now: 3_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets allowance when window elapses", () => {
    __resetRateLimitStore();

    consumeRateLimit({
      key: "k2",
      maxRequests: 1,
      windowMs: 1_000,
      now: 10_000,
    });
    const blocked = consumeRateLimit({
      key: "k2",
      maxRequests: 1,
      windowMs: 1_000,
      now: 10_500,
    });
    const allowedAgain = consumeRateLimit({
      key: "k2",
      maxRequests: 1,
      windowMs: 1_000,
      now: 11_100,
    });

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
  });
});
