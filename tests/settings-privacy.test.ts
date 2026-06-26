import { beforeEach, describe, expect, it, vi } from "vitest";

import * as deleteAccountRoute from "@/app/api/settings/account/route";
import * as exportRoute from "@/app/api/settings/export/route";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { __resetRateLimitStore } from "@/lib/security/rate-limit";

const { mockBuildUserDataExport, mockPrisma } = vi.hoisted(() => {
  const localMockBuildUserDataExport = vi.fn();
  const localMockPrisma = {
    user: {
      deleteMany: vi.fn(),
    },
  };

  return {
    mockBuildUserDataExport: localMockBuildUserDataExport,
    mockPrisma: localMockPrisma,
  };
});

vi.mock("@/lib/auth/api-user", () => ({
  getAuthenticatedUserId: vi.fn(async () => "user_1"),
}));

vi.mock("@/lib/privacy/export", () => ({
  buildUserDataExport: mockBuildUserDataExport,
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

describe("settings privacy routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    delete process.env.RATE_LIMIT_SETTINGS_EXPORT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_SETTINGS_EXPORT_WINDOW_MS;
    delete process.env.RATE_LIMIT_SETTINGS_DELETE_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_SETTINGS_DELETE_WINDOW_MS;
  });

  it("exports user data with an envelope response", async () => {
    mockBuildUserDataExport.mockResolvedValue({
      exportedAt: "2026-06-23T00:00:00.000Z",
      user: { id: "user_1", email: "user@example.com" },
      diaryEntries: [],
      trackScores: [],
      comparisons: [],
      recommendations: [],
      weeklyRecaps: [],
      rankingSnapshots: [],
    });

    const response = await exportRoute.GET(createJsonRequest("http://localhost/api/settings/export", "GET"));
    const body = (await response.json()) as { ok: boolean; data?: { user?: { id: string } } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.user?.id).toBe("user_1");
    expect(response.headers.get("content-disposition")).toContain("music-diary-export-user_1.json");
  });

  it("rate limits repeated export requests", async () => {
    process.env.RATE_LIMIT_SETTINGS_EXPORT_MAX_REQUESTS = "1";
    process.env.RATE_LIMIT_SETTINGS_EXPORT_WINDOW_MS = "60000";

    mockBuildUserDataExport.mockResolvedValue({
      exportedAt: "2026-06-23T00:00:00.000Z",
      user: { id: "user_1" },
      diaryEntries: [],
      trackScores: [],
      comparisons: [],
      recommendations: [],
      weeklyRecaps: [],
      rankingSnapshots: [],
    });

    const first = await exportRoute.GET(createJsonRequest("http://localhost/api/settings/export", "GET"));
    const second = await exportRoute.GET(createJsonRequest("http://localhost/api/settings/export", "GET"));
    const secondBody = (await second.json()) as { ok: boolean; error?: { code?: string } };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
  });

  it("requires delete confirmation before removing an account", async () => {
    const response = await deleteAccountRoute.DELETE(
      createJsonRequest("http://localhost/api/settings/account", "DELETE", { confirmation: "nope" }),
    );
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(400);
    expect(body.error?.code).toBe("INVALID_PAYLOAD");
  });

  it("deletes the authenticated account when confirmation is valid", async () => {
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 1 });

    const response = await deleteAccountRoute.DELETE(
      createJsonRequest("http://localhost/api/settings/account", "DELETE", { confirmation: "DELETE" }),
    );
    const body = (await response.json()) as { ok: boolean; data?: { deleted?: boolean } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.deleted).toBe(true);
    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: "user_1" } });
  });

  it("returns unauthorized when export is requested without a session", async () => {
    vi.mocked(getAuthenticatedUserId).mockResolvedValueOnce(undefined);

    const response = await exportRoute.GET(createJsonRequest("http://localhost/api/settings/export", "GET"));
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });
});