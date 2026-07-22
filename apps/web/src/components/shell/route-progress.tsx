"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight top progress bar that flashes on every route change so navigation
 * feels responsive (modern-SaaS feedback) without a heavy dependency.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setWidth(8);
    timers.current.push(setTimeout(() => setWidth(70), 50));
    timers.current.push(setTimeout(() => setWidth(100), 280));
    timers.current.push(setTimeout(() => setVisible(false), 480));
    timers.current.push(setTimeout(() => setWidth(0), 560));
    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-0.5">
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-200 ease-out"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
