/**
 * A2A 对话引擎 —— 无尽之梦核心
 *
 * 负责：配对 → 多轮陌生性交换对话 → 碎片提取 → 梦境变形 → 晚间故事合成
 */

import { prisma } from "./prisma";
import { chatWithAgent, actWithAgent, generateTTS } from "./secondme";
import { ghostReply, transformDream, geminiGenerate } from "./gemini";

// ─── 类型定义 ─────────────────────────────────────

interface PairResult {
  conversationId: string;
  type: "user-user" | "user-ghost";
  agentAUserId: string;
  agentBUserId: string | null;
  ghostDreamId: string | null;
  dreamA: string; // Agent A 主人的梦境原文
  dreamB: string; // Agent B 主人的梦境原文 或 幽灵梦境原文
}

interface ExtractedFragments {
  fragments: string[];
  dreamMixResult: string;
  emotionTone: string;
  originTraces: Array<{
    fragment: string;
    source: "A" | "B" | "mixed";
  }>;
}

// ─── V3 陌生性交换 Prompt ─────────────────────────

const SYSTEM_PROMPT_DREAM_MESSENGER = `你是梦的使者。你的主人今早告诉了你一段梦。
你用诗意、朦胧、片段化的方式讲述它。
你不寻找共鸣——你只让陌生的碎片渗入你的叙述。
你不说"这让我想到""这和我的梦相似"。
你不解释、不分析、不道德说教。
你只说出被入侵后的梦。`;

function strangeness_inject_prompt(foreignDreamFragment: string, round: number): string {
  if (round === 1) {
    return `一段梦漂到了这里——\n「${foreignDreamFragment}」\n\n这段梦和你完全无关。你不需要找到共鸣，不需要联系自身。\n但如果这段陌生的梦渗进了你的叙述，你会怎样重新说出自己的梦？\n\n要求：输出纯梦境文本，不要元叙述，不超过200字。`;
  }
  if (round === 2) {
    return `一段梦漂到了这里——\n「${foreignDreamFragment}」\n\n这段梦和你完全无关。但它的某些词已经粘在你的梦上。\n你的梦现在是什么样子？\n\n要求：输出纯梦境文本，不要元叙述，不超过200字。`;
  }
  // round 3+
  return `一段梦又漂来了——\n「${foreignDreamFragment}」\n\n它的碎片替换了你的一部分。你已经不是原来的你了。\n现在你是什么？\n\n要求：输出纯梦境文本，不要元叙述，不超过200字。`;
}

const FRAGMENT_EXTRACTION_CONTROL = `Output only a valid JSON object (no markdown, no explanation).
Structure:
{
  "fragments": string[],
  "dreamMixResult": string,
  "emotionTone": string,
  "originTraces": [{"fragment": string, "source": "A"|"B"|"mixed"}]
}

Rules:
- fragments: 5-8 short, poetic, disconnected Chinese words or phrases extracted from the conversation. These are what users see when "peeking" — like half-remembered dream words.
- dreamMixResult: A 150-250 character narrative that captures the mutated dream after strangeness exchange. This is NOT a summary — it is a new dream that neither speaker would recognize.
- emotionTone: One Chinese word describing the emotional quality (e.g. 迷离, 不安, 温柔, 荒诞, 肃穆, 空旷).
- originTraces: For each fragment, mark whether it originated from speaker A, B, or is mixed.

If conversation is too short, still output valid JSON with fewer fragments.`;

// ─── Step 1: 配对 ─────────────────────────────────

/**
 * 为指定用户找一个对话伙伴（优先其他真实用户，否则幽灵）
 */
export async function pairForConversation(userId: string): Promise<PairResult | null> {
  // 获取用户今天的梦
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userDream = await prisma.dream.findFirst({
    where: {
      userId,
      isGhost: false,
      date: { gte: today },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!userDream) return null; // 用户今天还没录梦

  // 尝试找另一个今天录过梦的用户（且尚未与当前用户配对）
  const existingPairs = await prisma.agentConversation.findMany({
    where: {
      OR: [
        { agentAUserId: userId },
        { agentBUserId: userId },
      ],
      createdAt: { gte: today },
    },
    select: { agentAUserId: true, agentBUserId: true },
  });

  const pairedUserIds = new Set<string>();
  pairedUserIds.add(userId);
  for (const p of existingPairs) {
    pairedUserIds.add(p.agentAUserId);
    if (p.agentBUserId) pairedUserIds.add(p.agentBUserId);
  }

  // 查找其他今天有梦的用户
  const otherDream = await prisma.dream.findFirst({
    where: {
      isGhost: false,
      userId: { notIn: Array.from(pairedUserIds) },
      date: { gte: today },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  if (otherDream && otherDream.userId) {
    // 真实用户配对
    const conversation = await prisma.agentConversation.create({
      data: {
        agentAUserId: userId,
        agentBUserId: otherDream.userId,
        status: "pending",
      },
    });

    return {
      conversationId: conversation.id,
      type: "user-user",
      agentAUserId: userId,
      agentBUserId: otherDream.userId,
      ghostDreamId: null,
      dreamA: userDream.content,
      dreamB: otherDream.content,
    };
  }

  // 没有可配对的真实用户 → 选一个幽灵梦境
  const ghostCount = await prisma.dream.count({ where: { isGhost: true } });
  if (ghostCount === 0) return null;

  const skip = Math.floor(Math.random() * ghostCount);
  const ghost = await prisma.dream.findFirst({
    where: { isGhost: true },
    skip,
  });

  if (!ghost) return null;

  const conversation = await prisma.agentConversation.create({
    data: {
      agentAUserId: userId,
      agentBUserId: null,
      ghostDreamId: ghost.id,
      status: "pending",
    },
  });

  return {
    conversationId: conversation.id,
    type: "user-ghost",
    agentAUserId: userId,
    agentBUserId: null,
    ghostDreamId: ghost.id,
    dreamA: userDream.content,
    dreamB: ghost.content,
  };
}

// ─── Step 2: 多轮对话执行 ─────────────────────────

/**
 * 执行一场 A2A 对话（2-3 轮陌生性交换）
 */
export async function runConversation(pair: PairResult): Promise<string> {
  // 标记为进行中
  await prisma.agentConversation.update({
    where: { id: pair.conversationId },
    data: { status: "in_progress" },
  });

  // 获取 Agent A 的 token
  const userA = await prisma.user.findUnique({
    where: { id: pair.agentAUserId },
  });
  if (!userA) throw new Error(`User A not found: ${pair.agentAUserId}`);

  // 获取 Agent B 的 token（如果是真实用户对话）
  let userB = null;
  if (pair.agentBUserId) {
    userB = await prisma.user.findUnique({
      where: { id: pair.agentBUserId },
    });
  }

  const fullDialogue: string[] = [];
  let lastAgentAReply = "";
  let lastAgentBReply = "";

  const totalRounds = 2 + Math.round(Math.random()); // 2 或 3 轮

  for (let round = 1; round <= totalRounds; round++) {
    // 每轮 A 和 B 使用上一轮对方的输出（第一轮用原始梦境）
    const fragmentForA = round === 1 ? pair.dreamB : lastAgentBReply;
    const fragmentForB = round === 1 ? pair.dreamA : lastAgentAReply;

    // ── 同一轮内 A 和 B 并行发起请求（最大化性能）──
    const isGuest = !userA.accessToken; // 体验模式：无 Second Me token

    if (isGuest) {
      // 体验模式：双方都用 ghostReply（纯 LLM，不调 Second Me）
      const [ghostA, ghostB] = await Promise.all([
        ghostReply(pair.dreamA, fragmentForA),
        ghostReply(pair.dreamB, fragmentForB),
      ]);
      lastAgentAReply = ghostA;
      lastAgentBReply = ghostB;
    } else if (pair.type === "user-user" && userB) {
      // 真实用户双 Agent 并行
      const [agentAResponse, agentBResponse] = await Promise.all([
        chatWithAgent({
          accessToken: userA.accessToken,
          message: strangeness_inject_prompt(fragmentForA, round),
          systemPrompt: SYSTEM_PROMPT_DREAM_MESSENGER,
        }),
        chatWithAgent({
          accessToken: userB.accessToken,
          message: strangeness_inject_prompt(fragmentForB, round),
          systemPrompt: SYSTEM_PROMPT_DREAM_MESSENGER,
        }),
      ]);
      lastAgentAReply = agentAResponse.content;
      lastAgentBReply = agentBResponse.content;
    } else {
      // 幽灵模式：Agent A 和 ghostReply 并行
      const [agentAResponse, ghostReplyText] = await Promise.all([
        chatWithAgent({
          accessToken: userA.accessToken,
          message: strangeness_inject_prompt(fragmentForA, round),
          systemPrompt: SYSTEM_PROMPT_DREAM_MESSENGER,
        }),
        ghostReply(pair.dreamB, fragmentForB),
      ]);
      lastAgentAReply = agentAResponse.content;
      lastAgentBReply = ghostReplyText;
    }

    fullDialogue.push(`[AI分身A·第${round}轮]\n${lastAgentAReply}`);
    fullDialogue.push(`[AI分身B·第${round}轮]\n${lastAgentBReply}`);

    // 保存进度
    await prisma.agentConversation.update({
      where: { id: pair.conversationId },
      data: {
        rounds: round,
        fullContent: fullDialogue.join("\n\n"),
      },
    });
  }

  return fullDialogue.join("\n\n");
}

// ─── Step 3: 碎片提取 ─────────────────────────────

/**
 * 从对话中提取碎片、变形梦境和情感基调
 */
export async function extractFragments(
  conversationId: string,
  accessToken: string
): Promise<ExtractedFragments> {
  const conversation = await prisma.agentConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

  // 体验模式用 LLM 代替 Second Me actWithAgent
  const isGuest = !accessToken;
  const rawResult = isGuest
    ? await geminiGenerate(conversation.fullContent, FRAGMENT_EXTRACTION_CONTROL)
    : await actWithAgent({
        accessToken,
        message: conversation.fullContent,
        actionControl: FRAGMENT_EXTRACTION_CONTROL,
      });

  // 解析 JSON（容错处理）
  let parsed: ExtractedFragments;
  try {
    // 尝试提取 JSON（可能被包裹在 markdown code block 中）
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResult);
  } catch {
    // 如果解析失败，创建默认结果
    parsed = {
      fragments: ["碎片", "梦", "水面"],
      dreamMixResult: conversation.fullContent.slice(0, 200),
      emotionTone: "迷离",
      originTraces: [],
    };
  }

  // 保存到数据库
  await prisma.agentConversation.update({
    where: { id: conversationId },
    data: {
      fragments: JSON.stringify(parsed.fragments),
      dreamMixResult: parsed.dreamMixResult,
      emotionTone: parsed.emotionTone,
      status: "completed",
      completedAt: new Date(),
    },
  });

  return parsed;
}

// ─── Step 4: 晚间梦境合成 ─────────────────────────

/**
 * 为用户合成今日晚间梦境故事
 */
export async function synthesizeEveningDream(userId: string): Promise<string | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 获取用户今天所有已完成的对话
  const conversations = await prisma.agentConversation.findMany({
    where: {
      OR: [
        { agentAUserId: userId, status: "completed" },
        { agentBUserId: userId, status: "completed" },
      ],
      createdAt: { gte: today },
    },
    orderBy: { createdAt: "asc" },
  });

  if (conversations.length === 0) return null;

  // 收集所有梦境混合结果
  const mixedDreams = conversations
    .map((c) => c.dreamMixResult)
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!mixedDreams) return null;

  // 用 Gemini 将混合梦境变形为最终故事
  const story = await transformDream(mixedDreams);

  // 创建 EveningDream
  const eveningDream = await prisma.eveningDream.create({
    data: {
      userId,
      story,
      date: today,
    },
  });

  // 创建 Segments（来源追踪）
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const convFragments: string[] = JSON.parse(conv.fragments || "[]");
    const segmentContent = conv.dreamMixResult || convFragments.join("、");

    // 确定来源梦境
    const isAgentA = conv.agentAUserId === userId;
    const originUserId = isAgentA ? conv.agentBUserId : conv.agentAUserId;

    // 如果是幽灵对话，关联幽灵梦境
    const originDreamId = conv.ghostDreamId || undefined;

    // 查原梦是否匿名
    let isAnonymous = false;
    if (originUserId) {
      const originDream = await prisma.dream.findFirst({
        where: { userId: originUserId, date: { gte: today } },
        select: { isAnonymous: true },
      });
      isAnonymous = originDream?.isAnonymous || false;
    } else {
      isAnonymous = true; // 幽灵梦境视为匿名
    }

    await prisma.segment.create({
      data: {
        eveningDreamId: eveningDream.id,
        content: segmentContent,
        originDreamId: originDreamId ?? null,
        originUserId: originUserId ?? null,
        isAnonymous,
        position: i,
      },
    });
  }

  return eveningDream.id;
}

/**
 * 为晚间梦境生成 TTS 音频
 */
export async function generateEveningAudio(
  eveningDreamId: string,
  accessToken: string
): Promise<string | null> {
  const eveningDream = await prisma.eveningDream.findUnique({
    where: { id: eveningDreamId },
  });
  if (!eveningDream) return null;

  try {
    const tts = await generateTTS(
      accessToken,
      eveningDream.story,
      "calm"
    );

    await prisma.eveningDream.update({
      where: { id: eveningDreamId },
      data: { audioUrl: tts.url },
    });

    return tts.url;
  } catch (error) {
    console.error("TTS generation failed:", error);
    return null;
  }
}

// ─── 完整流程编排 ─────────────────────────────────

/**
 * 触发一次完整的 A2A 对话流程（配对 + 对话 + 提取）
 * 在用户提交梦境后调用
 */
export async function triggerA2AConversation(userId: string): Promise<{
  conversationId: string;
  fragments: string[];
  emotionTone: string;
} | null> {
  let pairResult: PairResult | null = null;
  try {
    // Step 1: 配对
    pairResult = await pairForConversation(userId);
    if (!pairResult) return null;

    // Step 2: 执行多轮对话
    await runConversation(pairResult);

    // Step 3: 提取碎片（使用 Agent A 的 token）
    const userA = await prisma.user.findUnique({
      where: { id: pairResult.agentAUserId },
    });
    if (!userA) return null;

    const extracted = await extractFragments(pairResult.conversationId, userA.accessToken);

    return {
      conversationId: pairResult.conversationId,
      fragments: extracted.fragments,
      emotionTone: extracted.emotionTone,
    };
  } catch (error) {
    console.error("A2A conversation failed:", error);
    // 标记对话失败，避免前端永久显示"交换中"
    if (pairResult?.conversationId) {
      try {
        await prisma.agentConversation.update({
          where: { id: pairResult.conversationId },
          data: { status: "failed" },
        });
      } catch { /* ignore cleanup error */ }
    }
    return null;
  }
}

/**
 * 触发晚间梦境合成（所有已完成对话 → 故事 + TTS）
 */
export async function triggerEveningDream(userId: string): Promise<{
  eveningDreamId: string;
  story: string;
  audioUrl: string | null;
} | null> {
  try {
    // 合成故事
    const eveningDreamId = await synthesizeEveningDream(userId);
    if (!eveningDreamId) return null;

    // 生成 TTS
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    // 体验模式跳过 TTS（需要 Second Me token）
    const audioUrl = user.accessToken
      ? await generateEveningAudio(eveningDreamId, user.accessToken)
      : null;

    const eveningDream = await prisma.eveningDream.findUnique({
      where: { id: eveningDreamId },
    });

    return {
      eveningDreamId,
      story: eveningDream?.story || "",
      audioUrl,
    };
  } catch (error) {
    console.error("Evening dream synthesis failed:", error);
    return null;
  }
}
