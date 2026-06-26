import { beforeEach, describe, expect, it, vi } from "vitest";

import * as healthRoute from "@/app/api/internal/jobs/health/route";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      count: vi.fn(),
    },
    recommendation: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    weeklyRecap: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

function createRequest(auth = "Bearer secret") {
  return new Request("http://localhost/api/internal/jobs/health", {
    method: "GET",
    headers: {
      authorization: auth,
    },
  });
}

describe("internal jobs health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_JOB_SECRET = "secret";
  });

  it("returns unauthorized for invalid auth", async () => {
    const response = await healthRoute.GET(createRequest("Bearer wrong"));
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("returns healthy status when recommendation and recap checks pass", async () => {
    mockPrisma.user.count.mockResolvedValue(12);
    mockPrisma.recommendation.count.mockResolvedValue(25);
    mockPrisma.weeklyRecap.count.mockResolvedValue(4);
    mockPrisma.recommendation.findFirst.mockResolvedValue({ createdAt: new Date("2026-06-24T11:55:00.000Z") });
    mockPrisma.weeklyRecap.findFirst.mockResolvedValue({
      createdAt: new Date("2026-06-24T08:00:00.000Z"),
      weekStart: new Date("2026-06-22T00:00:00.000Z"),
    });

    const response = await healthRoute.GET(createRequest());
    const body = (await response.json()) as {
      ok: boolean;
      data?: {
        status: string;
        summary: { users: number; recommendations24h: number; weeklyRecapsCurrentWeek: number };
        checks: Array<{ name: string; ok: boolean }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data?.status).toBe("ok");
    expect(body.data?.summary).toEqual({
      users: 12,
      recommendations24h: 25,
      weeklyRecapsCurrentWeek: 4,
    });
    expect(body.data?.checks.every((check) => check.ok)).toBe(true);
  });

  it("returns degraded status when freshness checks fail", async () => {
    mockPrisma.user.count.mockResolvedValue(12);
    mockPrisma.recommendation.count.mockResolvedValue(0);
    mockPrisma.weeklyRecap.count.mockResolvedValue(0);
    mockPrisma.recommendation.findFirst.mockResolvedValue(null);
    mockPrisma.weeklyRecap.findFirst.mockResolvedValue(null);

    const response = await healthRoute.GET(createRequest());
    const body = (await response.json()) as {
      ok: boolean;
      data?: { status: string; checks: Array<{ name: string; ok: boolean }> };
    };

    expect(response.status).toBe(503);
    expect(body.data?.status).toBe("degraded");
    expect(body.data?.checks.some((check) => check.ok === false)).toBe(true);
  });
});
