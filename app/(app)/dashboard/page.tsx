import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tierLabels } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildComparisonCountMap } from "@/lib/ranking/personal-lists";
import { calculateConfidence } from "@/lib/ranking/scoring";

export default async function DashboardPage() {
  const user = await requireUser();

  const [entries, rankings, recommendations] = await Promise.all([
    prisma.diaryEntry.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } }, tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.userTrackScore.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 5,
    }),
    prisma.recommendation.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 1,
    }),
  ]);

  const comparisons = await prisma.rankingComparison.findMany({
    where: { userId: user.id },
    select: { winnerTrackId: true, loserTrackId: true, delta: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1200,
  });
  const comparisonCountMap = buildComparisonCountMap(comparisons);

  const confidenceRows = rankings.map((row) => {
    const comparisonCount = comparisonCountMap.get(row.trackId) ?? 0;
    return {
      comparisonCount,
      confidence: calculateConfidence(comparisonCount),
    };
  });

  const averageConfidence = confidenceRows.length
    ? confidenceRows.reduce((sum, row) => sum + row.confidence, 0) / confidenceRows.length
    : 0;
  const unstableCount = confidenceRows.filter((row) => row.confidence < 0.45).length;

  const topTags = entries.flatMap((entry) => entry.tags.map((tag) => tag.tag.name)).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">Welcome back, {user.name}.</p>
          <h1 className="text-3xl font-semibold">Today’s music diary</h1>
        </div>
        <Link href="/diary">
          <Button>Quick add entry</Button>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-3">
          <h2 className="font-semibold">Recently logged songs</h2>
          {entries.length ? (
            entries.map((entry) => (
              <div key={entry.id} className="text-sm">
                <p className="font-medium">{entry.track.title}</p>
                <p className="text-zinc-500">
                  {entry.track.artist.name} • {tierLabels[entry.tier]}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No entries yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Current top-ranked songs</h2>
          {rankings.length ? (
            rankings.map((score) => (
              <div key={score.id} className="text-sm">
                <p className="font-medium">{score.track.title}</p>
                <p className="text-zinc-500">{Math.round(score.score)} points</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No rankings yet.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Taste pulse</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.length ? (
              topTags.map((tag) => <Badge key={tag}>{tag}</Badge>)
            ) : (
              <p className="text-sm text-zinc-500">Log tags to reveal pulse.</p>
            )}
          </div>
          <h3 className="pt-2 text-sm font-medium">Recommendation</h3>
          {recommendations[0] ? (
            <p className="text-sm text-zinc-600">
              {recommendations[0].track.title} — {recommendations[0].track.artist.name}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Your next pick appears here.</p>
          )}
          <div className="pt-1 text-xs text-zinc-600">
            Ranking confidence: {Math.round(averageConfidence * 100)}% • {unstableCount} songs still movable
          </div>
        </Card>
      </section>
    </div>
  );
}
