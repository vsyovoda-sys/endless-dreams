import Link from "next/link";
import { PixelCat } from "@/components/PixelCat";

/* 静态星星位置，避免服务端/客户端 hydration 不匹配 */
const STARS = [
  { x: 8, y: 5, d: 0 }, { x: 23, y: 15, d: 0.8 }, { x: 41, y: 8, d: 1.4 },
  { x: 67, y: 12, d: 0.3 }, { x: 82, y: 4, d: 1.9 }, { x: 93, y: 18, d: 0.6 },
  { x: 15, y: 28, d: 2.1 }, { x: 52, y: 22, d: 1.1 }, { x: 75, y: 31, d: 0.4 },
  { x: 35, y: 42, d: 1.7 }, { x: 89, y: 38, d: 0.9 }, { x: 6, y: 55, d: 2.4 },
  { x: 48, y: 63, d: 0.2 }, { x: 71, y: 58, d: 1.5 }, { x: 19, y: 72, d: 0.7 },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMsg =
    error === "invalid_state" ? "登录验证失败，请重试"
    : error === "no_code" ? "登录被取消"
    : error === "auth_failed" ? "登录失败，请稍后再试"
    : null;
  return (
    <main
      className="flex-1 flex flex-col items-center overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #FFF8F8 0%, #FFE8E8 35%, #F5EEFF 70%, #EEF4FF 100%)" }}
    >

      {/* ── 柔光粒子背景 ── */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        {/* 粉色光晕 */}
        <div className="absolute top-[20%] left-[15%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(255,183,197,0.35)" }} />
        <div className="absolute top-[55%] right-[10%] h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgba(196,181,253,0.3)" }} />
        <div className="absolute bottom-[15%] left-[30%] h-56 w-56 rounded-full blur-3xl"
          style={{ background: "rgba(147,197,253,0.25)" }} />

        {/* 漂浮小光点（模拟梦境孢子） */}
        {STARS.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-star-twinkle"
            style={{
              width: 3, height: 3,
              left: `${s.x}%`, top: `${s.y}%`,
              background: i % 3 === 0 ? "rgba(255,150,180,0.7)" : i % 3 === 1 ? "rgba(167,139,250,0.65)" : "rgba(147,197,253,0.6)",
              animationDelay: `${s.d}s`,
              animationDuration: `${2.5 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* ── 主内容：最小全屏高度，垂直居中 ── */}
      <div className="relative z-10 min-h-[100dvh] w-full flex flex-col items-center justify-center text-center px-6">

        {/* 标题 */}
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-tight animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 12px rgba(168,85,247,0.25))",
          }}
        >
          无尽之梦
        </h1>

        <p className="mt-3 text-[11px] tracking-[0.4em] uppercase animate-fade-in delay-200"
          style={{ color: "#b08ac0" }}>
          Endless Dreams
        </p>

        {/* 猫咪入场 */}
        <div className="relative mt-6 animate-fade-in-up delay-300">
          <div className="animate-cat-idle">
            <PixelCat size={100} sleeping className="animate-eye-glow" />
          </div>
          {/* 猫的睡眠气泡 */}
          <div
            className="absolute -top-2 -right-6 text-lg animate-float"
            style={{ color: "#c084fc", animationDuration: "2s" }}
          >
            z
          </div>
          <div
            className="absolute -top-5 right-0 text-sm animate-float"
            style={{ color: "#e879f9", opacity: 0.5, animationDuration: "2.5s", animationDelay: "0.3s" }}
          >
            z
          </div>
          <div
            className="absolute -top-7 -right-2 text-xs animate-float"
            style={{ color: "#a78bfa", opacity: 0.35, animationDuration: "3s", animationDelay: "0.6s" }}
          >
            z
          </div>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed animate-fade-in-up delay-500"
          style={{ color: "#9966b8" }}>
          据说梦中碰见的人都曾在现实里见过<br />
          你想邀请谁入梦？
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 animate-fade-in-up delay-700">
          <Link
            href="/api/auth/login"
            className="relative inline-flex items-center justify-center rounded-2xl px-8 py-3.5 text-sm font-medium text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #ec4899 100%)",
              boxShadow: "0 4px 24px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            用 Second Me 登录
          </Link>
          <Link
            href="/api/auth/guest"
            className="relative inline-flex items-center justify-center rounded-2xl px-8 py-3 text-sm font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              color: "#7c3aed",
              border: "1.5px solid rgba(168,85,247,0.35)",
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            体验模式（无需登录）
          </Link>
          <p className="text-xs" style={{ color: "#b08ac0" }}>把今天做的梦告诉我，我去交换一个故事</p>
          {errorMsg && (
            <p className="text-xs mt-1" style={{ color: "#e05a8a" }}>{errorMsg}</p>
          )}
        </div>
      </div>

      <footer className="relative z-10 pt-4 pb-3 text-xs animate-fade-in delay-1000"
        style={{ color: "#b08ac0" }}>
        这里有一些无人认领的梦，它们在等一个听众。
      </footer>

      {/* 向下滑动提示箭头 */}
      <div className="relative z-10 pb-3 animate-bounce" style={{ color: "rgba(160,130,200,0.45)", fontSize: 18 }}>
        ↓
      </div>

      {/* 漂流的梦碎片预览 */}
      <section className="relative z-10 w-full max-w-sm px-4 pb-12 animate-fade-in delay-1000">
        <p className="text-center text-[10px] tracking-widest uppercase mb-4" style={{ color: "#c4a8d8" }}>
          — 索拉里斯留下的梦 —
        </p>
        <div className="space-y-3">
          {/* 诗意 */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(168,85,247,0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#c084fc" }}>🌙 诗意</span>
            <p className="mt-1 text-xs leading-relaxed italic line-clamp-2" style={{ color: "#9966b8" }}>
              梦见在奶奶家，很晚了，和同学一起临时抱佛脚，不停背书。楼上亮，楼下黑……周围嘈杂狂响，全是鬼声。
            </p>
          </div>
          {/* 荒诞 */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: "rgba(20,184,166,0.05)",
              border: "1px solid rgba(20,184,166,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#5eead4" }}>🌀 荒诞</span>
            <p className="mt-1 text-xs leading-relaxed italic line-clamp-2" style={{ color: "#9966b8" }}>
              列车从树梢越过田野，她抖落烟灰燃尽了灌木。草地暗处，司芬克斯和辛巴欢快交颈……
            </p>
          </div>
          {/* 温柔 */}
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: "rgba(236,72,153,0.05)",
              border: "1px solid rgba(236,72,153,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#f472b6" }}>🌸 温柔</span>
            <p className="mt-1 text-xs leading-relaxed italic line-clamp-2" style={{ color: "#9966b8" }}>
              我碰见了四扇关紧的门，它们之间有没有因缘逻辑，我不确定。总之我绕了一个圈，爱丽丝的兔子洞……
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
