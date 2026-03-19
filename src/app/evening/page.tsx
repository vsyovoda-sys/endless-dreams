"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PixelCat } from "@/components/PixelCat";

interface Segment {
  id: string;
  content: string;
  isAnonymous: boolean;
  hasOrigin: boolean;
}

interface Origin {
  type: "anonymous" | "user" | "ghost";
  name?: string;
  avatar?: string;
  profileUrl?: string;
  message: string;
}

interface EveningData {
  id: string;
  story: string;
  audioUrl: string | null;
  segments: Segment[];
}

const STARS = [
  { x: "8%", y: "12%", r: 1 }, { x: "23%", y: "5%", r: 1.5 },
  { x: "41%", y: "9%", r: 1 }, { x: "67%", y: "4%", r: 1.5 },
  { x: "85%", y: "11%", r: 1 }, { x: "92%", y: "28%", r: 1 },
  { x: "4%", y: "35%", r: 1.5 }, { x: "78%", y: "44%", r: 1 },
  { x: "15%", y: "62%", r: 1 }, { x: "55%", y: "18%", r: 1.5 },
];

export default function EveningPage() {
  const [evening, setEvening] = useState<EveningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [revealedOrigins, setRevealedOrigins] = useState<Record<string, Origin>>({});
  const [revealing, setRevealing] = useState(false);
  const [dreamHistory, setDreamHistory] = useState<Array<{ id: string; contentShort: string; date: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  const fetchEvening = useCallback(() => {
    fetch("/api/evening")
      .then((res) => {
        if (res.status === 401) {
          router.push("/");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setEvening(data.evening);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchEvening();
    // 同时加载历史梦境
    fetch("/api/dreams")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.dreams) {
          setDreamHistory(data.dreams.slice(0, 10).map((d: { id: string; contentShort: string; date: string }) => ({
            id: d.id,
            contentShort: d.contentShort,
            date: d.date,
          })));
        }
      });
  }, [fetchEvening]);

  async function handleSynthesize() {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/evening", { method: "POST" });
      if (res.ok) {
        // 重新加载
        fetchEvening();
      } else {
        const data = await res.json();
        alert(data.message || "合成失败");
      }
    } finally {
      setSynthesizing(false);
    }
  }

  async function handleReveal(segmentId: string) {
    if (revealedOrigins[segmentId]) {
      setSelectedSegment(segmentId);
      return;
    }

    setRevealing(true);
    setSelectedSegment(segmentId);
    try {
      const res = await fetch(`/api/evening/reveal?segmentId=${segmentId}`);
      if (res.ok) {
        const data = await res.json();
        setRevealedOrigins((prev) => ({
          ...prev,
          [segmentId]: data.origin,
        }));
      }
    } finally {
      setRevealing(false);
    }
  }

  return (
    <main
      className="flex-1 flex flex-col items-center px-4 pb-24 pt-8 min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #2d0854 45%, #1a0a35 75%, #120820 100%)" }}
    >
      {/* 星空背景 + 金色星光 */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="animate-star-twinkle pointer-events-none fixed rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            background: i % 3 === 0 ? "rgba(255,215,0,0.8)" : i % 3 === 1 ? "rgba(196,181,253,0.7)" : "rgba(255,190,100,0.6)",
            animationDelay: `${i * 0.37}s`,
            opacity: 0.4,
          }}
        />
      ))}
      {/* 暮光光晕 */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute top-[15%] left-[20%] h-56 w-56 rounded-full blur-3xl"
          style={{ background: "rgba(75,0,130,0.35)" }} />
        <div className="absolute top-[40%] right-[15%] h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgba(180,100,40,0.15)" }} />
        <div className="absolute bottom-[20%] left-[40%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(100,40,180,0.2)" }} />
      </div>

      {/* 顶部猫 + 标题 */}
      <div className="relative z-10 w-full max-w-lg text-center mb-8 animate-fade-in-up">
        <div className="flex items-end justify-center gap-3 mb-4">
          <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 12px rgba(255,215,0,0.4))" }}>
            <PixelCat size={56} glowing />
          </div>
          <div className="text-left pb-1">
            <h1
              className="text-2xl font-bold leading-tight"
              style={{
                background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #e879f9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 2px 8px rgba(255,215,0,0.3))",
              }}
            >
              入梦
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#b8a0d0" }}>
              你的梦经过一天的旅行，已经不是你记得的样子
            </p>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative z-10 w-full max-w-lg space-y-6">
        {loading ? (
          <div className="text-center py-20 animate-fade-in flex flex-col items-center gap-4">
            <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 10px rgba(255,215,0,0.3))" }}>
              <PixelCat size={64} />
            </div>
            <p className="text-sm" style={{ color: "#b8a0d0" }}>梦在归途中…</p>
          </div>

        ) : !evening ? (
          <div className="text-center py-12 space-y-6 animate-fade-in flex flex-col items-center">
            <div className="animate-cat-idle" style={{ filter: "drop-shadow(0 0 10px rgba(255,215,0,0.25))" }}>
              <PixelCat size={80} sleeping />
            </div>
            <p className="text-sm" style={{ color: "#c4b0e0" }}>今天的梦还没有归来。</p>
            <p className="text-xs max-w-xs text-center" style={{ color: "#8a70b0" }}>
              先去换梦，让两只猫交换彼此的碎片，再来召回变形后的梦境
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/peek")}
                className="rounded-2xl px-6 py-2.5 text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: "0 4px 18px rgba(168,85,247,0.35)",
                }}
              >
                去换梦
              </button>
              <button
                onClick={handleSynthesize}
                disabled={synthesizing}
                className="rounded-2xl px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: synthesizing ? "rgba(255,215,0,0.3)" : "rgba(255,215,0,0.15)",
                  border: "1px solid rgba(255,215,0,0.35)",
                }}
              >
                {synthesizing ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    梦正在凝聚…
                  </span>
                ) : (
                  "召回今日之梦"
                )}
              </button>
            </div>
          </div>

        ) : (
          <div className="space-y-6">
            {/* 变形后的完整梦境故事 */}
            <div
              className="glass-night rounded-2xl p-5 animate-fade-in-up"
              style={{
                boxShadow: "0 4px 24px rgba(75,0,130,0.25), inset 0 1px 0 rgba(255,215,0,0.08)",
              }}
            >
              <p
                className="leading-[2] whitespace-pre-wrap text-sm italic"
                style={{ color: "#e8d5a0", fontFamily: "Georgia, 'Noto Serif SC', serif" }}
              >
                {evening.story}
              </p>
            </div>

            {/* 语音播放 */}
            {evening.audioUrl && (
              <div
                className="glass-night rounded-2xl p-4 flex flex-col items-center gap-2 animate-fade-in"
              >
                <p className="text-xs mb-1" style={{ color: "#b8a0d0" }}>
                  ♪ AI分身用声音讲述这段旅程
                </p>
                <audio
                  controls
                  className="w-full max-w-xs"
                  src={evening.audioUrl}
                  style={{ accentColor: "#FFD700" }}
                >
                  你的浏览器不支持音频播放
                </audio>
              </div>
            )}

            {/* 分割线 */}
            <div className="flex items-center justify-center gap-3">
              <span
                className="h-px flex-1"
                style={{ background: "linear-gradient(to right, transparent, rgba(255,215,0,0.3))" }}
              />
              <div style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.4))" }}>
                <PixelCat size={28} />
              </div>
              <span
                className="h-px flex-1"
                style={{ background: "linear-gradient(to left, transparent, rgba(255,215,0,0.3))" }}
              />
            </div>

            {/* 梦境片段 */}
            {evening.segments.length > 0 && (
              <div className="space-y-3">
                <p
                  className="text-xs text-center animate-fade-in"
                  style={{ color: "#b8a0d0" }}
                >
                  点击片段 · 揭示它从哪个陌生人的梦中漂来
                </p>
                {evening.segments.map((seg, segIdx) => (
                  <button
                    key={seg.id}
                    onClick={() => handleReveal(seg.id)}
                    className="w-full text-left rounded-2xl p-4 transition-all animate-fade-in-up"
                    style={{
                      background:
                        selectedSegment === seg.id
                          ? "rgba(255,215,0,0.08)"
                          : "rgba(40,10,80,0.4)",
                      border:
                        selectedSegment === seg.id
                          ? "1px solid rgba(255,215,0,0.4)"
                          : "1px solid rgba(180,120,255,0.15)",
                      boxShadow:
                        selectedSegment === seg.id
                          ? "0 0 16px rgba(255,215,0,0.12)"
                          : "none",
                      backdropFilter: "blur(12px)",
                      animationDelay: `${0.1 + segIdx * 0.08}s`,
                    }}
                  >
                    <p className="text-sm leading-relaxed italic" style={{ color: "#e8d5a0", fontFamily: "Georgia, 'Noto Serif SC', serif" }}>
                      {seg.content}
                    </p>

                    {selectedSegment === seg.id && (
                      <div
                        className="mt-3 pt-3 animate-fade-in"
                        style={{ borderTop: "1px solid rgba(255,215,0,0.2)" }}
                      >
                        {revealing && !revealedOrigins[seg.id] ? (
                          <p className="text-xs flex items-center gap-2" style={{ color: "#b8a0d0" }}>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-amber-400 border-t-transparent" />
                            正在揭示来源…
                          </p>
                        ) : revealedOrigins[seg.id] ? (
                          <div className="text-xs space-y-1 animate-fade-in">
                            <p
                              style={{
                                color:
                                  revealedOrigins[seg.id].type === "ghost"
                                    ? "#FFD700"
                                    : "#e879f9",
                              }}
                            >
                              {revealedOrigins[seg.id].message}
                            </p>
                            {revealedOrigins[seg.id].name && (
                              <p style={{ color: "#b8a0d0" }}>
                                — {revealedOrigins[seg.id].name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: "#FFD700" }}>
                            {seg.isAnonymous
                              ? "来自一位匿名的梦者"
                              : seg.hasOrigin
                                ? "来源已揭示"
                                : "来自幽灵梦境"}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 历史梦境日记 */}
      {dreamHistory.length > 0 && (
        <div className="relative z-10 w-full max-w-lg mt-8 animate-fade-in">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all glass-night"
          >
            <span className="text-xs" style={{ color: "#b8a0d0" }}>📖 我的梦日记（{dreamHistory.length} 段）</span>
            <span className="text-xs" style={{ color: "#b8a0d0" }}>{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {dreamHistory.map((dream) => (
                <div
                  key={dream.id}
                  className="rounded-2xl px-4 py-3"
                  style={{
                    background: "rgba(40,10,80,0.35)",
                    border: "1px solid rgba(180,120,255,0.12)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <p className="text-xs" style={{ color: "#9a80c0" }}>
                    {new Date(dream.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-sm mt-1 leading-relaxed italic" style={{ color: "#e8d5a0", fontFamily: "Georgia, 'Noto Serif SC', serif" }}>
                    &ldquo;{dream.contentShort}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部导航 */}
      <nav className="bottom-nav bottom-nav-night">
        <button onClick={() => router.push("/dream")}>录梦</button>
        <button onClick={() => router.push("/peek")}>换梦</button>
        <span className="active" style={{ color: "#FFD700" }}>入梦</span>
      </nav>
    </main>
  );
}
