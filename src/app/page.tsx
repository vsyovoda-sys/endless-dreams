import Link from "next/link";
import { PixelCat } from "@/components/PixelCat";
import { prisma } from "@/lib/prisma";

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
  const dreamCount = await prisma.dream.count().catch(() => 0);
  const { error } = await searchParams;
  const errorMsg =
    error === "invalid_state" ? "登录验证失败，请重试"
    : error === "no_code" ? "登录被取消"
    : error === "auth_failed" ? "登录失败，请稍后再试"
    : null;
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center overflow-hidden"
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

      {/* ── 主内容 ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

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
          <p className="text-xs" style={{ color: "#b08ac0" }}>你的 AI 分身将成为梦的使者</p>
          {errorMsg && (
            <p className="text-xs mt-1" style={{ color: "#e05a8a" }}>{errorMsg}</p>
          )}
        </div>
      </div>

      <footer className="relative z-10 mt-16 pb-safe pb-6 text-xs animate-fade-in delay-1000"
        style={{ color: "#b08ac0" }}>
        {dreamCount > 0 ? `${dreamCount} 段无人认领的梦，正在等待听众` : "无数段梦，正在等待听众"}
      </footer>
    </main>
  );
}
