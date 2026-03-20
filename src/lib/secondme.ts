// Second Me API 客户端
// Base URL & 所有端点封装

const API_BASE = process.env.SECONDME_API_BASE || "https://api.mindverse.com/gate/lab";

// ─── 类型定义 ───────────────────────────────────

export interface SecondMeTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string[];
}

export interface SecondMeUserInfo {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  selfIntroduction?: string;
}

export interface SecondMeTTSResponse {
  url: string;
  durationMs: number;
  sampleRate: number;
  format: string;
}

// ─── OAuth ──────────────────────────────────────

/** 生成 OAuth 授权 URL */
export function getOAuthURL(redirectUri: string, state: string): string {
  const oauthBase = process.env.SECONDME_OAUTH_URL || "https://go.second.me/oauth/";
  const params = new URLSearchParams({
    client_id: process.env.SECONDME_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${oauthBase}?${params.toString()}`;
}

/** 用 authorization code 换 token */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<SecondMeTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.SECONDME_CLIENT_ID!,
    client_secret: process.env.SECONDME_CLIENT_SECRET!,
  });

  const res = await fetch(`${API_BASE}/api/oauth/token/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();
  if (json.code !== 0) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  return json.data;
}

/** 刷新 access token */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SecondMeTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.SECONDME_CLIENT_ID!,
    client_secret: process.env.SECONDME_CLIENT_SECRET!,
  });

  const res = await fetch(`${API_BASE}/api/oauth/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json();
  if (json.code !== 0) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);
  return json.data;
}

// ─── User API ───────────────────────────────────

/** 获取用户信息 */
export async function getUserInfo(accessToken: string): Promise<SecondMeUserInfo> {
  const res = await fetch(`${API_BASE}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`Get user info failed: ${JSON.stringify(json)}`);
  return json.data;
}

// ─── Chat API (A2A 核心) ────────────────────────

export interface ChatStreamOptions {
  accessToken: string;
  message: string;
  sessionId?: string;
  systemPrompt?: string;
  model?: string;
}

/** 流式调用 Agent Chat，返回完整文本 */
export async function chatWithAgent(opts: ChatStreamOptions): Promise<{
  content: string;
  sessionId: string;
}> {
  const res = await fetch(`${API_BASE}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: opts.message,
      sessionId: opts.sessionId,
      model: opts.model || "google_ai_studio/gemini-2.0-flash",
      systemPrompt: opts.systemPrompt,
      enableWebSearch: false,
    }),
  });

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let content = "";
  let sessionId = opts.sessionId || "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("event: session")) continue;

      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          // session event
          if (parsed.sessionId) {
            sessionId = parsed.sessionId;
            continue;
          }
          // content delta
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) content += delta;
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  return { content, sessionId };
}

// ─── Act API (结构化提取) ───────────────────────

export interface ActStreamOptions {
  accessToken: string;
  message: string;
  actionControl: string;
  sessionId?: string;
  systemPrompt?: string;
}

/** 流式调用 Act API，返回完整 JSON 文本 */
export async function actWithAgent(opts: ActStreamOptions): Promise<string> {
  const res = await fetch(`${API_BASE}/api/secondme/act/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: opts.message,
      actionControl: opts.actionControl,
      sessionId: opts.sessionId,
      systemPrompt: opts.systemPrompt,
    }),
  });

  if (!res.ok) throw new Error(`Act API error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) result += delta;
        } catch {
          // skip
        }
      }
    }
  }

  return result;
}

// ─── Agent Memory ───────────────────────────────

export async function ingestDreamMemory(
  accessToken: string,
  dreamId: string,
  contentPreview: string,
  importance: number = 0.8
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/secondme/agent_memory/ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: { kind: "thread" },
      action: "dream_recorded",
      actionLabel: "记录了一个梦境",
      displayText: "用户在破梦 DreamBreak 中记录了一段梦境",
      refs: [
        {
          objectType: "dream",
          objectId: dreamId,
          contentPreview,
        },
      ],
      importance,
      idempotencyKey: `dream_${dreamId}`,
    }),
  });

  const json = await res.json();
  if (json.code !== 0) throw new Error(`Memory ingest failed: ${JSON.stringify(json)}`);
}

// ─── TTS ────────────────────────────────────────

export async function generateTTS(
  accessToken: string,
  text: string,
  emotion: string = "calm"
): Promise<SecondMeTTSResponse> {
  const res = await fetch(`${API_BASE}/api/secondme/tts/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, emotion }),
  });

  const json = await res.json();
  if (json.code !== 0) throw new Error(`TTS failed: ${JSON.stringify(json)}`);
  return json.data;
}
