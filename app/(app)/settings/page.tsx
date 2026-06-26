import { SettingsForm } from "@/components/settings-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlanFeatures } from "@/lib/entitlements/plans";

export default async function SettingsPage() {
  const user = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, privacyDefault: true, subscriptionPlan: true },
  });
  const features = getPlanFeatures(profile?.subscriptionPlan);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card className="space-y-3">
        <p className="text-sm text-zinc-600">
          Profile: {profile?.name} • {profile?.email}
        </p>
        <p className="text-sm text-zinc-600">Plan: {profile?.subscriptionPlan ?? "FREE"}</p>
        <SettingsForm initialPrivacy={profile?.privacyDefault ?? "private"} />
        <p className="text-sm text-zinc-500">Spotify / Apple Music connection coming soon.</p>
        <p className="text-sm text-zinc-500">You can now export your account data or permanently delete your account from this screen.</p>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <p>Plan features:</p>
          <p>Priority recommendations: {features.priorityRecommendations ? "Included" : "Upgrade to Plus"}</p>
          <p>Weekly recap archive: {features.weeklyRecapArchive ? "Included" : "Upgrade to Plus"}</p>
          <p>Advanced insights: {features.advancedInsights ? "Included" : "Upgrade to Pro"}</p>
        </div>
      </Card>
    </div>
  );
}
