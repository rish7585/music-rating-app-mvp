import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetAuthAbuseStore,
  buildAuthAbuseKey,
  clearAuthAbuse,
  readAuthAbuseState,
  registerAuthFailure,
} from "@/lib/security/auth-abuse";

describe("auth abuse utility", () => {
  beforeEach(() => {
    __resetAuthAbuseStore();
  });

  it("locks a key after the configured number of failures", () => {
    const key = buildAuthAbuseKey({
      scope: "signin",
      dimension: "email",
      value: "user@example.com",
    });

    const first = registerAuthFailure({
      key,
      config: { maxAttempts: 2, windowMs: 60_000, lockoutMs: 120_000 },
      now: 1_000,
    });
    const second = registerAuthFailure({
      key,
      config: { maxAttempts: 2, windowMs: 60_000, lockoutMs: 120_000 },
      now: 2_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.isLocked).toBe(true);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears a key after a successful auth event", () => {
    const key = buildAuthAbuseKey({
      scope: "signup",
      dimension: "ip",
      value: "127.0.0.1",
    });

    registerAuthFailure({
      key,
      config: { maxAttempts: 1, windowMs: 60_000, lockoutMs: 120_000 },
      now: 1_000,
    });

    clearAuthAbuse({ key });

    const state = readAuthAbuseState({ key, now: 2_000 });
    expect(state.allowed).toBe(true);
    expect(state.isLocked).toBe(false);
  });
});