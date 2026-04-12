"use client";

/**
 * PromptLabWorld — Arena 2: Prompt Lab
 * Accent: #00D4FF electric cyan
 * Vibe: inside a futuristic command deck / hacker terminal
 * - Tron-style perspective grid scrolling toward horizon
 * - Data packets (glowing rects) travelling along grid lines
 * - Scanline sweep across full width
 * - Circuit trace lines on side panels
 * - Cyan horizon glow
 * - Floating code fragments
 */

import { useEffect, useRef, useCallback } from "react";

interface Props { reducedMotion?: boolean; }

interface Packet {
  lane: number;    // which vertical grid lane
  y: number;       // position along lane (0=horizon, 1=bottom)
  speed: number;
  w: number;
  h: number;
  op: number;
  color: string;
}

interface CodeFragment {
  x: number; y: number;
  vx: number; vy: number;
  text: string;
  op: number; size: number;
}

const CODE_SNIPPETS = [
  "prompt>", "AI.run()", "input:", "fn(x)=>",
  "01001", "query{}", "→ output", "model:",
  "tokens:", "ctx=[]", "stream()", "embed()",
];

export function PromptLabWorld({ reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const lastRef   = useRef(0);

  const stateRef = useRef({
    packets:   [] as Packet[],
    fragments: [] as CodeFragment[],
    scanX: -1,
    scanDir: 1,
    initialized: false,
  });

  const CYAN  = "rgba(0,212,255,";
  const CYAN2 = "rgba(0,255,240,";

  const init = useCallback((W: number, H: number) => {
    const laneCount = 14;
    const packets: Packet[] = [];
    for (let i = 0; i < (reducedMotion ? 6 : 18); i++) {
      packets.push({
        lane:  Math.floor(Math.random() * laneCount),
        y:     Math.random(),
        speed: Math.random() * 0.004 + 0.002,
        w:     Math.random() * 18 + 8,
        h:     Math.random() * 6 + 3,
        op:    Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.3 ? CYAN : CYAN2,
      });
    }
    const fragments: CodeFragment[] = reducedMotion ? [] :
      Array.from({ length: 12 }, () => ({
        x:    Math.random() * W,
        y:    Math.random() * H * 0.7,
        vx:   (Math.random() - 0.5) * 0.15,
        vy:   (Math.random() - 0.5) * 0.08,
        text: CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)],
        op:   Math.random() * 0.18 + 0.05,
        size: Math.random() * 4 + 9,
      }));
    stateRef.current = { packets, fragments, scanX: 0, scanDir: 1, initialized: true };
  }, [reducedMotion]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    if (now - lastRef.current < 33) { rafRef.current = requestAnimationFrame(draw); return; }
    lastRef.current = now;
    tRef.current++;
    const t = tRef.current;
    const W = canvas.width;
    const H = canvas.height;
    const st = stateRef.current;
    if (!st.initialized) init(W, H);

    // ── 1. Base — deep command-deck dark ──────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   "#020810");
    bg.addColorStop(0.5, "#030e18");
    bg.addColorStop(1,   "#020609");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── 2. Horizon cyan glow ──────────────────────────────────────────────────
    const horizonY = H * 0.52;
    const hg = ctx.createLinearGradient(0, horizonY, 0, H);
    hg.addColorStop(0,   "rgba(0,212,255,0.22)");
    hg.addColorStop(0.3, "rgba(0,180,220,0.10)");
    hg.addColorStop(1,   "transparent");
    ctx.fillStyle = hg; ctx.fillRect(0, horizonY, W, H - horizonY);

    // Horizon line — bright thin stripe
    ctx.strokeStyle = "rgba(0,255,240,0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(W, horizonY); ctx.stroke();

    // ── 3. Perspective grid ───────────────────────────────────────────────────
    const vp = { x: W / 2, y: horizonY }; // vanishing point
    const laneCount = 14;
    const gridBottom = H;

    // Vertical perspective lines
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= laneCount; i++) {
      const bx = (W / laneCount) * i;
      const alpha = i === laneCount / 2 ? 0.35 : 0.14;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(vp.x, vp.y);
      ctx.lineTo(bx, gridBottom);
      ctx.stroke();
    }

    // Horizontal lines (receding, perspective-spaced) with scroll
    const scrollOffset = (t * 1.2) % 1;
    const lineCount = 16;
    for (let i = 0; i <= lineCount; i++) {
      const p = ((i + scrollOffset) / lineCount);
      // perspective: lines bunch up near horizon, spread at bottom
      const pp = Math.pow(p, 1.8);
      const y  = horizonY + (gridBottom - horizonY) * pp;
      if (y < horizonY || y > gridBottom) continue;
      // width at this depth
      const xLeft  = vp.x - (vp.x - 0) * pp;
      const xRight = vp.x + (W - vp.x) * pp;
      const alpha  = Math.pow(pp, 0.4) * 0.22;
      ctx.strokeStyle = `rgba(0,212,255,${alpha})`;
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(xLeft, y);
      ctx.lineTo(xRight, y);
      ctx.stroke();
    }

    // ── 4. Data packets along grid lanes ─────────────────────────────────────
    st.packets.forEach(pk => {
      if (!reducedMotion) pk.y += pk.speed;
      if (pk.y > 1) { pk.y = 0; pk.lane = Math.floor(Math.random() * laneCount); }

      const pp   = Math.pow(pk.y, 1.8);
      const y    = horizonY + (gridBottom - horizonY) * pp;
      if (y < horizonY || y > H) return;

      const xLeft  = vp.x - (vp.x - 0) * pp;
      const xRight = vp.x + (W - vp.x) * pp;
      const laneX  = xLeft + (xRight - xLeft) * (pk.lane / laneCount);
      const scale  = 0.2 + pp * 0.8;

      ctx.fillStyle = `${pk.color}${pk.op * Math.min(1, pp * 2)})`;
      ctx.shadowColor   = "#00D4FF";
      ctx.shadowBlur    = 6 * scale;
      ctx.fillRect(laneX - pk.w * scale / 2, y - pk.h * scale / 2, pk.w * scale, pk.h * scale);
      ctx.shadowBlur = 0;
    });

    // ── 5. Scanline sweep ─────────────────────────────────────────────────────
    if (!reducedMotion) {
      st.scanX += st.scanDir * 3.5;
      if (st.scanX > W + 80) st.scanDir = -1;
      if (st.scanX < -80) st.scanDir = 1;

      const sg = ctx.createLinearGradient(st.scanX - 60, 0, st.scanX + 60, 0);
      sg.addColorStop(0,    "transparent");
      sg.addColorStop(0.4,  "rgba(0,255,240,0.05)");
      sg.addColorStop(0.5,  "rgba(0,255,240,0.12)");
      sg.addColorStop(0.6,  "rgba(0,255,240,0.05)");
      sg.addColorStop(1,    "transparent");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }

    // ── 6. Circuit traces on side panels ─────────────────────────────────────
    const drawCircuit = (startX: number, dir: 1 | -1) => {
      ctx.strokeStyle = "rgba(0,212,255,0.12)";
      ctx.lineWidth   = 1;
      let x = startX, y = H * 0.15;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) { x += dir * (20 + (i * 12)); }
        else              { y += 35 + i * 8; }
        ctx.lineTo(x, y);
        // Node dot
        ctx.fillStyle = `rgba(0,212,255,${0.18 + Math.sin(t * 0.04 + i) * 0.08})`;
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    drawCircuit(W * 0.05, 1);
    drawCircuit(W * 0.95, -1);

    // ── 7. Floating code fragments ────────────────────────────────────────────
    st.fragments.forEach(f => {
      f.x += f.vx; f.y += f.vy;
      if (f.x < -50) f.x = W + 50; if (f.x > W + 50) f.x = -50;
      if (f.y < 0)   f.y = H * 0.7; if (f.y > H * 0.7) f.y = 0;
      const pulse = Math.sin(t * 0.03 + f.x * 0.01) * 0.5 + 0.5;
      ctx.font      = `${f.size}px "JetBrains Mono", monospace`;
      ctx.fillStyle = `rgba(0,212,255,${f.op * pulse})`;
      ctx.fillText(f.text, f.x, f.y);
    });

    // ── 8. Top header — command deck UI chrome ────────────────────────────────
    // Subtle top bar
    const topBar = ctx.createLinearGradient(0, 0, 0, H * 0.06);
    topBar.addColorStop(0,   "rgba(0,212,255,0.06)");
    topBar.addColorStop(1,   "transparent");
    ctx.fillStyle = topBar; ctx.fillRect(0, 0, W, H * 0.06);

    // Tiny status blips top-right
    if (!reducedMotion) {
      [0.72, 0.78, 0.84].forEach((xp, i) => {
        const active = Math.sin(t * 0.08 + i * 2.1) > 0;
        ctx.fillStyle = active ? "rgba(0,255,180,0.8)" : "rgba(0,212,255,0.25)";
        ctx.beginPath(); ctx.arc(W * xp, H * 0.04, 3, 0, Math.PI * 2); ctx.fill();
      });
    }

    // ── 9. Film grain (subtle, tech feel) ────────────────────────────────────
    if (!reducedMotion) {
      for (let i = 0; i < 120; i++) {
        const gx = Math.random() * W, gy = Math.random() * H;
        ctx.fillStyle = `rgba(0,212,255,${Math.random() * 0.025})`;
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    // ── 10. Vignette ──────────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(W/2, H*0.5, H*0.15, W/2, H*0.5, H*0.78);
    vg.addColorStop(0,   "transparent");
    vg.addColorStop(0.7, "rgba(0,0,0,0.22)");
    vg.addColorStop(1,   "rgba(0,0,0,0.72)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    rafRef.current = requestAnimationFrame(draw);
  }, [reducedMotion, init]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = window.innerWidth; c.height = window.innerHeight;
    init(c.width, c.height);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, init]);

  useEffect(() => {
    const onResize = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = window.innerWidth; c.height = window.innerHeight;
      init(c.width, c.height);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [init]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else { lastRef.current = 0; rafRef.current = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [draw]);

  return <canvas ref={canvasRef} aria-hidden style={{
    position: "absolute", inset: 0, width: "100%", height: "100%",
    pointerEvents: "none", zIndex: 0,
  }}/>;
}