import { beforeEach, describe, expect, it, vi } from "vitest";

import * as recommendationsJobRoute from "@/app/api/internal/jobs/recommendations/route";
import * as weeklyRecapJobRoute from "@/app/api/internal/jobs/weekly-recaps/route";

const { mockRefreshRecommendationsJob, mockGenerateWeeklyRecapsJob } = vi.hoisted(() => ({
  mockRefreshRecommendationsJob: vi.fn(),
  mockGenerateWeeklyRecapsJob: vi.fn(),
}));

vi.mock("@/lib/jobs/recommendations", () => ({
  refreshRecommendationsJob: mockRefreshRecommendationsJob,
}));

vi.mock("@/lib/jobs/weekly-recaps", () => ({
  generateWeeklyRecapsJob: mockGenerateWeeklyRecapsJob,
  getWeekStart: (date: Date) => date,
}));

function createJobRequest(url: string, payload?: unknown, auth = "Bearer secret") {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: auth,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

describe("internal job routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_JOB_SECRET = "secret";
  });

  it("rejects recommendation jobs without valid auth", async () => {
    const response = await recommendationsJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/recommendations", {}, "Bearer wrong"),
    );
    const body = (await response.json()) as { ok: boolean; error?: { code?: string } };

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });

  it("dispatches the recommendation refresh job", async () => {
    mockRefreshRecommendationsJob.mockResolvedValue([{ userId: "user_1", recommendationCount: 5 }]);

    const response = await recommendationsJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/recommendations", { limit: 1 }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      data?: { processedUsers: number; results: Array<{ userId: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data?.processedUsers).toBe(1);
    expect(mockRefreshRecommendationsJob).toHaveBeenCalledWith({ limit: 1 });
  });

  it("dispatches the weekly recap job", async () => {
    mockGenerateWeeklyRecapsJob.mockResolvedValue([{ userId: "user_1", generated: true }]);

    const response = await weeklyRecapJobRoute.POST(
      createJobRequest("http://localhost/api/internal/jobs/weekly-recaps", { userIds: ["user_1"] }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      data?: { processedUsers: number; results: Array<{ userId: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data?.processedUsers).toBe(1);
    expect(mockGenerateWeeklyRecapsJob).toHaveBeenCalledWith({ userIds: ["user_1"] });
  });
});