"use client";
import { useEffect, useState } from "react";

interface Props {
  donated: number;
  registered: number;
  bloodCollectedL: number;
}

// Bag body position inside the blood-chart.png image (in % of image dimensions).
// The clear bag interior ends before the decorative wave/splash area near the bottom.
const BAG = { left: 35, top: 12, width: 28, height: 65 };

export function BloodBagChart({ donated, registered, bloodCollectedL }: Props) {
  const [fill, setFill] = useState(0);
  const target = registered > 0 ? Math.min(Math.round((donated / registered) * 100), 100) : 0;

  // Animate fill level on mount and whenever donated changes
  useEffect(() => {
    setFill(0);
    const t = setTimeout(() => setFill(target), 400);
    return () => clearTimeout(t);
  }, [target]);

  const livesImpacted = donated * 3;

  // Vertical center of the fill area (% within whole image), for placing the % label
  const fillTop = BAG.top + BAG.height * (1 - fill / 100);
  const fillCenter = fillTop + (BAG.height * fill / 100) / 2;

  return (
    <>
      <style>{`
        @keyframes bth-wave {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes bth-wave2 {
          0%   { transform: translateX(-25%); }
          100% { transform: translateX(-75%); }
        }
      `}</style>

      <div className="relative select-none">
        {/* Background illustration */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/blood-bag.png" alt="" className="w-full block" draggable={false} />

        {/* ── Blood fill overlay ──────────────────────────────────────────
            Positioned over the bag interior in the PNG.
            mix-blend-mode:multiply darkens the light-pink bag area with the
            red fill, making it look like real blood rising inside the bag.
        ────────────────────────────────────────────────────────────────── */}
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            left:   `${BAG.left}%`,
            top:    `${BAG.top}%`,
            width:  `${BAG.width}%`,
            height: `${BAG.height}%`,
            borderRadius: "8% 8% 48% 48% / 4% 4% 24% 24%",
            mixBlendMode: "multiply",
          }}
        >
          {/* Fill rises from bottom */}
          <div className="absolute inset-0 flex flex-col-reverse">
            <div
              className="relative w-full"
              style={{
                height: `${fill}%`,
                background:
                  "linear-gradient(to top, rgba(100, 8, 16, 0.88), rgba(196, 16, 46, 0.72))",
                transition: "height 4.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Wave cap — two layers for depth */}
              <div className="absolute -top-5 left-0 right-0 h-10 overflow-hidden">
                {/* Back wave: slower, lighter, offset phase */}
                <svg
                  viewBox="0 0 400 32"
                  preserveAspectRatio="none"
                  className="h-full absolute inset-0"
                  style={{
                    width: "200%",
                    animation: fill > 0 ? "bth-wave2 5.5s linear infinite" : "none",
                  }}
                >
                  <path
                    d="M0 18 C30 8 60 28 90 18 S150 8 180 18 S240 28 270 18
                       C300 8 330 28 360 18 S390 8 400 18
                       L400 32 L0 32 Z"
                    fill="rgba(180, 10, 30, 0.45)"
                  />
                </svg>
                {/* Front wave: slightly faster, more opaque */}
                <svg
                  viewBox="0 0 400 32"
                  preserveAspectRatio="none"
                  className="h-full absolute inset-0"
                  style={{
                    width: "200%",
                    animation: fill > 0 ? "bth-wave 4s linear infinite" : "none",
                  }}
                >
                  <path
                    d="M0 20 C25 10 50 30 75 20 S125 10 150 20 S175 30 200 20
                       C225 10 250 30 275 20 S325 10 350 20 S375 30 400 20
                       L400 32 L0 32 Z"
                    fill="rgba(200, 16, 46, 0.82)"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Fill percentage label ───────────────────────────────────── */}
        {fill > 6 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none font-bold text-white tabular-nums"
            style={{
              top:        `${fillCenter}%`,
              fontSize:   "clamp(11px, 2.8vw, 18px)",
              textShadow: "0 1px 6px rgba(0,0,0,0.55)",
              transform:  "translateX(-50%) translateY(-50%)",
              transition: "top 4.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {fill}%
          </div>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 px-4 pb-5 pt-1 gap-1">
        {[
          { value: donated,           sub: "Heroes",     icon: "🦸" },
          { value: `${bloodCollectedL} L`, sub: "Collected",  icon: "🩸" },
          { value: donated,           sub: "Donations",  icon: "💉" },
          { value: livesImpacted,     sub: "Lives",      icon: "❤️" },
        ].map((s) => (
          <div key={s.sub} className="flex flex-col items-center gap-0.5">
            <span className="text-base leading-none">{s.icon}</span>
            <span className="text-base font-bold text-[#c8102e] leading-tight tabular-nums">
              {s.value}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none">
              {s.sub}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
