import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { rateLimited, success, unauthorized } from "@/lib/api/response";
import { createRequestTrace } from "@/lib/observability/request-trace";
import { buildUserDataExport } from "@/lib/privacy/export";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveRateLimitConfig,
} from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const trace = createRequestTrace(request, "settings.export");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "SETTINGS_EXPORT",
    defaultMaxRequests: 5,
    defaultWindowMs: 60 * 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "settings.export", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "SETTINGS_EXPORT",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      message: "Too many export requests. Please try again later.",
      details: { scope: "SETTINGS_EXPORT" },
    });
  }

  const payload = await buildUserDataExport(userId);
  trace.complete(200, {
    outcome: "success",
    diaryEntryCount: payload.diaryEntries.length,
    scoreCount: payload.trackScores.length,
  });

  return success(payload, {
    requestId: trace.requestId,
    headers: {
      "Content-Disposition": `attachment; filename="music-diary-export-${userId}.json"`,
    },
  });
}