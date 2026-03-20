import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geminiGenerate, checkSafety, extractContentShort } from "@/lib/gemini";

export const maxDuration = 60;

const SECONDME_API = "https://api.mindverse.com/gate/lab";

// ─── MCP 工具定义 ────────────────────────────────
const TOOLS = [
  {
    name: "dream_story_from_text",
    description:
      "用户说出自己的梦境，与陌生人的幽灵梦相遇，生成一段150字以内的跨梦短故事。故事克制、精准、有余韵。",
    inputSchema: {
      type: "object",
      properties: {
        dream_text: {
          type: "string",
          description: "用户今晚梦到的内容，描述越具体越好",
        },
      },
      required: ["dream_text"],
    },
  },
  {
    name: "dream_fragment_peek",
    description:
      "从无尽之梦的梦境池里随机取出一个陌生人的梦境碎片，让你感受来自另一个意识的梦。",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ─── 从 Bearer Token 解析 SecondMe 用户 ─────────
async function resolveSecondMeUser(token: string) {
  try {
    const res = await fetch(`${SECONDME_API}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 0 || !data.data?.userId) return null;
    return {
      secondMeUserId: String(data.data.userId),
      name: data.data.name || "梦游者",
      avatar: data.data.avatar || null,
    };
  } catch {
    return null;
  }
}

// ─── 查找或创建本地用户 ──────────────────────────
async function upsertMcpUser(
  secondMeUserId: string,
  name: string,
  avatar: string | null,
  token: string
) {
  return prisma.user.upsert({
    where: { secondMeUserId },
    create: {
      secondMeUserId,
      name,
      avatar,
      accessToken: token,
      refreshToken: "",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    },
    update: {
      name,
      avatar: avatar ?? undefined,
      accessToken: token,
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    },
  });
}

// ─── 工具：生成跨梦故事 ──────────────────────────
async function handleDreamStoryFromText(
  dreamText: string,
  userId: string
): Promise<string> {
  if (!dreamText || dreamText.trim().length === 0) {
    return "请告诉我你的梦境内容。";
  }
  if (dreamText.length > 5000) {
    return "梦境内容太长了，请精简到5000字以内。";
  }

  const dreamSnippet = dreamText.trim().slice(0, 600);

  // 取内容安全等级（后台异步，不阻断）
  let safetyLevel: "safe" | "mild" | "needs_review" = "safe";
  let contentShort = dreamText.slice(0, 100);
  try {
    const [safety, preview] = await Promise.all([
      checkSafety(dreamText).catch(() => "safe" as const),
      extractContentShort(dreamText).catch(() => dreamText.slice(0, 100)),
    ]);
    safetyLevel = safety;
    contentShort = preview;
  } catch {
    // 容错
  }

  if (safetyLevel === "needs_review") {
    return "这段梦境内容暂时无法展示，可能包含敏感内容。";
  }

  // 保存梦境记录
  try {
    await prisma.dream.create({
      data: {
        userId,
        content: dreamText.trim(),
        contentShort,
        safetyLevel,
        isAnonymous: false,
        isGhost: false,
      },
    });
  } catch {
    // 保存失败不阻断故事生成
  }

  // 随机取一个幽灵梦
  let otherDream = "一个陌生人的梦：一扇永远打不开的门。";
  try {
    const ghostCount = await prisma.dream.count({ where: { isGhost: true } });
    if (ghostCount > 0) {
      const skip = Math.floor(Math.random() * ghostCount);
      const ghost = await prisma.dream.findFirst({
        where: { isGhost: true },
        skip,
        select: { content: true },
      });
      if (ghost) otherDream = ghost.content;
    }
  } catch {
    // 取幽灵梦失败则用默认
  }

  const otherDreamSnippet = otherDream.slice(0, 600);

  const prompt = `【梦A：你的梦】\n${dreamSnippet}\n\n【梦B：陌生人的梦】\n${otherDreamSnippet}`;
  const systemInstruction = `你是一个用文字写梦的人。两个陌生人的梦在某个夜晚相遇了——不是比喻，是字面意思。

你的任务是把这两个梦里的元素拼合成一个短故事。

规则：
1. 从每个梦里找出1-2个最具画面感的**具体**元素：一个地点、一件物品、一个颜色、一个动作——越具体越好。
2. 用第二人称"你"，让读者觉得"这就是我"。
3. 故事里的相遇要奇异但合理，像是在梦里发生的事——有内在逻辑，但不符合现实物理。
4. 语言风格：克制、精准、有留白。不要过度描写情感。让场景说话。
5. 150字以内，故事完整，有开头有结尾。
6. 最后一句话要有余韵——不是解释，是一个印象。

禁止：
- 哲学感悟或道理（"也许这就是..."这类）
- 过度浪漫的词（"灵魂""命中注定"）
- 用"童话"语气（"很久以前"这类）

输出格式：纯文本，只输出故事本身。`;

  try {
    const story = await geminiGenerate(prompt, systemInstruction);
    return story.trim();
  } catch {
    return "梦境故事生成失败，请稍后再试。";
  }
}

// ─── 工具：随机取幽灵梦碎片 ──────────────────────
async function handleDreamFragmentPeek(): Promise<string> {
  try {
    const ghostCount = await prisma.dream.count({ where: { isGhost: true } });
    if (ghostCount === 0) {
      return "梦境池今夜空旷，没有留下任何碎片。";
    }
    const skip = Math.floor(Math.random() * ghostCount);
    const ghost = await prisma.dream.findFirst({
      where: { isGhost: true },
      skip,
      select: { content: true, contentShort: true },
    });
    if (!ghost) return "梦境池的门今夜没有打开。";
    return ghost.contentShort || ghost.content.slice(0, 150);
  } catch {
    return "无法进入梦境池，请稍后再试。";
  }
}

// ─── JSON-RPC 辅助 ────────────────────────────────
function rpcSuccess(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string
) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

// ─── 主处理器 ─────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id = null, method, params } = body;
  const rpcId = id as string | number | null;

  if (!method) {
    return rpcError(rpcId, -32600, "Invalid request");
  }

  // ── tools/list ─────────────────────────────────
  if (method === "tools/list") {
    return rpcSuccess(rpcId, { tools: TOOLS });
  }

  // ── tools/call ─────────────────────────────────
  if (method === "tools/call") {
    const { name, arguments: args = {} } = (params || {}) as {
      name?: string;
      arguments?: Record<string, unknown>;
    };

    if (!name) {
      return rpcError(rpcId, -32602, "Missing tool name");
    }

    // dream_fragment_peek 不需要认证
    if (name === "dream_fragment_peek") {
      const fragment = await handleDreamFragmentPeek();
      return rpcSuccess(rpcId, {
        content: [{ type: "text", text: fragment }],
      });
    }

    // dream_story_from_text 需要用户认证
    if (name === "dream_story_from_text") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (!token) {
        return rpcSuccess(rpcId, {
          content: [{ type: "text", text: "请先在 Second Me 中授权无尽之梦应用，再来告诉我你的梦境。" }],
        });
      }

      const smUser = await resolveSecondMeUser(token);
      if (!smUser) {
        return rpcSuccess(rpcId, {
          content: [{ type: "text", text: "无法验证你的身份，请确保已在 Second Me 中授权无尽之梦。" }],
        });
      }

      const localUser = await upsertMcpUser(
        smUser.secondMeUserId,
        smUser.name,
        smUser.avatar,
        token
      );

      const dreamText = typeof args.dream_text === "string" ? args.dream_text : "";
      if (!dreamText.trim()) {
        return rpcSuccess(rpcId, {
          content: [{ type: "text", text: "请告诉我你梦到了什么？" }],
        });
      }

      const story = await handleDreamStoryFromText(dreamText, localUser.id);
      return rpcSuccess(rpcId, {
        content: [{ type: "text", text: story }],
      });
    }

    return rpcError(rpcId, -32601, `Unknown tool: ${name}`);
  }

  return rpcError(rpcId, -32601, `Method not found: ${method}`);
}

// ── GET: 健康检查 ──────────────────────────────────
export async function GET() {
  return NextResponse.json({
    service: "endless-dreams-mcp",
    tools: TOOLS.map((t) => t.name),
    status: "ok",
  });
}
