import { beforeEach, describe, expect, it, vi } from "vitest";

import * as signupRoute from "@/app/api/auth/signup/route";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { __resetAuthAbuseStore } from "@/lib/security/auth-abuse";

const { mockCompare, mockHash, mockPrisma } = vi.hoisted(() => {
  const localMockCompare = vi.fn();
  const localMockHash = vi.fn();
  const localMockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    mockCompare: localMockCompare,
    mockHash: localMockHash,
    mockPrisma: localMockPrisma,
  };
});

vi.mock("bcrypt", () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
  compare: mockCompare,
  hash: mockHash,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

function createJsonRequest(url: string, method: string, payload?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

describe("auth security hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAuthAbuseStore();
    delete process.env.AUTH_ABUSE_SIGNUP_MAX_ATTEMPTS;
    delete process.env.AUTH_ABUSE_SIGNUP_WINDOW_MS;
    delete process.env.AUTH_ABUSE_SIGNUP_LOCKOUT_MS;
    delete process.env.AUTH_ABUSE_SIGNIN_MAX_ATTEMPTS;
    delete process.env.AUTH_ABUSE_SIGNIN_WINDOW_MS;
    delete process.env.AUTH_ABUSE_SIGNIN_LOCKOUT_MS;
  });

  it("rate limits repeated invalid signup attempts", async () => {
    process.env.AUTH_ABUSE_SIGNUP_MAX_ATTEMPTS = "1";
    process.env.AUTH_ABUSE_SIGNUP_WINDOW_MS = "60000";
    process.env.AUTH_ABUSE_SIGNUP_LOCKOUT_MS = "60000";

    const first = await signupRoute.POST(
      createJsonRequest("http://localhost/api/auth/signup", "POST", {
        email: "bad-email",
        password: "short",
      }),
    );
    const second = await signupRoute.POST(
      createJsonRequest("http://localhost/api/auth/signup", "POST", {
        email: "bad-email",
        password: "short",
      }),
    );

    const firstBody = (await first.json()) as { ok: boolean; error?: { code?: string } };
    const secondBody = (await second.json()) as { ok: boolean; error?: { code?: string } };

    expect(first.status).toBe(400);
    expect(firstBody.error?.code).toBe("INVALID_PAYLOAD");
    expect(second.status).toBe(429);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("locks credentials sign-in after repeated failures", async () => {
    process.env.AUTH_ABUSE_SIGNIN_MAX_ATTEMPTS = "1";
    process.env.AUTH_ABUSE_SIGNIN_WINDOW_MS = "60000";
    process.env.AUTH_ABUSE_SIGNIN_LOCKOUT_MS = "60000";

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      name: "User",
      passwordHash: "hashed",
    });
    mockCompare.mockResolvedValue(false);

    const first = await authorizeCredentials(
      { email: "user@example.com", password: "wrong-password" },
      { headers: { "x-forwarded-for": "127.0.0.1" } },
    );

    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "wrong-password" },
        { headers: { "x-forwarded-for": "127.0.0.1" } },
      ),
    ).rejects.toThrow("AUTH_RATE_LIMITED");

    expect(first).toBeNull();
  });

  it("clears credentials lockout counters after a successful sign-in", async () => {
    process.env.AUTH_ABUSE_SIGNIN_MAX_ATTEMPTS = "2";
    process.env.AUTH_ABUSE_SIGNIN_WINDOW_MS = "60000";
    process.env.AUTH_ABUSE_SIGNIN_LOCKOUT_MS = "60000";

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      name: "User",
      passwordHash: "hashed",
    });
    mockCompare
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const failed = await authorizeCredentials(
      { email: "user@example.com", password: "wrong-password" },
      { headers: { "x-forwarded-for": "127.0.0.1" } },
    );
    const succeeded = await authorizeCredentials(
      { email: "user@example.com", password: "right-password" },
      { headers: { "x-forwarded-for": "127.0.0.1" } },
    );
    const failedAgain = await authorizeCredentials(
      { email: "user@example.com", password: "wrong-password" },
      { headers: { "x-forwarded-for": "127.0.0.1" } },
    );

    expect(failed).toBeNull();
    expect(succeeded).toMatchObject({ id: "user_1", email: "user@example.com" });
    expect(failedAgain).toBeNull();
  });
});