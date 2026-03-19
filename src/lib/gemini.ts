/**
 * LLM 调用层 —— 支持 Gemini 和火山引擎（豆包）双后端
 *
 * 优先使用火山引擎（ARK_API_KEY + ARK_MODEL_ID）
 * 回退使用 Gemini（GEMINI_API_KEY）
 */

// ─── 火山引擎 fetch 实现 ──────────────────────────

async function arkGenerate(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.ARK_API_KEY!;
  const model = process.env.ARK_MODEL_ID!; // 例如: ep-20250320xxxxxx-xxxxx

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ARK API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

// ─── Gemini 实现 ───────────────────────────────────

async function geminiGenerateInternal(prompt: string, systemInstruction?: string): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── 统一入口 ─────────────────────────────────────

/** 根据环境变量选择后端 */
export async function geminiGenerate(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  if (process.env.ARK_API_KEY && process.env.ARK_MODEL_ID) {
    return arkGenerate(prompt, systemInstruction);
  }
  return geminiGenerateInternal(prompt, systemInstruction);
}

/** 安全级别检查 */
export async function checkSafety(text: string): Promise<"safe" | "mild" | "needs_review"> {
  const result = await geminiGenerate(
    text,
    `你是一个内容安全审核员。判断以下梦境文本的安全级别：
safe: 无敏感内容，可直接发布。
mild: 含有轻度暴力/不适意象，需加模糊化处理。
needs_review: 含自杀/自残/性暴力等描写，需人工审核或拒绝发布。
只输出一个词：safe / mild / needs_review`
  );

  const level = result.trim().toLowerCase();
  if (level === "mild" || level === "needs_review") return level;
  return "safe";
}

/** 幽灵梦境的回话（V3 —— 吸收陌生碎片后变形） */
export async function ghostReply(
  ghostContent: string,
  agentMessage: string
): Promise<string> {
  return geminiGenerate(
    `【幽灵梦境原文】\n${ghostContent}\n\n【陌生人对你说的话】\n${agentMessage}`,
    `你是一段无人认领的梦。一个陌生人刚刚对你说了一段话（附在下方）。

你不需要回应他。你需要被他入侵。

从他的话语中，选取一个你从未拥有过的碎片——一种质感、一个地点、一种时间感。
让那个碎片替换掉你自身的某个部分。你因此变形，不再是原来的你。

输出：变形后的你（纯梦境文本，无标题，无元叙述）。长度与你原来的长度接近。`
  );
}

/** 梦境变形（V3 —— 记忆偏移式变形，保留原梦骨架） */
export async function transformDream(originalDream: string): Promise<string> {
  return geminiGenerate(
    originalDream,
    `你收到了一段经过对话交换后的梦境混合文本。请将它改写成一个完整的、可读的梦境故事。

改写规则：
1. 保留原文中的核心剧情脉络——人物做了什么、去了哪里、遇到了什么。不要丢弃主线。
2. 保留原文中的具体意象（地点、物体、声音、颜色），但让其中1-2个细节发生微妙的偏移——比如颜色变了、大小倒转、方向相反。
3. 用具体的、有画面感的叙事——不要写抽象的感受描述，要写"看到了什么""手碰到了什么""听到了什么声音"。
4. 让故事有起承转合，有一个清晰的场景和氛围。读起来像一段真实的梦境记录。
5. 长度控制在200-400字之间。一定要写完整，不要中途截断。
6. 如果原文中包含多段梦境混合体，将它们融合成一个连贯的故事，而不是罗列。

严格禁止：
- 不要解释你做了什么。
- 不要加"这是一个关于……的梦"之类的元叙述。
- 不要输出抽象的哲学感悟，只输出梦的叙事。
- 不要输出敏感内容。

输出格式：纯文本，无标题，无标注。确保故事完整。`
  );
}

/** 提取 content_short（碎片预览） */
export async function extractContentShort(content: string): Promise<string> {
  return geminiGenerate(
    content,
    `从以下梦境文本中，提取最具视觉冲击力的1-2个句子，作为"梦的碎片预览"。

规则：
- 选原文中已有的句子，不要改写。
- 优先选含有具体意象的句子（物体/颜色/动作/声音）。
- 长度不超过100字。
- 如果全文都是意象密集的，选第一个出现的。
- 禁止选含真实人名或敏感内容的句子。`
  );
}
