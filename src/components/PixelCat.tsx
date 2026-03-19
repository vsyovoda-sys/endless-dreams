"use client";

export interface PixelCatProps {
  size?: number;
  flipped?: boolean;   // 水平翻转（朝右的猫）
  sleeping?: boolean;  // 闭眼熟睡
  glowing?: boolean;   // 眼睛发光（高亮状态）
  className?: string;
}

/**
 * 像素风黑猫 SVG 组件（含内置微动画）
 * viewBox 0 0 64 80 | 每"像素" = 4 SVG 单位
 * 核心特征: 琥珀色竖缝瞳孔、粉色鼻子、右侧卷尾
 *
 * 内置动画:
 *  - 呼吸（身体微起伏）
 *  - 尾巴摇摆
 *  - 眨眼（非 sleeping 时）
 *  - 发光瞳孔脉冲（glowing 时）
 *  - 耳朵偶尔抖动
 *  - sleeping 时身体慢摇
 */
export function PixelCat({
  size = 96,
  flipped = false,
  sleeping = false,
  glowing = false,
  className = "",
}: PixelCatProps) {
  const eyeColor = glowing ? "#fcd34d" : "#f59e0b";

  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 64 80"
      style={{
        imageRendering: "pixelated",
        transform: flipped ? "scaleX(-1)" : undefined,
        display: "block",
      }}
      className={className}
    >
      <defs>
        {/* ── 呼吸：身体整体微上下 ── */}
        <animateTransform
          xlinkHref="#cat-body"
          attributeName="transform"
          type="translate"
          values="0,0;0,-1.5;0,0"
          dur={sleeping ? "4s" : "2.8s"}
          repeatCount="indefinite"
        />

        {/* ── 尾巴摇摆 ── */}
        <animateTransform
          xlinkHref="#cat-tail"
          attributeName="transform"
          type="rotate"
          values="0 55 55;-6 55 55;0 55 55;4 55 55;0 55 55"
          dur={sleeping ? "5s" : "3s"}
          repeatCount="indefinite"
        />

        {/* ── 左耳抖动 ── */}
        <animateTransform
          xlinkHref="#ear-left"
          attributeName="transform"
          type="rotate"
          values="0 8 8;-3 8 8;0 8 8;0 8 8;0 8 8"
          dur="4.5s"
          repeatCount="indefinite"
        />

        {/* ── 右耳抖动（错开节奏） ── */}
        <animateTransform
          xlinkHref="#ear-right"
          attributeName="transform"
          type="rotate"
          values="0 56 8;0 56 8;3 56 8;0 56 8;0 56 8"
          dur="5.2s"
          repeatCount="indefinite"
        />

        {/* ── 眨眼（非 sleeping 时覆盖层闪现） ── */}
        {!sleeping && (
          <animate
            xlinkHref="#blink-overlay"
            attributeName="opacity"
            values="0;0;0;0;0;0;0;0;1;0;0;0;0;0;0;0;0;0;0;1;0"
            dur="6s"
            repeatCount="indefinite"
          />
        )}

        {/* ── 发光瞳孔脉冲 ── */}
        {glowing && (
          <animate
            xlinkHref="#eye-glow-filter"
            attributeName="stdDeviation"
            values="0;2.5;0"
            dur="2s"
            repeatCount="indefinite"
          />
        )}

        {/* 发光滤镜定义 */}
        {glowing && (
          <filter id="glow-f" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur id="eye-glow-filter" in="SourceGraphic" stdDeviation="0" />
          </filter>
        )}
      </defs>

      <g shapeRendering="crispEdges">
        {/* ── 左耳 (阶梯状三角) ── */}
        <g id="ear-left">
          <rect x="6"  y="0" width="4"  height="4" fill="#0e0e22" />
          <rect x="4"  y="4" width="8"  height="4" fill="#0e0e22" />
          <rect x="4"  y="8" width="10" height="4" fill="#0e0e22" />
          {/* 左耳内侧 */}
          <rect x="7"  y="1" width="2"  height="2" fill="#1e0a22" />
          <rect x="6"  y="5" width="4"  height="2" fill="#1e0a22" />
        </g>

        {/* ── 右耳 ── */}
        <g id="ear-right">
          <rect x="54" y="0" width="4"  height="4" fill="#0e0e22" />
          <rect x="52" y="4" width="8"  height="4" fill="#0e0e22" />
          <rect x="50" y="8" width="10" height="4" fill="#0e0e22" />
          {/* 右耳内侧 */}
          <rect x="55" y="1" width="2"  height="2" fill="#1e0a22" />
          <rect x="54" y="5" width="4"  height="2" fill="#1e0a22" />
        </g>

        {/* ── 头部 ── */}
        <rect x="4" y="10" width="56" height="34" fill="#0e0e22" />

        {/* ── 眼睛 ── */}
        {sleeping ? (
          /* 闭眼: 两条弯曲的横线 */
          <>
            <rect x="12" y="21" width="10" height="2" fill={eyeColor} />
            <rect x="13" y="19" width="8"  height="2" fill={eyeColor} />
            <rect x="42" y="21" width="10" height="2" fill={eyeColor} />
            <rect x="43" y="19" width="8"  height="2" fill={eyeColor} />
          </>
        ) : (
          <g filter={glowing ? "url(#glow-f)" : undefined}>
            {/* 左眼琥珀块 */}
            <rect x="12" y="16" width="12" height="12" fill={eyeColor} />
            {/* 左眼竖缝瞳孔 */}
            <rect x="17" y="14" width="2" height="16" fill="#06040e" />
            {/* 左眼高光 */}
            <rect x="12" y="16" width="4" height="4" fill="rgba(255,255,255,0.38)" />

            {/* 右眼琥珀块 */}
            <rect x="40" y="16" width="12" height="12" fill={eyeColor} />
            {/* 右眼竖缝瞳孔 */}
            <rect x="45" y="14" width="2" height="16" fill="#06040e" />
            {/* 右眼高光 */}
            <rect x="40" y="16" width="4" height="4" fill="rgba(255,255,255,0.38)" />

            {/* 眨眼覆盖层（闪过时遮住眼睛） */}
            <g id="blink-overlay" opacity="0">
              <rect x="12" y="16" width="12" height="12" fill="#0e0e22" />
              <rect x="12" y="24" width="10" height="2" fill={eyeColor} />
              <rect x="40" y="16" width="12" height="12" fill="#0e0e22" />
              <rect x="42" y="24" width="10" height="2" fill={eyeColor} />
            </g>
          </g>
        )}

        {/* ── 鼻子 ── */}
        <rect x="30" y="33" width="4" height="4" fill="#f472b6" />
        <rect x="28" y="35" width="8" height="2" fill="#f472b6" />

        {/* ── 胡须 (细, 半透明) ── */}
        <rect x="0"  y="24" width="10" height="1" fill="#333355" />
        <rect x="0"  y="28" width="8"  height="1" fill="#333355" />
        <rect x="54" y="24" width="10" height="1" fill="#333355" />
        <rect x="56" y="28" width="8"  height="1" fill="#333355" />

        {/* ── 身体（含呼吸动画） ── */}
        <g id="cat-body">
          <rect x="10" y="44" width="44" height="24" fill="#0e0e22" />

          {/* ── 前爪 ── */}
          <rect x="8"  y="66" width="16" height="8" fill="#0e0e22" />
          <rect x="40" y="66" width="16" height="8" fill="#0e0e22" />
          {/* 爪趾线 */}
          <rect x="12" y="70" width="2" height="4" fill="#0a0a1a" />
          <rect x="16" y="70" width="2" height="4" fill="#0a0a1a" />
          <rect x="44" y="70" width="2" height="4" fill="#0a0a1a" />
          <rect x="48" y="70" width="2" height="4" fill="#0a0a1a" />
        </g>

        {/* ── 尾巴（含摇摆动画） ── */}
        <g id="cat-tail">
          <rect x="52" y="46" width="6" height="18" fill="#0e0e22" />
          <rect x="52" y="42" width="10" height="6"  fill="#0e0e22" />
          <rect x="58" y="38" width="4"  height="8"  fill="#0e0e22" />
          <rect x="58" y="36" width="6"  height="4"  fill="#0e0e22" />
        </g>
      </g>
    </svg>
  );
}
