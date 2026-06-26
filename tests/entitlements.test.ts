import { describe, expect, it } from "vitest";
import { SubscriptionPlan } from "@prisma/client";

import { getPlanFeatures, getPlanRecommendationLimit, hasFeatureAccess } from "@/lib/entitlements/plans";

describe("entitlements", () => {
  it("uses the correct recommendation limits per plan", () => {
    expect(getPlanRecommendationLimit(SubscriptionPlan.FREE)).toBe(5);
    expect(getPlanRecommendationLimit(SubscriptionPlan.PLUS)).toBe(8);
    expect(getPlanRecommendationLimit(SubscriptionPlan.PRO)).toBe(12);
  });

  it("exposes plan-specific feature access", () => {
    expect(hasFeatureAccess(SubscriptionPlan.FREE, "advancedInsights")).toBe(false);
    expect(hasFeatureAccess(SubscriptionPlan.PLUS, "priorityRecommendations")).toBe(true);
    expect(hasFeatureAccess(SubscriptionPlan.PRO, "friendsMode")).toBe(true);
    expect(getPlanFeatures(SubscriptionPlan.PLUS).weeklyRecapArchive).toBe(true);
  });
});