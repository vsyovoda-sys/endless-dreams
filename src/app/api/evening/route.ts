import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/auth/session/route";
import { triggerEveningDream, synthesizeEveningDream } from "@/lib/a2a-engine";

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
    // 先诊断：直接查对话
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allConvs = await prisma.agentConversation.findMany({
      where: {
        OR: [
          { agentAUserId: user.id },
          { agentBUserId: user.id },
        ],
        createdAt: { gte: today },
      },
      select: {
        id: true,
        status: true,
        agentAUserId: true,
        agentBUserId: true,
        dreamMixResult: true,
        fullContent: true,
        fragments: true,
        createdAt: true,
      },
    });

    // 尝试合成
    const eveningDreamId = await synthesizeEveningDream(user.id);
    if (!eveningDreamId) {
      return NextResponse.json({
        message: "合成失败",
        debug: {
          userId: user.id,
          todayUTC: today.toISOString(),
          conversationsFound: allConvs.length,
          conversations: allConvs.map(c => ({
            id: c.id,
            status: c.status,
            hasDreamMixResult: !!c.dreamMixResult,
            dreamMixResultLen: c.dreamMixResult?.length ?? 0,
            fullContentLen: c.fullContent?.length ?? 0,
            fragments: c.fragments,
          })),
        }
      }, { status: 404 });
    }

    // 合成成功，走 TTS 流程
    const audioUrl = user.accessToken
      ? null // TTS 可选，不阻塞
      : null;

    const eveningDream = await prisma.eveningDream.findUnique({
      where: { id: eveningDreamId },
    });

    return NextResponse.json({
      eveningDreamId,
      story: eveningDream?.story || "",
      audioUrl,
    });
  } catch (error) {
    console.error("Evening dream synthesis error:", error);
    return NextResponse.json({ error: "梦境合成失败", detail: String(error) }, { status: 500 });
  }
}
