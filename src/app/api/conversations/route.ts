import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/auth/session/route";

/** GET /api/conversations — 获取当前用户的 Agent 对话列表（白天窥探用） */
export async function GET() {
  try {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const conversations = await prisma.agentConversation.findMany({
    where: {
      OR: [{ agentAUserId: user.id }, { agentBUserId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fragments: true,
      emotionTone: true,
      status: true,
      rounds: true,
      createdAt: true,
      agentA: { select: { id: true, name: true, avatar: true } },
      agentB: { select: { id: true, name: true, avatar: true } },
      ghostDreamId: true,
    },
  });

  // 碎片化展示——用户只能看到断续的关键词
  const peekable = conversations.map((conv) => {
    let fragments: unknown[] = [];
    try {
      fragments = JSON.parse(conv.fragments || "[]");
    } catch {
      // malformed JSON — fallback to empty
    }
    return {
    id: conv.id,
    fragments,
    emotionTone: conv.emotionTone,
    status: conv.status,
    rounds: conv.rounds,
    createdAt: conv.createdAt,
    partner: conv.agentA.id === user.id ? conv.agentB : conv.agentA,
    isGhostConversation: !!conv.ghostDreamId,
  }});

  return NextResponse.json({ conversations: peekable });
  } catch (error) {
    console.error("Conversations API error:", error);
    return NextResponse.json(
      { error: "服务错误", detail: String(error) },
      { status: 500 }
    );
  }
}
