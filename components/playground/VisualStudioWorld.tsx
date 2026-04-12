"use client";

/**
 * VisualStudioWorld — Arena 4: Visual Studio
 * Accent: #00FF94 neon green
 * Vibe: inside a living paint canvas — aurora ribbons, drifting paint blobs,
 *       brush stroke streaks, colour-shift waves, artist's grid faintly visible
 */

import { useEffect, useRef, useCallback } from "react";

interface Props { reducedMotion?: boolean; }

interface PaintBlob {
  x: number; y: number; vx: number; vy: number;
  r: number; hue: number; op: number;
  wobble: number; wobbleSpeed: number;
}

interface BrushStroke {
  x: number; y: number; angle: number;
  len: number; width: number; hue: number; op: number;
}

interface PaintParticle {
  x: number; y: number; vx: number; vy: number;
  r: number; hue: number; op: number; life: number; maxLife: number;
}

export function VisualStudioWorld({ reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const lastRef   = useRef(0);

  const stateRef = useRef({
    blobs:      [] as PaintBlob[],
    strokes:    [] as BrushStroke[],
    particles:  [] as PaintParticle[],
    hueShift:   0,
    initialized: false,
  });

  // Studio palette — neon green anchor, with cyan + emerald + lime
  const HUES = [155, 165, 140, 175, 130, 160]; // greens and teals

  const init = useCallback((W: number, H: number) => {
    const blobs: PaintBlob[] = Array.from({ length: reducedMotion ? 6 : 14 }, (_, i) => ({
      x:           Math.random() * W,
      y:           Math.random() * H,
      vx:          (Math.random() - 0.5) * 0.35,
      vy:          (Math.random() - 0.5) * 0.25,
      r:           Math.random() * 90 + 50,
      hue:         HUES[i % HUES.length],
      op:          Math.random() * 0.12 + 0.04,
      wobble:      0,
      wobbleSpeed: Math.random() * 0.02 + 0.008,
    }));

    const strokes: BrushStroke[] = Array.from({ length: reducedMotion ? 4 : 22 }, (_, i) => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      angle: Math.random() * Math.PI,
      len:   Math.random() * 120 + 40,
      width: Math.random() * 8 + 2,
      hue:   HUES[i % HUES.length],
      op:    Math.random() * 0.1 + 0.03,
    }));

    stateRef.current = { blobs, strokes, particles: [], hueShift: 0, initialized: true };
  }, [reducedMotion]);

  const spawnParticle = (W: number, H: number): PaintParticle => ({
    x:       Math.random() * W,
    y:       H + 10,
    vx:      (Math.random() - 0.5) * 1.2,
    vy:      -(Math.random() * 1.5 + 0.5),
    r:       Math.random() * 4 + 1,
    hue:     HUES[Math.floor(Math.random() * HUES.length)],
    op:      Math.random() * 0.65 + 0.25,
    life:    0,
    maxLife: Math.random() * 150 + 80,
  });

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
    const W = canvas.width; const H = canvas.height;
    const st = stateRef.current;
    if (!st.initialized) init(W, H);

    // ── 1. Base — deep canvas dark green-black ────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,    "#020e08");
    bg.addColorStop(0.35, "#031208");
    bg.addColorStop(0.7,  "#020f09");
    bg.addColorStop(1,    "#010a05");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── 2. Canvas grid — faint artist's grid ─────────────────────────────────
    ctx.strokeStyle = "rgba(0,255,148,0.035)";
    ctx.lineWidth   = 0.6;
    const gridSize  = 55;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ── 3. Aurora ribbons — slow shifting waves ───────────────────────────────
    st.hueShift = (st.hueShift + (reducedMotion ? 0 : 0.08)) % 360;
    for (let band = 0; band < 4; band++) {
      const phase   = band * Math.PI / 2;
      const baseY   = H * (0.15 + band * 0.18);
      const hue     = HUES[band % HUES.length] + Math.sin(t * 0.004 + phase) * 15;
      const amp     = H * 0.06;

      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= W; x += 4) {
        const y = baseY + Math.sin(x * 0.008 + t * 0.015 + phase) * amp
                        + Math.sin(x * 0.004 + t * 0.008 + phase * 2) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
      const auroraGrad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2);
      auroraGrad.addColorStop(0,    `hsla(${hue},100%,55%,0)`);
      auroraGrad.addColorStop(0.4,  `hsla(${hue},100%,60%,0.09)`);
      auroraGrad.addColorStop(0.7,  `hsla(${hue},100%,55%,0.05)`);
      auroraGrad.addColorStop(1,    `hsla(${hue},100%,50%,0)`);
      ctx.fillStyle = auroraGrad; ctx.fill();
    }

    // ── 4. Paint blobs — large drifting colour masses ─────────────────────────
    st.blobs.forEach(b => {
      if (!reducedMotion) {
        b.x += b.vx; b.y += b.vy;
        b.wobble += b.wobbleSpeed;
        if (b.x < -b.r * 2) b.x = W + b.r;
        if (b.x > W + b.r * 2) b.x = -b.r;
        if (b.y < -b.r * 2) b.y = H + b.r;
        if (b.y > H + b.r * 2) b.y = -b.r;
      }
      const wobbledR = b.r + Math.sin(b.wobble) * b.r * 0.15;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, wobbledR);
      g.addColorStop(0,   `hsla(${b.hue},100%,58%,${b.op * 1.4})`);
      g.addColorStop(0.5, `hsla(${b.hue},90%,52%,${b.op * 0.7})`);
      g.addColorStop(1,   "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, wobbledR, 0, Math.PI * 2); ctx.fill();
    });

    // ── 5. Brush strokes — static textured marks ─────────────────────────────
    st.strokes.forEach(s => {
      const pulse = reducedMotion ? 1 : Math.sin(t * 0.025 + s.x * 0.005) * 0.3 + 0.7;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      const sg = ctx.createLinearGradient(-s.len/2, 0, s.len/2, 0);
      sg.addColorStop(0,   "transparent");
      sg.addColorStop(0.2, `hsla(${s.hue},100%,60%,${s.op * pulse})`);
      sg.addColorStop(0.8, `hsla(${s.hue},100%,58%,${s.op * pulse})`);
      sg.addColorStop(1,   "transparent");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(0, 0, s.len / 2, s.width / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // ── 6. Rising paint particles ─────────────────────────────────────────────
    if (!reducedMotion) {
      if (Math.random() < 0.12) st.particles.push(spawnParticle(W, H));
      st.particles = st.particles.filter(p => {
        p.life++; p.x += p.vx; p.y += p.vy; p.vy -= 0.01;
        if (p.life >= p.maxLife || p.y < -20) return false;
        const fade = p.life < 20 ? p.life / 20 : p.life > p.maxLife * 0.75
          ? 1 - (p.life - p.maxLife * 0.75) / (p.maxLife * 0.25) : 1;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0,   `hsla(${p.hue},100%,62%,${p.op * fade * 0.6})`);
        g.addColorStop(1,   "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${p.hue},100%,75%,${p.op * fade})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        return true;
      });
    }

    // ── 7. Colour spectrum band at bottom ────────────────────────────────────
    const specH = H * 0.025;
    for (let x = 0; x < W; x += 2) {
      const hue = (x / W * 60 + 130 + t * 0.2) % 360; // greens/teals
      ctx.fillStyle = `hsla(${hue},100%,55%,0.08)`;
      ctx.fillRect(x, H - specH, 2, specH);
    }

    // ── 8. Vignette ───────────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.82);
    vg.addColorStop(0,   "transparent");
    vg.addColorStop(0.6, "rgba(0,0,0,0.20)");
    vg.addColorStop(1,   "rgba(0,0,0,0.70)");
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