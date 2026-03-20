import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/api/auth/session/route";
import { ingestDreamMemory } from "@/lib/secondme";
import { checkSafety, extractContentShort } from "@/lib/gemini";
import { triggerA2AConversation } from "@/lib/a2a-engine";

/** POST /api/dreams — 录入新梦境 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { content?: string; isAnonymous?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const { content, isAnonymous } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "梦境内容不能为空" }, { status: 400 });
  }

  if (content.length > 10000) {
    return NextResponse.json({ error: "梦境内容过长" }, { status: 400 });
  }

  // 并行：安全检查 + 碎片预览提取（含容错）
  let safetyLevel: "safe" | "mild" | "needs_review" = "safe";
  let contentShort = content.trim().slice(0, 100);

  try {
    const [safety, preview] = await Promise.all([
      checkSafety(content).catch(() => "safe" as const),
      extractContentShort(content).catch(() => content.trim().slice(0, 100)),
    ]);
    safetyLevel = safety;
    contentShort = preview;
  } catch {
    // Gemini 完全失败也不阻断录梦，用默认值
  }

  if (safetyLevel === "needs_review") {
    return NextResponse.json(
      { error: "该梦境内容需要审核后才能发布" },
      { status: 422 }
    );
  }

  const dream = await prisma.dream.create({
    data: {
      userId: user.id,
      content: content.trim(),
      contentShort,
      isAnonymous: !!isAnonymous,
      safetyLevel,
    },
  });

  // 异步将梦境写入 Agent 记忆（体验模式跳过，不阻塞响应）
  if (user.accessToken) {
    ingestDreamMemory(user.accessToken, dream.id, contentShort).catch((err) =>
      console.error("Agent memory ingest failed:", err)
    );
  }

  // 异步触发第一轮 A2A 对话（不阻塞响应）
  triggerA2AConversation(user.id).catch((err) =>
    console.error("A2A conversation trigger failed:", err)
  );

  return NextResponse.json({ dream: { id: dream.id, contentShort, safetyLevel } });
}

/** GET /api/dreams — 获取当前用户的梦境列表 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const dreams = await prisma.dream.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      contentShort: true,
      mood: true,
      isAnonymous: true,
      date: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ dreams });
}
