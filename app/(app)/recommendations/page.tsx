import { RecommendationsList } from "@/components/recommendations-list";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlanRecommendationLimit } from "@/lib/entitlements/plans";

export default async function RecommendationsPage() {
  const user = await requireUser();
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subscriptionPlan: true },
  });
  const recommendationLimit = getPlanRecommendationLimit(profile?.subscriptionPlan);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Recommendations</h1>
      <p className="text-sm text-zinc-600">Recommendations from what you love, not just what you loop.</p>
      <p className="text-sm text-zinc-500">Your current plan refreshes up to {recommendationLimit} recommendations per cycle.</p>
      <RecommendationsList />
    </div>
  );
}
