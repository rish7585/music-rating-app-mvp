import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tier } from "@prisma/client";

import * as diaryRoute from "@/app/api/diary/route";
import * as pairwiseRoute from "@/app/api/pairwise/route";
import * as rankingsRoute from "@/app/api/rankings/route";
import * as recommendationsRoute from "@/app/api/recommendations/route";
import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { __resetRateLimitStore } from "@/lib/security/rate-limit";

const { mockCaptureSnapshot, mockPrisma } = vi.hoisted(() => {
  const localMockCaptureSnapshot = vi.fn(async () => ({ captured: true, capturedAt: new Date() }));
  const localMockPrisma = {
    user: {
      findUnique: vi.fn(),
    },
    userTrackScore: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    diaryEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    tasteTag: {
      upsert: vi.fn(),
    },
    entryTag: {
      upsert: vi.fn(),
    },
    rankingComparison: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    recommendation: {
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    mockCaptureSnapshot: localMockCaptureSnapshot,
    mockPrisma: localMockPrisma,
  };
});

vi.mock("@/lib/auth/api-user", () => ({
  getAuthenticatedUserId: vi.fn(async () => "user_1"),
}));

vi.mock("@/lib/ranking/snapshots", () => ({
  captureRankingSnapshot: () => mockCaptureSnapshot(),
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

function createJsonRequestWithTraceId(url: string, method: string, traceId: string, payload?: unknown) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": traceId,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

describe("API mutation envelopes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
    delete process.env.RATE_LIMIT_DIARY_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_DIARY_WINDOW_MS;
    delete process.env.RATE_LIMIT_RANKINGS_PATCH_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_RANKINGS_PATCH_WINDOW_MS;
    delete process.env.RATE_LIMIT_RANKINGS_DELETE_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_RANKINGS_DELETE_WINDOW_MS;
    delete process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_WINDOW_MS;

    mockPrisma.user.findUnique.mockResolvedValue(undefined);

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
      callback(mockPrisma),
    );
  });

  it("creates diary entry with envelope success shape", async () => {
    mockPrisma.userTrackScore.findUnique.mockResolvedValueOnce({ score: 710, tier: Tier.HEAVY_ROTATION });
    mockPrisma.userTrackScore.count.mockResolvedValueOnce(2);
    mockPrisma.diaryEntry.create.mockResolvedValueOnce({ id: "entry_1" });
    mockPrisma.tasteTag.upsert.mockResolvedValue({ id: "tag_1", name: "focus" });
    mockPrisma.entryTag.upsert.mockResolvedValue({});
    mockPrisma.userTrackScore.upsert.mockResolvedValueOnce({ score: 756 });

    const response = await diaryRoute.POST(
      createJsonRequest("http://localhost/api/diary", "POST", {
        trackId: "track_1",
        tier: Tier.HEAVY_ROTATION,
        note: "great",
        tags: ["focus"],
      }),
    );

    const body = (await response.json()) as { ok: boolean; data?: { entryId: string; score: number } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.entryId).toBe("entry_1");
    expect(typeof body.data?.score).toBe("number");
  });

  it("propagates request id on successful diary response", async () => {
    const traceId = "trace-diary-1";

    mockPrisma.userTrackScore.findUnique.mockResolvedValueOnce({ score: 710, tier: Tier.HEAVY_ROTATION });
    mockPrisma.userTrackScore.count.mockResolvedValueOnce(2);
    mockPrisma.diaryEntry.create.mockResolvedValueOnce({ id: "entry_trace" });
    mockPrisma.tasteTag.upsert.mockResolvedValue({ id: "tag_1", name: "focus" });
    mockPrisma.entryTag.upsert.mockResolvedValue({});
    mockPrisma.userTrackScore.upsert.mockResolvedValueOnce({ score: 760 });

    const response = await diaryRoute.POST(
      createJsonRequestWithTraceId("http://localhost/api/diary", "POST", traceId, {
        trackId: "track_1",
        tier: Tier.HEAVY_ROTATION,
        tags: ["focus"],
      }),
    );

    const body = (await response.json()) as {
      ok: boolean;
      meta?: { requestId?: string };
    };

    expect(response.headers.get("x-request-id")).toBe(traceId);
    expect(body.meta?.requestId).toBe(traceId);
  });

  it("records pairwise comparison with envelope success shape", async () => {
    mockPrisma.userTrackScore.findUnique
      .mockResolvedValueOnce({ score: 800, tier: Tier.ELITE })
      .mockResolvedValueOnce({ score: 770, tier: Tier.ELITE });
    mockPrisma.rankingComparison.count.mockResolvedValue(6);
    mockPrisma.userTrackScore.upsert.mockResolvedValue({});
    mockPrisma.rankingComparison.create.mockResolvedValue({});

    const response = await pairwiseRoute.POST(
      createJsonRequest("http://localhost/api/pairwise", "POST", {
        leftTrackId: "track_1",
        rightTrackId: "track_2",
        winnerTrackId: "track_1",
      }),
    );

    const body = (await response.json()) as { ok: boolean; data?: { delta: number; kFactor: number } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.data?.delta).toBe("number");
    expect(typeof body.data?.kFactor).toBe("number");
  });

  it("patches ranking tier with envelope success shape", async () => {
    mockPrisma.userTrackScore.findUnique.mockResolvedValueOnce({ score: 860, tier: Tier.ELITE });
    mockPrisma.userTrackScore.upsert.mockResolvedValueOnce({ score: 890 });

    const response = await rankingsRoute.PATCH(
      createJsonRequest("http://localhost/api/rankings", "PATCH", {
        trackId: "track_1",
        tier: Tier.LIFE_SONG,
      }),
    );

    const body = (await response.json()) as { ok: boolean; data?: { score: number } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.score).toBeGreaterThan(0);
  });

  it("applies recommendation save action with envelope success shape", async () => {
    mockPrisma.recommendation.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.userTrackScore.findUnique.mockResolvedValueOnce({ score: 690, tier: Tier.LIKED });
    mockPrisma.userTrackScore.upsert.mockResolvedValueOnce({});

    const response = await recommendationsRoute.PATCH(
      createJsonRequest("http://localhost/api/recommendations", "PATCH", {
        trackId: "track_1",
        action: "save",
      }),
    );

    const body = (await response.json()) as { ok: boolean; data?: { updated: boolean } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.updated).toBe(true);
  });

  it("propagates request id on validation failure", async () => {
    const traceId = "trace-failure-1";

    const response = await pairwiseRoute.POST(
      createJsonRequestWithTraceId("http://localhost/api/pairwise", "POST", traceId, {
        leftTrackId: "track_1",
        rightTrackId: "track_1",
        winnerTrackId: "track_1",
      }),
    );

    const body = (await response.json()) as {
      ok: boolean;
      error?: { code?: string };
      meta?: { requestId?: string };
    };

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("INVALID_COMPARISON");
    expect(response.headers.get("x-request-id")).toBe(traceId);
    expect(body.meta?.requestId).toBe(traceId);
  });

  it("propagates request id on unauthorized response", async () => {
    const traceId = "trace-unauth-1";
    vi.mocked(getAuthenticatedUserId).mockResolvedValueOnce(undefined);

    const response = await rankingsRoute.DELETE(
      createJsonRequestWithTraceId("http://localhost/api/rankings", "DELETE", traceId),
    );

    const body = (await response.json()) as {
      ok: boolean;
      error?: { code?: string };
      meta?: { requestId?: string };
    };

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("UNAUTHORIZED");
    expect(response.headers.get("x-request-id")).toBe(traceId);
    expect(body.meta?.requestId).toBe(traceId);
  });

  it("returns 429 when diary mutation exceeds configured rate limit", async () => {
    process.env.RATE_LIMIT_DIARY_MAX_REQUESTS = "1";
    process.env.RATE_LIMIT_DIARY_WINDOW_MS = "60000";

    mockPrisma.userTrackScore.findUnique.mockResolvedValue({ score: 700, tier: Tier.LIKED });
    mockPrisma.userTrackScore.count.mockResolvedValue(1);
    mockPrisma.diaryEntry.create.mockResolvedValue({ id: "entry_limit" });
    mockPrisma.tasteTag.upsert.mockResolvedValue({ id: "tag_1", name: "focus" });
    mockPrisma.entryTag.upsert.mockResolvedValue({});
    mockPrisma.userTrackScore.upsert.mockResolvedValue({ score: 740 });

    const first = await diaryRoute.POST(
      createJsonRequest("http://localhost/api/diary", "POST", {
        trackId: "track_1",
        tier: Tier.LIKED,
        tags: ["focus"],
      }),
    );
    const second = await diaryRoute.POST(
      createJsonRequest("http://localhost/api/diary", "POST", {
        trackId: "track_2",
        tier: Tier.LIKED,
        tags: ["focus"],
      }),
    );

    const secondBody = (await second.json()) as {
      ok: boolean;
      error?: { code?: string };
    };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(secondBody.ok).toBe(false);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 429 when rankings patch exceeds configured rate limit", async () => {
    process.env.RATE_LIMIT_RANKINGS_PATCH_MAX_REQUESTS = "1";
    process.env.RATE_LIMIT_RANKINGS_PATCH_WINDOW_MS = "60000";

    mockPrisma.userTrackScore.findUnique.mockResolvedValue({ score: 860, tier: Tier.ELITE });
    mockPrisma.userTrackScore.upsert.mockResolvedValue({ score: 890 });

    const first = await rankingsRoute.PATCH(
      createJsonRequest("http://localhost/api/rankings", "PATCH", {
        trackId: "track_1",
        tier: Tier.LIFE_SONG,
      }),
    );
    const second = await rankingsRoute.PATCH(
      createJsonRequest("http://localhost/api/rankings", "PATCH", {
        trackId: "track_2",
        tier: Tier.ELITE,
      }),
    );

    const secondBody = (await second.json()) as {
      ok: boolean;
      error?: { code?: string };
    };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(secondBody.ok).toBe(false);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 429 when rankings delete exceeds configured rate limit", async () => {
    process.env.RATE_LIMIT_RANKINGS_DELETE_MAX_REQUESTS = "1";
    process.env.RATE_LIMIT_RANKINGS_DELETE_WINDOW_MS = "60000";

    mockPrisma.userTrackScore.deleteMany.mockResolvedValue({ count: 1 });

    const first = await rankingsRoute.DELETE(
      createJsonRequest("http://localhost/api/rankings?trackId=track_1", "DELETE"),
    );
    const second = await rankingsRoute.DELETE(
      createJsonRequest("http://localhost/api/rankings?trackId=track_2", "DELETE"),
    );

    const secondBody = (await second.json()) as {
      ok: boolean;
      error?: { code?: string };
    };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(secondBody.ok).toBe(false);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("returns 429 when recommendations patch exceeds configured rate limit", async () => {
    process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_MAX_REQUESTS = "1";
    process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_WINDOW_MS = "60000";

    mockPrisma.recommendation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.userTrackScore.findUnique.mockResolvedValue({ score: 690, tier: Tier.LIKED });
    mockPrisma.userTrackScore.upsert.mockResolvedValue({});

    const first = await recommendationsRoute.PATCH(
      createJsonRequest("http://localhost/api/recommendations", "PATCH", {
        trackId: "track_1",
        action: "save",
      }),
    );
    const second = await recommendationsRoute.PATCH(
      createJsonRequest("http://localhost/api/recommendations", "PATCH", {
        trackId: "track_2",
        action: "dismiss",
      }),
    );

    const secondBody = (await second.json()) as {
      ok: boolean;
      error?: { code?: string };
    };

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(secondBody.ok).toBe(false);
    expect(secondBody.error?.code).toBe("RATE_LIMITED");
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("does not rate limit rankings GET when patch limits are exhausted", async () => {
    process.env.RATE_LIMIT_RANKINGS_PATCH_MAX_REQUESTS = "0";
    process.env.RATE_LIMIT_RANKINGS_PATCH_WINDOW_MS = "60000";

    mockPrisma.userTrackScore.findMany.mockResolvedValue([]);
    mockPrisma.rankingComparison.findMany.mockResolvedValue([]);
    mockPrisma.diaryEntry.findMany.mockResolvedValue([]);

    const response = await rankingsRoute.GET(createJsonRequest("http://localhost/api/rankings", "GET"));
    const body = (await response.json()) as { ok: boolean; data?: { rankings: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.rankings).toEqual([]);
  });

  it("does not rate limit recommendations GET when patch limits are exhausted", async () => {
    process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_MAX_REQUESTS = "0";
    process.env.RATE_LIMIT_RECOMMENDATIONS_PATCH_WINDOW_MS = "60000";

    mockPrisma.track.findMany.mockResolvedValue([]);
    mockPrisma.userTrackScore.findMany.mockResolvedValue([]);
    mockPrisma.diaryEntry.findMany.mockResolvedValue([]);
    mockPrisma.rankingComparison.findMany.mockResolvedValue([]);

    const response = await recommendationsRoute.GET(
      createJsonRequest("http://localhost/api/recommendations", "GET"),
    );
    const body = (await response.json()) as { ok: boolean; data?: { recommendations: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.recommendations).toEqual([]);
  });
});
