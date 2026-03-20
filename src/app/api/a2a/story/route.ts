import { NextRequest } from "next/server";
import { getSessionUser } from "@/app/api/auth/session/route";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * GET /api/a2a/story
 * 流式生成换梦童话故事（SSE）
 * 从用户今天的梦 + 一个随机幽灵梦 编织一个短故事
 */
export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "未登录" }), { status: 401 });
  }

  // 获取用户今天的梦
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userDream = await prisma.dream.findFirst({
    where: { userId: user.id, isGhost: false, date: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { content: true },
  });

  if (!userDream) {
    return new Response(
      `data: __NO_DREAM__\n\n`,
      { headers: sseHeaders() }
    );
  }

  // 随机选一个幽灵梦
  const ghostCount = await prisma.dream.count({ where: { isGhost: true } });
  let otherDream = "一个陌生人的梦，关于一扇永远打不开的门。";
  if (ghostCount > 0) {
    const skip = Math.floor(Math.random() * ghostCount);
    const ghost = await prisma.dream.findFirst({
      where: { isGhost: true },
      skip,
      select: { content: true },
    });
    if (ghost) otherDream = ghost.content;
  }

  const userDreamSnippet = userDream.content.slice(0, 600);
  const otherDreamSnippet = otherDream.slice(0, 600);

  const prompt = `【梦A：你的梦】\n${userDreamSnippet}\n\n【梦B：陌生人的梦】\n${otherDreamSnippet}`;
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

  // 尝试流式输出（Gemini streaming 或 ARK streaming）
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      if (process.env.ARK_API_KEY && process.env.ARK_MODEL_ID) {
        // 火山引擎 streaming
        const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.ARK_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.ARK_MODEL_ID,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            temperature: 0.9,
            max_tokens: 1024,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) throw new Error(`ARK error ${res.status}`);

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const text: string = json.choices?.[0]?.delta?.content ?? "";
              if (text) {
                await writer.write(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } else {
        // Gemini streaming
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction,
          generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
        });
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await writer.write(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
          }
        }
      }

      await writer.write(encoder.encode(`data: __DONE__\n\n`));
    } catch (err) {
      console.error("Story stream error:", err);
      await writer.write(encoder.encode(`data: __ERROR__\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, { headers: sseHeaders() });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}
