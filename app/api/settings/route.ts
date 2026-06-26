import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUserId } from "@/lib/auth/api-user";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  privacyDefault: z.enum(["private", "friends"]),
});

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { privacyDefault: parsed.data.privacyDefault },
  });

  return NextResponse.json({ ok: true });
}
