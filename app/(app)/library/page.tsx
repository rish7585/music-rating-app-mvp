import { LibraryTable } from "@/components/library-table";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildComparisonCountMap, buildRankingLists } from "@/lib/ranking/personal-lists";
import { calculateConfidence } from "@/lib/ranking/scoring";

export default async function LibraryPage() {
  const user = await requireUser();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [rankings, comparisons, monthEntries] = await Promise.all([
    prisma.userTrackScore.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true, album: true } } },
      orderBy: { score: "desc" },
    }),
    prisma.rankingComparison.findMany({
      where: { userId: user.id },
      select: {
        winnerTrackId: true,
        loserTrackId: true,
        delta: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
    prisma.diaryEntry.findMany({
      where: { userId: user.id, createdAt: { gte: monthStart } },
      include: { track: { select: { genre: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const comparisonCountMap = buildComparisonCountMap(comparisons);
  const lists = buildRankingLists({
    rankedTracks: rankings,
    comparisons,
    monthEntries,
  });

  const latestSnapshotPoint = await prisma.userRankingSnapshot.findFirst({
    where: { userId: user.id, entityType: "TRACK" },
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  const previousSnapshotPoint = latestSnapshotPoint
    ? await prisma.userRankingSnapshot.findFirst({
        where: {
          userId: user.id,
          entityType: "TRACK",
          capturedAt: { lt: latestSnapshotPoint.capturedAt },
        },
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      })
    : null;

  const previousTrackSnapshots = latestSnapshotPoint
    ? await Promise.all([
        previousSnapshotPoint
          ? prisma.userRankingSnapshot.findMany({
              where: {
                userId: user.id,
                entityType: "TRACK",
                capturedAt: previousSnapshotPoint.capturedAt,
              },
              select: { itemId: true, rank: true },
            })
          : Promise.resolve([]),
      ]).then((rows) => rows[0])
    : [];

  const previousRankMap = new Map(previousTrackSnapshots.map((row) => [row.itemId, row.rank]));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Library & rankings</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-semibold">Top Songs</h2>
          {lists.topSongs.slice(0, 6).map((item, index) => (
            <p key={item.trackId} className="text-sm text-zinc-700">
              {index + 1}. {item.title} • {item.artistName}
            </p>
          ))}
          {!lists.topSongs.length ? <p className="text-sm text-zinc-500">Log songs to build your list.</p> : null}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Top Albums</h2>
          {lists.topAlbums.slice(0, 6).map((item, index) => (
            <p key={item.albumId} className="text-sm text-zinc-700">
              {index + 1}. {item.title} • {item.artistName}
            </p>
          ))}
          {!lists.topAlbums.length ? <p className="text-sm text-zinc-500">Rate more songs to reveal albums.</p> : null}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Top Artists</h2>
          {lists.topArtists.slice(0, 6).map((item, index) => (
            <p key={item.artistId} className="text-sm text-zinc-700">
              {index + 1}. {item.name}
            </p>
          ))}
          {!lists.topArtists.length ? <p className="text-sm text-zinc-500">Artists emerge as your ranking grows.</p> : null}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Recently Rising</h2>
          {lists.recentlyRising.slice(0, 6).map((item) => (
            <p key={item.trackId} className="text-sm text-zinc-700">
              {item.title} • {item.artistName}
            </p>
          ))}
          {!lists.recentlyRising.length ? <p className="text-sm text-zinc-500">Answer pairwise picks to see movement.</p> : null}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">This Month’s Sound</h2>
          <p className="text-sm text-zinc-700">{lists.thisMonthsSound.join(" • ") || "Still taking shape"}</p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">All-Time Anchors</h2>
          {lists.allTimeAnchors.slice(0, 6).map((item) => (
            <p key={item.trackId} className="text-sm text-zinc-700">
              {item.title} • {item.artistName}
            </p>
          ))}
          {!lists.allTimeAnchors.length ? <p className="text-sm text-zinc-500">Your anchors appear as confidence grows.</p> : null}
        </Card>
      </div>

      <Card>
        <LibraryTable
          items={rankings.map((row, index) => {
            const comparisonCount = comparisonCountMap.get(row.trackId) ?? 0;
            return {
              rank: index + 1,
              trackId: row.trackId,
              score: row.score,
              tier: row.tier,
              confidence: calculateConfidence(comparisonCount),
              comparisonCount,
              rankDelta:
                typeof previousRankMap.get(row.trackId) === "number"
                  ? previousRankMap.get(row.trackId)! - (index + 1)
                  : null,
              lastInteractedAt: row.lastInteractedAt.toISOString(),
              track: row.track,
            };
          })}
        />
      </Card>
    </div>
  );
}
