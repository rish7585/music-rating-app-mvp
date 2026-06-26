import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { summarizeTaste } from "@/lib/insights";

export default async function TasteProfilePage() {
  const user = await requireUser();

  const [scores, entries] = await Promise.all([
    prisma.userTrackScore.findMany({ where: { userId: user.id }, orderBy: { score: "desc" } }),
    prisma.diaryEntry.findMany({
      where: { userId: user.id },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const trackIds = [...new Set(scores.map((score) => score.trackId).concat(entries.map((entry) => entry.trackId)))];
  const tracks = await prisma.track.findMany({ where: { id: { in: trackIds } } });

  const profile = summarizeTaste({
    scores,
    entries,
    tracks,
    entryTags: entries.flatMap((entry) => entry.tags),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Taste profile</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-zinc-500">Your current sound</p>
          <h2 className="mt-2 text-2xl font-semibold">{profile.currentSound}</h2>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Recent phase</p>
          <h2 className="mt-2 text-2xl font-semibold">{profile.recentPhase}</h2>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Your all-time anchors</p>
          <p className="mt-2 text-sm text-zinc-700">
            {profile.anchors.map((anchor) => anchor.title).join(" • ") || "Log entries to reveal anchors."}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Taste identity</p>
          <p className="mt-2 text-sm text-zinc-700">
            Top genre: {profile.topGenre} • Top mood: {profile.topMood} • Top era: {profile.topEra}
          </p>
        </Card>
      </div>
    </div>
  );
}
