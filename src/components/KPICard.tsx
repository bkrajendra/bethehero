"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
}

function useAnimatedCounter(target: number, duration = 600) {
  const [current, setCurrent] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return current;
}

export function KPICard({ label, value, suffix = "", color = "#fdf0ee" }: Props) {
  const animated = useAnimatedCounter(value);

  return (
    <div className="border border-[rgba(200,16,46,0.2)] rounded-xl p-5 space-y-1 bg-[rgba(200,16,46,0.03)]">
      <p className="text-xs text-[rgba(253,240,238,0.3)] uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color }}>
        {animated.toLocaleString()}{suffix}
      </p>
    </div>
  );
}
