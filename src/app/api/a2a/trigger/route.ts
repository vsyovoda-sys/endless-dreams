import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/api/auth/session/route";
import { triggerA2AConversation, pairForConversation } from "@/lib/a2a-engine";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/** GET /api/a2a/trigger?debug=1 — 诊断配对逻辑 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userDreams = await prisma.dream.findMany({
    where: { userId: user.id, isGhost: false },
    select: { id: true, date: true, createdAt: true, content: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const userDreamToday = await prisma.dream.findFirst({
    where: { userId: user.id, isGhost: false, date: { gte: today } },
    orderBy: { createdAt: "desc" },
  });

  const ghostCount = await prisma.dream.count({ where: { isGhost: true } });

  let pairError: string | null = null;
  let pairResult = null;
  try {
    pairResult = await pairForConversation(user.id);
  } catch (e: unknown) {
    pairError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
  }

  return NextResponse.json({
    userId: user.id,
    todayUTC: today.toISOString(),
    nowUTC: new Date().toISOString(),
    userDreams: userDreams.map(d => ({
      id: d.id,
      date: d.date,
      createdAt: d.createdAt,
      contentSnippet: d.content?.slice(0, 30),
    })),
    userDreamTodayFound: !!userDreamToday,
    userDreamTodayId: userDreamToday?.id ?? null,
    userDreamTodayDate: userDreamToday?.date ?? null,
    ghostCount,
    pairResult,
    pairError,
  });
}

/** POST /api/a2a/trigger — 手动触发一次 A2A 对话 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const result = await triggerA2AConversation(user.id);

    if (!result) {
      return NextResponse.json(
        { message: "当前没有可配对的对象，请先录入今天的梦境" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("A2A trigger error:", error);
    return NextResponse.json({ error: "对话触发失败", detail: String(error) }, { status: 500 });
  }
}
