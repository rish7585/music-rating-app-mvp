import { z } from "zod";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { failure, invalidPayload, rateLimited, success, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import {
  buildRateLimitKey,
  consumeRateLimit,
  resolveRateLimitConfig,
} from "@/lib/security/rate-limit";

const schema = z.object({
  confirmation: z.literal("DELETE"),
});

export async function DELETE(request: Request) {
  const trace = createRequestTrace(request, "settings.account.delete");
  trace.info("request.started");

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    trace.complete(401, { outcome: "unauthorized" });
    return unauthorized(trace.requestId);
  }

  trace.assignUserId(userId);

  const config = resolveRateLimitConfig({
    scope: "SETTINGS_DELETE",
    defaultMaxRequests: 2,
    defaultWindowMs: 60 * 60_000,
  });
  const limiter = consumeRateLimit({
    key: buildRateLimitKey({ route: "settings.account.delete", userId, request }),
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  });
  if (!limiter.allowed) {
    trace.warn("rate_limit.blocked", {
      scope: "SETTINGS_DELETE",
      retryAfterSeconds: limiter.retryAfterSeconds,
    });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: limiter.retryAfterSeconds,
      message: "Too many delete attempts. Please try again later.",
      details: { scope: "SETTINGS_DELETE" },
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid delete confirmation.", parsed.error.flatten(), trace.requestId);
  }

  const deleted = await prisma.user.deleteMany({ where: { id: userId } });
  if (deleted.count === 0) {
    trace.complete(404, { outcome: "not_found" });
    return failure({
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "Account not found.",
      requestId: trace.requestId,
    });
  }

  trace.complete(200, { outcome: "success" });
  return success({ deleted: true }, { requestId: trace.requestId });
}