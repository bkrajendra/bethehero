"use client";

import { useEffect, useRef } from "react";

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    let animId: number;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    function drawDrop(cx: number, cy: number, r: number, a: number) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.65);
      ctx.bezierCurveTo(cx + r * 1.1, cy - r * 0.3,  cx + r * 1.1, cy + r * 0.65, cx, cy + r * 1.15);
      ctx.bezierCurveTo(cx - r * 1.1, cy + r * 0.65, cx - r * 1.1, cy - r * 0.3,  cx, cy - r * 1.65);
      const g = ctx.createLinearGradient(cx, cy - r * 1.65, cx, cy + r * 1.15);
      g.addColorStop(0, "#ff4460");
      g.addColorStop(1, "#7a0018");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }

    const pts = Array.from({ length: 28 }, () => ({
      px: Math.random() * window.innerWidth,
      py: Math.random() * window.innerHeight,
      r:  Math.random() * 3.5 + 1.5,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -(Math.random() * 0.42 + 0.14),
      a:  Math.random() * 0.11 + 0.04,
    }));

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        drawDrop(p.px, p.py, p.r, p.a);
        p.px += p.vx;
        p.py += p.vy;
        if (p.py < -22) {
          p.py = H + 22;
          p.px = Math.random() * W;
          p.a  = Math.random() * 0.11 + 0.04;
        }
        if (p.px < -22)   p.px = W + 22;
        if (p.px > W + 22) p.px = -22;
      }
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 4, pointerEvents: "none" }}
    />
  );
}
