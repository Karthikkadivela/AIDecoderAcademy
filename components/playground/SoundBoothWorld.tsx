"use client";

/**
 * SoundBoothWorld — Arena 5: Sound Booth
 * Accent: #FF2D78 neon pink
 * Vibe: inside a professional recording studio / concert stage
 * - Live EQ bars pulsing across the bottom
 * - Horizontal soundwave lines scanning at different speeds
 * - Stage monitor glow from below (pink-magenta)
 * - Acoustic panel texture on sides
 * - Floating frequency rings emanating from centre
 * - Microphone silhouette in background
 */

import { useEffect, useRef, useCallback } from "react";

interface Props { reducedMotion?: boolean; }

interface EQBar {
  x: number; height: number; targetH: number; color: string;
}

interface WaveLine {
  y: number; amplitude: number; frequency: number; phase: number;
  speed: number; opacity: number; color: string;
}

interface FreqRing {
  r: number; maxR: number; op: number; speed: number;
}

export function SoundBoothWorld({ reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const lastRef   = useRef(0);

  const stateRef = useRef({
    eqBars:   [] as EQBar[],
    waves:    [] as WaveLine[],
    rings:    [] as FreqRing[],
    initialized: false,
  });

  const PINK  = "#FF2D78";
  const PINK2 = "#FF1493";
  const MAG   = "#CC00AA";

  const init = useCallback((W: number, H: number) => {
    const barCount = reducedMotion ? 20 : 48;
    const barW     = W / barCount;
    const eqBars: EQBar[] = Array.from({ length: barCount }, (_, i) => ({
      x:       i * barW,
      height:  Math.random() * H * 0.15 + H * 0.02,
      targetH: Math.random() * H * 0.18 + H * 0.02,
      color:   i % 3 === 0 ? PINK : i % 3 === 1 ? PINK2 : MAG,
    }));

    const waves: WaveLine[] = Array.from({ length: reducedMotion ? 4 : 9 }, (_, i) => ({
      y:         H * (0.15 + i * 0.08),
      amplitude: Math.random() * 18 + 5,
      frequency: Math.random() * 0.015 + 0.006,
      phase:     Math.random() * Math.PI * 2,
      speed:     (Math.random() - 0.5) * 0.04 + (i % 2 === 0 ? 0.025 : -0.025),
      opacity:   Math.random() * 0.18 + 0.05,
      color:     i % 2 === 0 ? PINK : MAG,
    }));

    stateRef.current = { eqBars, waves, rings: [], initialized: true };
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
    const W = canvas.width; const H = canvas.height;
    const st = stateRef.current;
    if (!st.initialized) init(W, H);

    // ── 1. Base — deep studio dark ────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   "#08020e");
    bg.addColorStop(0.4, "#0a0312");
    bg.addColorStop(0.8, "#0c0318");
    bg.addColorStop(1,   "#060108");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── 2. Stage monitor glow — pink rising from below ────────────────────────
    const pulse = Math.sin(t * 0.04) * 0.15 + 0.85;
    const mg = ctx.createRadialGradient(W/2, H, 0, W/2, H, H * 0.65);
    mg.addColorStop(0,    `rgba(255,45,120,${0.38 * pulse})`);
    mg.addColorStop(0.25, `rgba(200,0,100,${0.18 * pulse})`);
    mg.addColorStop(0.6,  `rgba(150,0,80,${0.07 * pulse})`);
    mg.addColorStop(1,    "transparent");
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);

    // Side stage monitor fills
    [[0, H * 0.6, W * 0.12, H * 0.4], [W * 0.88, H * 0.6, W * 0.12, H * 0.4]].forEach(([x, y, w, h]) => {
      const sg = ctx.createLinearGradient(x, y + h, x + w, y);
      sg.addColorStop(0,   `rgba(255,45,120,${0.28 * pulse})`);
      sg.addColorStop(0.4, `rgba(200,0,90,${0.12 * pulse})`);
      sg.addColorStop(1,   "transparent");
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
    });

    // ── 3. Acoustic panel texture — sides ────────────────────────────────────
    const panelW = W * 0.085;
    const panelH = 38;
    const panelRows = Math.ceil(H / panelH);
    [[0, panelW], [W - panelW, panelW]].forEach(([startX]) => {
      for (let row = 0; row < panelRows; row++) {
        const py = row * panelH;
        const isAlt = row % 2 === 0;
        ctx.fillStyle = isAlt
          ? "rgba(30,5,20,0.75)"
          : "rgba(22,3,15,0.75)";
        ctx.fillRect(startX, py, panelW, panelH - 1);
        // Panel highlight edge
        ctx.fillStyle = "rgba(255,45,120,0.06)";
        ctx.fillRect(startX, py, panelW, 1);
      }
      // Panel shadow
      const shade = ctx.createLinearGradient(startX === 0 ? 0 : W - panelW, 0, startX === 0 ? panelW : W, 0);
      shade.addColorStop(0,   "rgba(0,0,0,0.55)");
      shade.addColorStop(1,   "transparent");
      if (startX !== 0) shade.addColorStop(0, "transparent");
      ctx.fillStyle = shade; ctx.fillRect(startX, 0, panelW, H);
    });

    // ── 4. Horizontal soundwave lines ─────────────────────────────────────────
    st.waves.forEach(w => {
      if (!reducedMotion) w.phase += w.speed;
      ctx.beginPath();
      ctx.moveTo(0, w.y);
      for (let x = 0; x <= W; x += 3) {
        // Multiple harmonics for richer wave
        const y = w.y
          + Math.sin(x * w.frequency + w.phase) * w.amplitude
          + Math.sin(x * w.frequency * 2.3 + w.phase * 1.7) * w.amplitude * 0.35
          + Math.sin(x * w.frequency * 0.5 + w.phase * 0.4) * w.amplitude * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `${w.color}${Math.round(w.opacity * 255).toString(16).padStart(2,"0")}`;
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    });

    // ── 5. Frequency rings from centre ────────────────────────────────────────
    if (!reducedMotion) {
      if (t % 28 === 0) {
        st.rings.push({ r: 0, maxR: Math.max(W, H) * 0.6, op: 0.45, speed: 2.2 });
      }
      st.rings = st.rings.filter(ring => {
        ring.r    += ring.speed;
        ring.op   *= 0.975;
        if (ring.r > ring.maxR || ring.op < 0.01) return false;
        const fade = 1 - ring.r / ring.maxR;
        ctx.strokeStyle = `rgba(255,45,120,${ring.op * fade})`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.42, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        return true;
      });
    }

    // ── 6. Microphone silhouette ───────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle   = PINK;
    const micX = W / 2, micY = H * 0.38;
    const micW = W * 0.025, micH = H * 0.12;
    // Capsule body
    ctx.beginPath();
    ctx.roundRect(micX - micW/2, micY - micH/2, micW, micH, micW/2);
    ctx.fill();
    // Stand
    ctx.fillRect(micX - 1, micY + micH/2, 2, H * 0.06);
    ctx.beginPath();
    ctx.arc(micX, micY + micH/2 + H * 0.06, W * 0.02, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 7. EQ bars at bottom ─────────────────────────────────────────────────
    const barW  = W / st.eqBars.length;
    const barY  = H * 0.94;
    st.eqBars.forEach((bar, i) => {
      // Animate toward target
      if (!reducedMotion) {
        bar.height += (bar.targetH - bar.height) * 0.12;
        if (Math.abs(bar.height - bar.targetH) < 2) {
          bar.targetH = H * 0.02 + Math.random() * H * 0.22
            * (0.5 + 0.5 * Math.sin(t * 0.06 + i * 0.4));
        }
      }
      const barPulse = Math.sin(t * 0.05 + i * 0.22) * 0.25 + 0.75;
      const alpha    = 0.55 * barPulse;

      // Bar gradient
      const bg2 = ctx.createLinearGradient(0, barY - bar.height, 0, barY);
      bg2.addColorStop(0,   `rgba(255,45,120,${alpha})`);
      bg2.addColorStop(0.5, `rgba(200,0,90,${alpha * 0.7})`);
      bg2.addColorStop(1,   `rgba(150,0,60,${alpha * 0.4})`);
      ctx.fillStyle = bg2;
      ctx.fillRect(bar.x + 1, barY - bar.height, barW - 2, bar.height);

      // Top cap glow
      ctx.fillStyle = `rgba(255,100,160,${alpha * 0.9})`;
      ctx.fillRect(bar.x + 1, barY - bar.height - 2, barW - 2, 2);
    });

    // EQ reflection below
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.scale(1, -0.25);
    ctx.translate(0, -H * 4 - H * 0.06 * 4);
    st.eqBars.forEach(bar => {
      const bg2 = ctx.createLinearGradient(0, -barY + bar.height, 0, -barY);
      bg2.addColorStop(0, "rgba(255,45,120,0.3)");
      bg2.addColorStop(1, "transparent");
      ctx.fillStyle = bg2;
      ctx.fillRect(bar.x + 1, barY - bar.height, barW - 2, bar.height);
    });
    ctx.restore();

    // ── 8. Vignette ───────────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(W/2, H*0.45, H*0.15, W/2, H*0.45, H*0.82);
    vg.addColorStop(0,   "transparent");
    vg.addColorStop(0.65,"rgba(0,0,0,0.20)");
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