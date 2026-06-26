import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function WeeklyRecapPage() {
  const user = await requireUser();

  const recap = await prisma.weeklyRecap.findFirst({
    where: { userId: user.id },
    include: { topSong: true },
    orderBy: { weekStart: "desc" },
  });

  const recommendations = await prisma.recommendation.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { track: true },
    take: 5,
    orderBy: { score: "desc" },
  });

  const defining = await prisma.diaryEntry.findMany({
    where: { userId: user.id },
    include: { track: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Weekly recap</h1>
      <Card className="space-y-2 bg-gradient-to-br from-violet-100 to-cyan-50">
        <p className="text-sm text-zinc-600">Top song of the week</p>
        <h2 className="text-2xl font-semibold">{recap?.topSong?.title ?? "Run a week of logs"}</h2>
        <p className="text-sm text-zinc-700">
          Top mood: {recap?.topMood ?? "discovery"} • Top genre: {recap?.topGenre ?? "eclectic"}
        </p>
        <p className="text-sm text-zinc-700">{recap?.summary ?? "Your week sounded like possibility."}</p>
      </Card>

      <Card>
        <h3 className="font-semibold">3 songs that defined the week</h3>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {defining.map((item) => (
            <li key={item.id}>{item.track.title}</li>
          ))}
          {!defining.length ? <li>Add entries to generate this section.</li> : null}
        </ul>
      </Card>

      <Card>
        <h3 className="font-semibold">5 recommendations for next week</h3>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {recommendations.map((item) => (
            <li key={item.id}>{item.track.title}</li>
          ))}
          {!recommendations.length ? <li>Generate recommendations first.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
