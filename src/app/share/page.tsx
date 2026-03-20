"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface StoryPayload {
  story: string;
  partner: string;
}

const STARS = [
  { x: 10, y: 8, d: 0 }, { x: 28, y: 20, d: 1.2 }, { x: 45, y: 6, d: 0.5 },
  { x: 62, y: 25, d: 1.8 }, { x: 80, y: 11, d: 0.3 }, { x: 91, y: 30, d: 2.1 },
  { x: 18, y: 45, d: 0.9 }, { x: 55, y: 38, d: 1.5 }, { x: 76, y: 50, d: 0.2 },
  { x: 34, y: 62, d: 2.4 }, { x: 88, y: 68, d: 1.0 },
];

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payload, setPayload] = useState<StoryPayload | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = searchParams.get("s");
    if (!s) { setError(true); return; }
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(s))) as StoryPayload;
      if (!decoded.story) { setError(true); return; }
      setPayload(decoded);
    } catch {
      setError(true);
    }
  }, [searchParams]);

  return (
    <main
      className="flex-1 flex flex-col min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(170deg, #0a0820 0%, #12083a 40%, #0d0628 70%, #07070f 100%)" }}
    >
      {/* 星空 */}
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
      </div>

      <div className="relative z-10 flex flex-col min-h-screen px-6 py-10 gap-6">
        {/* 顶部标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium" style={{ color: "#c4b5fd" }}>无尽之梦</h1>
            <p className="text-[10px] mt-0.5" style={{ color: "#7a6aa0" }}>
              {payload ? `两个梦的相遇 · 其中一个来自${payload.partner}` : "读取故事中…"}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-[11px] rounded-2xl px-3 py-1.5 transition-all"
            style={{
              background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.25)",
              color: "#a78bfa",
            }}
          >
            去做梦
          </button>
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-sm" style={{ color: "#8a70b0" }}>这个故事已经消失了</p>
            <button
              onClick={() => router.push("/")}
              className="rounded-2xl px-5 py-2 text-xs text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            >
              去做一个新的梦
            </button>
          </div>
        ) : !payload ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1.5">
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
          </div>
        ) : (
          <>
            {/* 故事卡片 */}
            <div
              className="rounded-3xl px-6 py-6 animate-fade-in"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(168,85,247,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p
                className="text-sm leading-loose whitespace-pre-wrap"
                style={{ color: "#d4c4e8", fontFamily: "serif" }}
              >
                {payload.story}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <p className="text-[10px] italic text-center" style={{ color: "#a78bfa" }}>
                你的梦 × {payload.partner}的梦 = 这个故事
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(payload.story).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }).catch(() => {});
                  }}
                  className="rounded-2xl px-4 py-2 text-[11px] transition-all"
                  style={{
                    background: copied ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    color: copied ? "#c4b5fd" : "#9a80c0",
                  }}
                >
                  {copied ? "✓ 已复制" : "复制故事"}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="rounded-2xl px-4 py-2 text-[11px] text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  我也要做梦
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <main
        className="flex-1 flex min-h-screen items-center justify-center"
        style={{ background: "#0a0820" }}
      >
        <div className="text-sm" style={{ color: "#7a6aa0" }}>加载中…</div>
      </main>
    }>
      <ShareContent />
    </Suspense>
  );
}
