import bcrypt from "bcrypt";

import { failure, invalidPayload, rateLimited, success } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { createRequestTrace } from "@/lib/observability/request-trace";
import {
  buildAuthAbuseKey,
  clearAuthAbuse,
  extractRequesterIp,
  readAuthAbuseState,
  registerAuthFailure,
  resolveAuthAbuseConfig,
} from "@/lib/security/auth-abuse";
import { signupSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const trace = createRequestTrace(request, "auth.signup");
  trace.info("request.started");

  const payload = await request.json().catch(() => null);
  const ipKey = buildAuthAbuseKey({
    scope: "signup",
    dimension: "ip",
    value: extractRequesterIp(request.headers),
  });
  const emailKey =
    payload && typeof payload === "object" && typeof payload.email === "string"
      ? buildAuthAbuseKey({
          scope: "signup",
          dimension: "email",
          value: payload.email,
        })
      : null;
  const config = resolveAuthAbuseConfig({
    scope: "SIGNUP",
    defaultMaxAttempts: 4,
    defaultWindowMs: 30 * 60_000,
    defaultLockoutMs: 30 * 60_000,
  });

  const blocked = [ipKey, emailKey]
    .filter((value): value is string => Boolean(value))
    .map((key) => readAuthAbuseState({ key }))
    .find((state) => !state.allowed);
  if (blocked) {
    trace.warn("auth.locked", { retryAfterSeconds: blocked.retryAfterSeconds });
    trace.complete(429, { outcome: "rate_limited" });
    return rateLimited({
      requestId: trace.requestId,
      retryAfterSeconds: blocked.retryAfterSeconds,
      message: "Too many signup attempts. Please try again later.",
      details: { scope: "SIGNUP" },
    });
  }

  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    registerAuthFailure({ key: ipKey, config });
    if (emailKey) {
      registerAuthFailure({ key: emailKey, config });
    }
    trace.warn("validation.failed", { issueCount: parsed.error.issues.length });
    trace.complete(400, { outcome: "invalid_payload" });
    return invalidPayload("Invalid input.", parsed.error.flatten(), trace.requestId);
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    registerAuthFailure({ key: ipKey, config });
    registerAuthFailure({
      key: buildAuthAbuseKey({ scope: "signup", dimension: "email", value: email }),
      config,
    });
    trace.warn("signup.duplicate_email", { email: email.toLowerCase() });
    trace.complete(409, { outcome: "duplicate_email" });
    return failure({
      status: 409,
      code: "EMAIL_EXISTS",
      message: "Email already exists.",
      requestId: trace.requestId,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
    },
  });

  clearAuthAbuse({ key: ipKey });
  clearAuthAbuse({ key: buildAuthAbuseKey({ scope: "signup", dimension: "email", value: email }) });
  trace.complete(200, { outcome: "success" });
  return success({ created: true }, { requestId: trace.requestId });
}
