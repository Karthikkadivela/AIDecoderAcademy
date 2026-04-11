"use client";

/**
 * Per-arena “game world” behind the chat transcript (distinct from the dashboard shell).
 * Arena 1: solar / prospect-style field. Arena 3 (Story Forge): narrative workshop —
 * twilight sky, twin lantern glows, parchment “desk”, rising embers, library edges, gold motes.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Active arena id 1–6 */
  arenaId: number;
};

const LERP = 0.1;

export function PlaygroundWorld({ arenaId }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const curRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const fn = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (reducedMotion) {
      el.style.setProperty("--pg-px", "0");
      el.style.setProperty("--pg-py", "0");
      return;
    }
    const tick = () => {
      const c = curRef.current;
      const t = targetRef.current;
      c.x += (t.x - c.x) * LERP;
      c.y += (t.y - c.y) * LERP;
      el.style.setProperty("--pg-px", c.x.toFixed(4));
      el.style.setProperty("--pg-py", c.y.toFixed(4));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRef.current = {
        x: Math.max(-1, Math.min(1, nx)),
        y: Math.max(-1, Math.min(1, ny)),
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  const id = Math.min(6, Math.max(1, arenaId));

  return (
    <div
      ref={rootRef}
      className={cn("pg-world", `pg-world--a${id}`)}
      style={{ "--pg-px": "0", "--pg-py": "0" } as CSSProperties}
      aria-hidden
    >
      <div className="pg-layer pg-layer-base" />
      <div className="pg-layer pg-layer-sun" />
      <div className="pg-layer pg-layer-nebula" />
      <div className="pg-layer pg-layer-orbit" />
      <div className="pg-layer pg-layer-planet" />
      <div className="pg-layer pg-layer-stars" />
      <div className="pg-layer pg-layer-horizon" />
      <div className="pg-layer pg-layer-grid" />
      <div className="pg-layer pg-layer-scan" />
      <div className="pg-layer pg-layer-ember" />
      {/* Story Forge (arena 3) only — see .pg-world--a3 in globals.css */}
      <div className="pg-layer pg-layer-forge-sky" />
      <div className="pg-layer pg-layer-forge-parchment" />
      <div className="pg-layer pg-layer-forge-embers-rise" />
      <div className="pg-layer pg-layer-forge-shelves" />
      <div className="pg-layer pg-layer-forge-sparkles" />
      <div className="pg-layer pg-layer-aurora" />
      <div className="pg-layer pg-layer-spectrum" />
      <div className="pg-layer pg-layer-bars" />
      <div className="pg-layer pg-layer-letterbox" />
      <div className="pg-layer pg-layer-dust" />
      <div className="pg-layer pg-layer-vignette" />
    </div>
  );
}
