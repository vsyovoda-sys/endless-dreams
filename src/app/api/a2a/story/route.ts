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

  const prompt = `【梦A：你的梦】\n${userDreamSnippet}\n\n【梦B：TA的梦】\n${otherDreamSnippet}`;
  const systemInstruction = `你是一个梦境童话作者。两个陌生人的梦在夜里相遇了。

从这两个梦里各取1-2个具体的元素（一个地点、一个物件、一种颜色、一个动作），
把这些元素编进同一个故事里，让它们在故事中相遇。

要求：
- 有具体的地点（不要用"某处"，要说清楚是哪里，比如：一条走廊、一个铁皮摊位、空荡荡的候车厅）
- 有具体的动作（两个陌生人如何在故事里接触：递了什么、追了什么、错过了什么）
- 带一点童话感：有点奇异，但又像是可能真实发生的
- 简洁。200字以内。
- 故事要完整，有开头有结尾
- 结尾用一句话点出"相遇"的意义，但不要说教

输出格式：纯文本，只输出故事，不要任何标题或标注。`;

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
