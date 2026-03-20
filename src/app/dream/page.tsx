"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelCat } from "@/components/PixelCat";

export default function DreamPage() {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ contentShort: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), isAnonymous }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 401) {
        router.push("/");
        return;
      }

      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      setResult(data.dream);

      // 客户端主动触发 A2A 对话（Vercel ServerLess 中后台任务会被终止）
      fetch("/api/a2a/trigger", { method: "POST" }).catch(() => {});
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        alert("AI分身出发有点慢，请稍后重试");
      } else {
        alert("提交失败，请检查网络后重试");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main
        className="flex-1 flex flex-col items-center justify-center px-6"
        style={{ background: "linear-gradient(160deg, #FFF8F8 0%, #FFE8E8 40%, #F5EEFF 70%, #EEF4FF 100%)" }}
      >
        {/* 柔光 */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "rgba(196,181,253,0.3)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-6 animate-fade-in-up">
          <div className="animate-cat-idle">
            <PixelCat size={88} flipped glowing />
          </div>
          <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
            AI分身出发了
          </h2>
          <div
            className="rounded-2xl px-6 py-4 max-w-xs"
            style={{
              background: "rgba(255,240,245,0.65)",
              border: "1px solid rgba(255,180,210,0.4)",
              backdropFilter: "blur(16px)",
            }}
          >
            <p className="italic text-sm leading-relaxed" style={{ color: "#9d4a75" }}>
              &ldquo;{result.contentShort}&rdquo;
            </p>
          </div>
          <p className="text-xs" style={{ color: "#b08ac0" }}>
            它将带着这段梦去遇见陌生的灵魂
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/peek")}
              className="rounded-2xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                boxShadow: "0 4px 18px rgba(168,85,247,0.35)",
              }}
            >
              去换梦
            </button>
            <button
              onClick={() => { setContent(""); setResult(null); }}
              className="rounded-2xl px-5 py-2.5 text-sm transition-all"
              style={{
                border: "1px solid rgba(200,150,200,0.4)",
                color: "#9966b8",
                background: "rgba(255,240,255,0.4)",
              }}
            >
              再记一段
            </button>
          </div>
        </div>
        <nav className="bottom-nav bottom-nav-day">
          <span className="active">🌙 录梦</span>
          <button onClick={() => router.push("/peek")}>🐾 换梦</button>
          <button onClick={() => router.push("/evening")}>✨ 入梦</button>
        </nav>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col items-center px-5 pt-12 pb-28"
      style={{ background: "linear-gradient(160deg, #FFF8F8 0%, #FFE8E8 40%, #F5EEFF 70%, #EEF4FF 100%)" }}
    >
      {/* 柔光背景 */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/3 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(255,200,220,0.3)" }} />
        <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "rgba(196,181,253,0.25)" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
        {/* 猫咪+对话气泡 */}
        <div className="flex items-end gap-4 mb-6">
          <div className="flex-shrink-0 animate-cat-idle">
            <PixelCat size={72} glowing />
          </div>
          <div
            className="flex-1 rounded-2xl rounded-bl-none px-4 py-3 text-sm leading-relaxed"
            style={{
              background: "rgba(255,240,250,0.7)",
              border: "1px solid rgba(230,170,200,0.4)",
              backdropFilter: "blur(16px)",
              color: "#9d4a75",
            }}
          >
            今天做了什么梦？说给我听。
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="我梦见..."
              rows={7}
              className="w-full resize-none rounded-2xl px-4 py-4 leading-relaxed focus:outline-none"
              style={{
                background: "rgba(255,248,252,0.75)",
                border: "1px solid rgba(220,160,200,0.35)",
                backdropFilter: "blur(16px)",
                color: "#5a3060",
                boxShadow: "0 2px 16px rgba(200,120,180,0.08)",
              }}
              maxLength={10000}
            />
            <span className="absolute bottom-3 right-4 text-xs" style={{ color: "#d4a0c0" }}>
              {content.length > 0 ? content.length : ""}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "#b08ac0" }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              匿名分享
            </label>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="w-full rounded-2xl py-3.5 text-sm font-medium text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)",
              boxShadow: "0 4px 20px rgba(168,85,247,0.35)",
            }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                AI分身正在接收...
              </span>
            ) : (
              "交给AI分身"
            )}
          </button>
        </form>
      </div>

      <nav className="bottom-nav bottom-nav-day">
        <span className="active">🌙 录梦</span>
        <button onClick={() => router.push("/peek")}>🐾 换梦</button>
        <button onClick={() => router.push("/evening")}>✨ 入梦</button>
      </nav>
    </main>
  );
}
