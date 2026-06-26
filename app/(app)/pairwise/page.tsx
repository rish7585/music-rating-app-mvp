import { PairwiseCalibrator } from "@/components/pairwise-calibrator";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildComparisonCountMap } from "@/lib/ranking/personal-lists";
import { calculateConfidence } from "@/lib/ranking/scoring";

export default async function PairwisePage() {
  const user = await requireUser();

  const [tracks, comparisons] = await Promise.all([
    prisma.userTrackScore.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } } },
      take: 90,
    }),
    prisma.rankingComparison.findMany({
      where: { userId: user.id },
      select: { winnerTrackId: true, loserTrackId: true, delta: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
  ]);

  const comparisonCountMap = buildComparisonCountMap(comparisons);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Pairwise ranking</h1>
      <Card>
        <PairwiseCalibrator
          options={tracks.map((item) => ({
            trackId: item.trackId,
            title: item.track.title,
            artistName: item.track.artist.name,
            score: item.score,
            confidence: calculateConfidence(comparisonCountMap.get(item.trackId) ?? 0),
            comparisonCount: comparisonCountMap.get(item.trackId) ?? 0,
          }))}
        />
      </Card>
    </div>
  );
}
