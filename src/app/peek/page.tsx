"use client";

import { useEffect, useState, useCallback } from "react";
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

/* 稳定的随机偏移（避免每次渲染变化） */
function stableX(convId: string, idx: number): number {
  let h = 0;
  const k = `${convId}-${idx}`;
  for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 60) - 30); // -30 ~ +30 px
}

/* 稳定的浮动参数（各气泡独立节奏） */
function stableFloat(convId: string, idx: number): { dur: number; delay: number } {
  let h = 0;
  const k = `${convId}-fd-${idx}`;
  for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0;
  const abs = Math.abs(h);
  return {
    dur:   2.2 + (abs % 14) / 10,       // 2.2 ~ 3.6s
    delay: (abs >> 6) % 20 / 10,        // 0 ~ 2.0s
  };
}

/* 静态星星位置 */
const STARS = [
  { x: 10, y: 8, d: 0 }, { x: 28, y: 20, d: 1.2 }, { x: 45, y: 6, d: 0.5 },
  { x: 62, y: 25, d: 1.8 }, { x: 80, y: 11, d: 0.3 }, { x: 91, y: 30, d: 2.1 },
  { x: 18, y: 45, d: 0.9 }, { x: 55, y: 38, d: 1.5 }, { x: 76, y: 50, d: 0.2 },
  { x: 34, y: 62, d: 2.4 }, { x: 88, y: 68, d: 1.0 },
];

export default function PeekPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [revealedCount, setRevealedCount] = useState<Record<string, number>>({});
  const router = useRouter();

  const fetchConversations = useCallback(() => {
    fetch("/api/conversations")
      .then((res) => {
        if (res.status === 401) { router.push("/"); return null; }
        return res.json();
      })
      .then((data) => { if (data) setConversations(data.conversations); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchConversations();
    // 30 秒基础轮询
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // 当有 in_progress 对话时，加速轮询（5 秒）直到完成
  useEffect(() => {
    const hasActive = conversations.some((c) => c.status === "in_progress");
    if (!hasActive) return;
    const fast = setInterval(fetchConversations, 5000);
    return () => clearInterval(fast);
  }, [conversations, fetchConversations]);

  /* 关键词逐个浮出 */
  useEffect(() => {
    if (conversations.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const conv of conversations) {
      if (conv.status !== "completed") continue;
      const total = conv.fragments.length;
      if ((revealedCount[conv.id] ?? 0) >= total) continue;
      for (let i = 0; i < total; i++) {
        timers.push(setTimeout(() => {
          setRevealedCount((prev) => ({ ...prev, [conv.id]: Math.max(prev[conv.id] ?? 0, i + 1) }));
        }, i * 900));
      }
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch("/api/a2a/trigger", { method: "POST" });
      if (res.ok) setTimeout(fetchConversations, 2000);
    } finally {
      setTriggering(false);
    }
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
        {/* 双色光晕：紫+蓝（浮岛氛围） */}
        <div className="absolute top-[25%] left-[15%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(75,0,130,0.25)" }} />
        <div className="absolute top-[45%] right-[10%] h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgba(30,60,150,0.15)" }} />
        {/* 底部雾气 */}
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(13,8,32,0.6), transparent)" }} />
      </div>

      {loading ? (
        /* ── 加载态 ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 10px rgba(139,92,246,0.4))" }}>
            <PixelCat size={96} />
          </div>
          <p className="text-xs animate-pulse" style={{ color: "#7a6aa0" }}>听风吹草动…</p>
        </div>

      ) : conversations.length === 0 ? (
        /* ── 空态 ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.3))" }}>
            <PixelCat size={96} sleeping />
          </div>
          <p className="text-sm text-center" style={{ color: "#8a70b0" }}>
            AI分身还没出发<br />先去把梦说给它听
          </p>
          <button
            onClick={() => router.push("/dream")}
            className="rounded-2xl px-7 py-2.5 text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 4px 20px rgba(168,85,247,0.4)" }}
          >
            去录梦
          </button>
        </div>

      ) : (() => {
        /* 只显示最新一次对话 */
        const conv = conversations[0];
        const revealed = revealedCount[conv.id] ?? 0;
        const isActive = conv.status === "in_progress";
        const isFailed = conv.status === "failed";
        const partnerLabel = conv.isGhostConversation ? "索拉里斯" : (conv.partner?.name ?? "另一个梦者");

        return (
          <div className="relative flex-1 flex flex-col">
            {/* ── 顶部信息条 ── */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-10 pb-2">
              <span className="text-[10px]" style={{ color: "#7a6aa0" }}>
                {isFailed ? (
                  <span className="flex items-center gap-1.5" style={{ color: "#c05a6a" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    连接中断
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#a855f7" }} />
                    交换中
                  </span>
                ) : `${conv.rounds} 轮 · 已沉淀`}
              </span>
              {conv.emotionTone && (
                <span className="text-[10px] italic" style={{ color: "#a78bfa" }}>
                  {conv.emotionTone}
                </span>
              )}
              <div className="flex items-center gap-3">
                {!isActive && (
                  <button
                    onClick={() => router.push("/evening")}
                    className="text-[10px] transition-opacity"
                    style={{ color: "#a855f7" }}
                  >
                    入梦 →
                  </button>
                )}
                <button
                  onClick={handleTrigger}
                  disabled={triggering}
                  className="text-[10px] transition-opacity disabled:opacity-30"
                  style={{ color: "#7c3aed" }}
                >
                  {triggering ? "出发中…" : "再来一次"}
                </button>
              </div>
            </div>

            {/* ── 气泡场 ── */}
            <div className="relative flex-1 flex items-center justify-center px-6">
              {isActive ? (
                /* 正在交换：增强双猫通信动画 */
                <div className="flex flex-col items-center gap-5">
                  {/* 通信光束 */}
                  <div className="relative flex items-center gap-3">
                    <div className="animate-cat-purr" style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))" }}>
                      <PixelCat size={48} flipped glowing />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: "rgba(168,85,247,0.6)",
                            animation: "typing-dot 1.2s ease-in-out infinite",
                            animationDelay: `${d * 0.4}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="animate-cat-purr" style={{ filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5))", animationDelay: "0.6s" }}>
                      <PixelCat size={48} glowing />
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "#a78bfa" }}>两只猫正在呼噜交换…</p>
                  <p className="text-[10px]" style={{ color: "#6a5a8a" }}>可能需要30-60秒，请耐心等候</p>
                </div>
              ) : isFailed ? (
                /* 失败态 */
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 6px rgba(200,90,100,0.3))" }}>
                    <PixelCat size={72} sleeping />
                  </div>
                  <p className="text-xs" style={{ color: "#c05a6a" }}>这次连接失败了</p>
                  <button
                    onClick={handleTrigger}
                    disabled={triggering}
                    className="rounded-2xl px-5 py-2 text-xs text-white disabled:opacity-30 transition-all hover:scale-[1.03]"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                  >
                    {triggering ? "重试中…" : "重新连接"}
                  </button>
                </div>
              ) : (
                /* 已完成：气泡散落 */
                <div
                  className="relative w-full"
                  style={{ minHeight: 200 }}
                >
                  {conv.fragments.map((frag, i) => {
                    const show = i < revealed;
                    const fd = stableFloat(conv.id, i);
                    // 分散分布：奇偶行，水平随机
                    const row = Math.floor(i / 3);
                    const col = i % 3;
                    const leftPct = 8 + col * 30 + stableX(conv.id, i * 7) * 0.2;
                    const topPx = 10 + row * 52;
                    return (
                      <span
                        key={i}
                        className="bubble-float-wrap absolute"
                        style={{
                          left: `${leftPct}%`,
                          top: topPx,
                          opacity: show ? 1 : 0,
                          transition: "opacity 0.4s ease",
                          "--float-dur": `${fd.dur}s`,
                          "--float-delay": `${fd.delay}s`,
                        } as React.CSSProperties}
                      >
                        <span
                          className="dream-bubble"
                          style={{
                            animation: show
                              ? `bubble-pop 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.15}s both`
                              : "none",
                            animationDelay: show ? `${i * 0.15}s` : undefined,
                          }}
                        >
                          {frag}
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 两只猫 + 地面 ── */}
            <div className="relative z-10 flex items-end justify-between px-8 pb-24">
              {/* 地面线（发光渐变） */}
              <div
                className="absolute bottom-[5.5rem] inset-x-0 h-px"
                style={{ background: "linear-gradient(to right, transparent, rgba(168,85,247,0.35) 30%, rgba(168,85,247,0.35) 70%, transparent)" }}
              />

              {/* 左猫（你的AI分身，面朝右）+ 小气泡 */}
              <div className="flex flex-col items-center gap-1.5 relative">
                {isActive && (
                  <div className="absolute -top-8 right-0 animate-bubble-rise" style={{ animationDuration: "2.5s", animationIterationCount: "infinite" }}>
                    <span className="dream-bubble text-[10px]" style={{ padding: "2px 8px", fontSize: "10px" }}>💭</span>
                  </div>
                )}
                <div
                  className={isActive ? "animate-cat-purr" : "animate-cat-idle"}
                  style={{ filter: isActive ? "drop-shadow(0 0 14px rgba(139,92,246,0.6))" : "drop-shadow(0 0 6px rgba(139,92,246,0.2))" }}
                >
                  <PixelCat size={88} flipped glowing={isActive} />
                </div>
                <span className="text-[9px]" style={{ color: "#8a70b0" }}>你的梦</span>
              </div>

              {/* 中间地带：交换感觉提示 */}
              <div className="flex flex-col items-center gap-1 pb-6">
                {isActive && (
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-1 w-1 rounded-full animate-pulse"
                        style={{ background: "rgba(168,85,247,0.5)", animationDelay: `${i*0.3}s` }} />
                    ))}
                  </div>
                )}
                {!isActive && conv.fragments.length > 0 && (
                  <span className="text-[9px]" style={{ color: "#7a6aa0" }}>
                    {revealed}/{conv.fragments.length} 个词浮出
                  </span>
                )}
              </div>

              {/* 右猫（对方，面朝左）+ 小气泡 */}
              <div className="flex flex-col items-center gap-1.5 relative">
                {isActive && (
                  <div className="absolute -top-8 left-0 animate-bubble-rise" style={{ animationDuration: "3s", animationIterationCount: "infinite", animationDelay: "0.8s" }}>
                    <span className="dream-bubble text-[10px]" style={{ padding: "2px 8px", fontSize: "10px" }}>💭</span>
                  </div>
                )}
                <div
                  className={isActive ? "animate-cat-purr" : "animate-cat-idle"}
                  style={{
                    animationDelay: "0.6s",
                    filter: isActive
                      ? (conv.isGhostConversation ? "drop-shadow(0 0 14px rgba(255,215,0,0.5))" : "drop-shadow(0 0 14px rgba(139,92,246,0.6))")
                      : "drop-shadow(0 0 6px rgba(139,92,246,0.2))",
                  }}
                >
                  <PixelCat
                    size={88}
                    glowing={isActive && conv.isGhostConversation}
                  />
                </div>
                <span className="text-[9px]" style={{ color: "#8a70b0" }}>{partnerLabel}</span>
              </div>
            </div>

            {/* ── 玩法说明（折叠） ── */}
            <div className="absolute bottom-24 inset-x-0 flex justify-center z-10 pointer-events-none">
              <details className="pointer-events-auto" style={{ maxWidth: "80%" }}>
                <summary className="text-[10px] text-center cursor-pointer select-none list-none" style={{ color: "#7a6aa0" }}>
                  ▸ 这里在发生什么？
                </summary>
                <div
                  className="mt-2 rounded-2xl px-4 py-3 text-[11px] leading-relaxed space-y-1 animate-fade-in glass-card"
                >
                  <p style={{ color: "#b8a0d0" }}>两只黑猫各自带着主人的梦，在黑夜里相遇，用呼噜声交换彼此的碎片——不是寻找共鸣，而是让梦变异。浮出的词就是那些渗透的残留。</p>
                </div>
              </details>
            </div>
          </div>
        );
      })()}

      <nav className="bottom-nav">
        <button onClick={() => router.push("/dream")}>录梦</button>
        <span className="active">换梦</span>
        <button onClick={() => router.push("/evening")}>入梦</button>
      </nav>
    </main>
  );
}
