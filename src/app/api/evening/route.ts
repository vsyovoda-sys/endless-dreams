import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/auth/session/route";
import { triggerEveningDream } from "@/lib/a2a-engine";

export const maxDuration = 60;

/** GET /api/evening — 获取今日入梦 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eveningDream = await prisma.eveningDream.findFirst({
    where: {
      userId: user.id,
      date: { gte: today },
    },
    include: {
      segments: {
        orderBy: { position: "asc" },
        include: {
          originDream: {
            select: { id: true, userId: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!eveningDream) {
    return NextResponse.json({ evening: null });
  }

  return NextResponse.json({
    evening: {
      id: eveningDream.id,
      story: eveningDream.story,
      audioUrl: eveningDream.audioUrl,
      segments: eveningDream.segments.map((seg) => ({
        id: seg.id,
        content: seg.content,
        isAnonymous: seg.isAnonymous,
        // 来源信息（用户选择最喜欢的片段后揭示）
        hasOrigin: !!seg.originDreamId,
      })),
    },
  });
}

/** POST /api/evening — 触发晚间梦境合成 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const result = await triggerEveningDream(user.id);
    if (!result) {
      return NextResponse.json(
        { message: "今天还没有完成的对话，无法合成梦境" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evening dream synthesis error:", error);
    return NextResponse.json({ error: "梦境合成失败", detail: String(error) }, { status: 500 });
  }
}
