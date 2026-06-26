import { DiaryEntryForm } from "@/components/diary-entry-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function DiaryPage() {
  const user = await requireUser();
  const [tracks, ranked] = await Promise.all([
    prisma.track.findMany({ include: { artist: true, album: true }, take: 20 }),
    prisma.userTrackScore.findMany({
      where: { userId: user.id },
      include: { track: { include: { artist: true } } },
      orderBy: { score: "desc" },
      take: 120,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Add diary entry</h1>
      <Card>
        <p className="mb-3 text-sm text-zinc-600">Streaming history shows what played. This shows what stayed.</p>
        <DiaryEntryForm
          defaultTracks={tracks.map((track) => ({
            id: track.id,
            title: track.title,
            artist: { name: track.artist.name },
            album: { title: track.album.title },
            genre: track.genre,
          }))}
          rankedOptions={ranked.map((item) => ({
            trackId: item.trackId,
            title: item.track.title,
            artistName: item.track.artist.name,
            score: item.score,
          }))}
        />
      </Card>
      <p className="text-xs text-zinc-500">Signed in as {user.email}</p>
    </div>
  );
}
