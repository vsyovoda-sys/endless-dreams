"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PixelCat } from "@/components/PixelCat";

interface Conversation {
  id: string;
  fragments: string[];
  emotionTone: string | null;
  status: string;
  rounds: number;
  createdAt: string;
  partner: { id: string; name: string; avatar: string | null } | null;
  isGhostConversation: boolean;
}

/* 静态星星位置 */
const STARS = [
  { x: 10, y: 8, d: 0 }, { x: 28, y: 20, d: 1.2 }, { x: 45, y: 6, d: 0.5 },
  { x: 62, y: 25, d: 1.8 }, { x: 80, y: 11, d: 0.3 }, { x: 91, y: 30, d: 2.1 },
  { x: 18, y: 45, d: 0.9 }, { x: 55, y: 38, d: 1.5 }, { x: 76, y: 50, d: 0.2 },
  { x: 34, y: 62, d: 2.4 }, { x: 88, y: 68, d: 1.0 },
];

type StoryStatus = "idle" | "streaming" | "done" | "no_dream" | "error";

export default function PeekPage() {
  // ── 新：streaming 故事 ──
  const [storyText, setStoryText] = useState("");
  const [storyStatus, setStoryStatus] = useState<StoryStatus>("idle");
  const [isGhost, setIsGhost] = useState(true);
  const storyBoxRef = useRef<HTMLDivElement>(null);

  // ── 旧：背景 A2A 碎片（次要展示）──
  const [fragments, setFragments] = useState<string[]>([]);
  const [emotionTone, setEmotionTone] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const router = useRouter();

  // ── 开始 streaming 故事 ──
  const startStoryStream = useCallback(async () => {
    setStoryStatus("streaming");
    setStoryText("");
    try {
      const res = await fetch("/api/a2a/story");
      if (res.status === 401) { router.push("/"); return; }
      if (!res.ok || !res.body) { setStoryStatus("error"); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "__DONE__") {
            setStoryStatus("done");
          } else if (data === "__ERROR__") {
            setStoryStatus("error");
          } else if (data === "__NO_DREAM__") {
            setStoryStatus("no_dream");
          } else {
            try {
              const text = JSON.parse(data) as string;
              setStoryText((prev) => prev + text);
              if (storyBoxRef.current) {
                storyBoxRef.current.scrollTop = storyBoxRef.current.scrollHeight;
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setStoryStatus("error");
    }
  }, [router]);

  // ── 获取背景 A2A 碎片（次要）──
  const fetchConversations = useCallback(() => {
    fetch("/api/conversations")
      .then((res) => {
        if (res.status === 401) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setConversations(data.conversations ?? []);
        const conv: Conversation | undefined = data.conversations?.[0];
        if (conv?.status === "completed") {
          setFragments(conv.fragments ?? []);
          setEmotionTone(conv.emotionTone);
          setIsGhost(conv.isGhostConversation);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    startStoryStream();
    fetchConversations();
    // Also trigger A2A in background for historical fragments
    fetch("/api/a2a/trigger", { method: "POST" }).catch(() => {});
  }, [startStoryStream, fetchConversations]);

  // 故事完成后，逐个浮出碎片词
  useEffect(() => {
    if (storyStatus !== "done" || fragments.length === 0) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setRevealedCount(idx);
      if (idx >= fragments.length) clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, [storyStatus, fragments.length]);

  async function handleRetry() {
    setRevealedCount(0);
    await startStoryStream();
  }

  return (
    <main
      className="flex-1 flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #0a0820 0%, #12083a 40%, #0d0628 70%, #07070f 100%)" }}
    >
      {/* 全屏星空 + 浮岛光晕 */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-star-twinkle"
            style={{
              width: 2,
              height: 2,
              left: `${s.x}%`,
              top: `${s.y}%`,
              background: i % 2 === 0 ? "rgba(196,181,253,0.8)" : "rgba(147,197,253,0.6)",
              animationDelay: `${s.d}s`,
              animationDuration: `${2.5 + (i % 3)}s`,
            }}
          />
        ))}
        <div className="absolute top-[25%] left-[15%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(75,0,130,0.25)" }} />
        <div className="absolute top-[45%] right-[10%] h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgba(30,60,150,0.15)" }} />
      </div>

      {storyStatus === "no_dream" ? (
        /* ── 没录梦 ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.3))" }}>
            <PixelCat size={96} sleeping />
          </div>
          <p className="text-sm text-center" style={{ color: "#8a70b0" }}>
            先把今天的梦告诉我<br />分身才能出去交换故事
          </p>
          <button
            onClick={() => router.push("/dream")}
            className="rounded-2xl px-7 py-2.5 text-sm text-white transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
          >
            去录梦
          </button>
        </div>
      ) : (
        /* ── 主内容：故事流 ── */
        <div className="relative flex-1 flex flex-col pb-20">

          {/* 顶部状态条 + 情绪基调 */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-10 pb-2">
            <span className="text-[10px]" style={{ color: "#7a6aa0" }}>
              {storyStatus === "streaming" ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#a855f7" }} />
                  正在编织…
                </span>
              ) : storyStatus === "done" ? "故事已完成" : storyStatus === "error" ? "连接失败" : ""}
            </span>
            {emotionTone && (
              <span className="text-[10px] italic" style={{ color: "#a78bfa" }}>{emotionTone}</span>
            )}
            {storyStatus !== "streaming" && storyStatus !== "idle" && (
              <button onClick={handleRetry} className="text-[10px]" style={{ color: "#7c3aed" }}>
                再换一个
              </button>
            )}
          </div>

          {/* 故事文字区（滚动） */}
          <div ref={storyBoxRef} className="relative z-10 flex-1 overflow-y-auto px-5 py-2">

            {/* 初始加载：双猫通信动画 */}
            {(storyStatus === "streaming" || storyStatus === "idle") && !storyText && (
              <div className="flex flex-col items-center gap-5 pt-10">
                <div className="relative flex items-center gap-4">
                  <div className="animate-cat-purr" style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))" }}>
                    <PixelCat size={52} flipped glowing />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: "rgba(168,85,247,0.6)",
                          animation: "typing-dot 1.2s ease-in-out infinite",
                          animationDelay: `${d * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="animate-cat-purr"
                    style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))", animationDelay: "0.6s" }}
                  >
                    <PixelCat size={52} glowing />
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#a78bfa" }}>两个梦正在相遇…</p>
              </div>
            )}

            {/* 故事正文 */}
            {storyText && (
              <div
                className="rounded-2xl px-5 py-5 animate-fade-in"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <p
                  className="text-sm leading-loose whitespace-pre-wrap"
                  style={{ color: "#d4c4e8", fontFamily: "serif" }}
                >
                  {storyText}
                  {storyStatus === "streaming" && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                      style={{ background: "#a855f7" }}
                    />
                  )}
                </p>
              </div>
            )}

            {/* 故事完成后的揭示文字 */}
            {storyStatus === "done" && storyText && (
              <div className="mt-4 text-center animate-fade-in">
                <p className="text-xs italic" style={{ color: "#a78bfa" }}>
                  你的梦遇见了{isGhost ? "索拉里斯" : "另一个梦者"}的梦
                </p>
              </div>
            )}

            {/* 碎片关键词（次要，故事完成后才浮出）*/}
            {storyStatus === "done" && fragments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center animate-fade-in">
                {fragments.slice(0, revealedCount).map((frag, i) => (
                  <span
                    key={i}
                    className="dream-bubble"
                    style={{ animation: `bubble-pop 0.4s ease ${i * 0.1}s both` }}
                  >
                    {frag}
                  </span>
                ))}
              </div>
            )}

            {/* 错误态 */}
            {storyStatus === "error" && (
              <div className="flex flex-col items-center gap-4 pt-10">
                <PixelCat size={72} sleeping />
                <p className="text-xs" style={{ color: "#c05a6a" }}>这次连接出了点问题</p>
                <button
                  onClick={handleRetry}
                  className="rounded-2xl px-5 py-2 text-xs text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  重试
                </button>
              </div>
            )}
          </div>

          {/* 底部：两只猫 + 入梦按钮（故事完成后才显示）*/}
          {storyStatus === "done" && (
            <div className="relative z-10 flex items-end justify-between px-8 pb-4 animate-fade-in">
              {/* 地面线 */}
              <div
                className="absolute bottom-[3.75rem] inset-x-0 h-px"
                style={{ background: "linear-gradient(to right, transparent, rgba(168,85,247,0.3) 30%, rgba(168,85,247,0.3) 70%, transparent)" }}
              />
              <div className="flex flex-col items-center gap-1">
                <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.3))" }}>
                  <PixelCat size={64} flipped />
                </div>
                <span className="text-[9px]" style={{ color: "#8a70b0" }}>你的梦</span>
              </div>
              <button
                onClick={() => router.push("/evening")}
                className="rounded-2xl px-5 py-2.5 text-xs text-white transition-all hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 16px rgba(168,85,247,0.35)" }}
              >
                ✨ 去入梦
              </button>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="animate-cat-idle"
                  style={{
                    animationDelay: "0.5s",
                    filter: isGhost
                      ? "drop-shadow(0 0 6px rgba(255,215,0,0.3))"
                      : "drop-shadow(0 0 6px rgba(139,92,246,0.3))",
                  }}
                >
                  <PixelCat size={64} />
                </div>
                <span className="text-[9px]" style={{ color: "#8a70b0" }}>
                  {isGhost ? "索拉里斯" : "另一个梦者"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={() => router.push("/dream")}>🌙 录梦</button>
        <span className="active">🐾 换梦</span>
        <button onClick={() => router.push("/evening")}>✨ 入梦</button>
      </nav>
    </main>
  );
}
