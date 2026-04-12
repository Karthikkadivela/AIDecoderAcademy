"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props { reducedMotion?: boolean; }

export function CinemaWorld({ reducedMotion = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const lastRef   = useRef(0);

  const stateRef = useRef({
    spotAngle: 0,
    dust: [] as { x:number; y:number; vx:number; vy:number; r:number; op:number }[],
    initialized: false,
  });

  const init = useCallback((W: number, H: number) => {
    stateRef.current = {
      spotAngle: 0,
      dust: Array.from({ length: reducedMotion ? 12 : 70 }, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H * 0.72,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.14,
        r:  Math.random() * 1.4 + 0.3,
        op: Math.random() * 0.55 + 0.2,
      })),
      initialized: true,
    };
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

    // ── 1. Rich cinema background ─────────────────────────────────────────────
    // Deep crimson-black — classic cinema walls
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   "#150608");
    bg.addColorStop(0.4, "#120408");
    bg.addColorStop(0.75,"#0e0306");
    bg.addColorStop(1,   "#0a0204");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Bright screen — the hero of the scene ──────────────────────────────
    // The screen IS bright — it's showing a film. This is the light source.
    const screenY   = H * 0.048;
    const screenW   = W * 0.72;
    const screenX   = (W - screenW) / 2;
    const screenH   = H * 0.052;

    // Screen light floods the whole upper space
    const screenFlood = ctx.createRadialGradient(W/2, screenY, 0, W/2, screenY + screenH/2, H * 0.75);
    screenFlood.addColorStop(0,    "rgba(230,255,180,0.60)");
    screenFlood.addColorStop(0.1,  "rgba(210,255,150,0.35)");
    screenFlood.addColorStop(0.28, "rgba(190,240,120,0.15)");
    screenFlood.addColorStop(0.55, "rgba(170,220,100,0.06)");
    screenFlood.addColorStop(1,    "transparent");
    ctx.fillStyle = screenFlood;
    ctx.fillRect(0, 0, W, H * 0.75);

    // Screen frame — slightly darker border
    ctx.fillStyle = "rgba(20,8,10,0.9)";
    ctx.fillRect(screenX - 4, screenY - 4, screenW + 8, screenH + 8);

    // Screen surface — warm white, like a film playing
    const scrGrad = ctx.createLinearGradient(0, screenY, 0, screenY + screenH);
    scrGrad.addColorStop(0,   "rgba(240,255,200,0.98)");
    scrGrad.addColorStop(0.4, "rgba(230,255,180,0.94)");
    scrGrad.addColorStop(1,   "rgba(215,250,160,0.90)");
    ctx.fillStyle = scrGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Film playing — volt-green scene tones
    ctx.fillStyle = "rgba(180,255,0,0.08)";
    ctx.fillRect(screenX, screenY, screenW * 0.5, screenH);
    ctx.fillStyle = "rgba(255,255,150,0.10)";
    ctx.fillRect(screenX + screenW * 0.5, screenY, screenW * 0.5, screenH);

    // ── 3. Projector beam — warm, volumetric ─────────────────────────────────
    st.spotAngle += reducedMotion ? 0 : 0.0025;
    const projX = W * 0.5 + Math.sin(st.spotAngle) * W * 0.04;
    // Projector is at rear ceiling
    const projY = H * 0.05;

    // Atmospheric outer cone — very wide, very faint
    ctx.save();
    const atmPath = new Path2D();
    atmPath.moveTo(projX - W * 0.04, projY);
    atmPath.lineTo(projX + W * 0.04, projY);
    atmPath.lineTo(projX + W * 0.48, H * 0.9);
    atmPath.lineTo(projX - W * 0.48, H * 0.9);
    atmPath.closePath();
    const atmGrad = ctx.createLinearGradient(0, projY, 0, H * 0.9);
    atmGrad.addColorStop(0,    "rgba(220,255,120,0.22)");
    atmGrad.addColorStop(0.15, "rgba(210,255,100,0.12)");
    atmGrad.addColorStop(0.45, "rgba(195,245,80,0.05)");
    atmGrad.addColorStop(1,    "rgba(180,230,60,0.01)");
    ctx.fillStyle = atmGrad;
    ctx.fill(atmPath);
    ctx.restore();

    // Main beam — medium cone, visible but not garish
    ctx.save();
    const mainPath = new Path2D();
    mainPath.moveTo(projX - W * 0.016, projY);
    mainPath.lineTo(projX + W * 0.016, projY);
    mainPath.lineTo(projX + W * 0.22, H * 0.88);
    mainPath.lineTo(projX - W * 0.22, H * 0.88);
    mainPath.closePath();
    const mainGrad = ctx.createLinearGradient(0, projY, 0, H * 0.88);
    mainGrad.addColorStop(0,    "rgba(215,255,100,0.45)");
    mainGrad.addColorStop(0.12, "rgba(210,255,90,0.24)");
    mainGrad.addColorStop(0.4,  "rgba(200,248,70,0.10)");
    mainGrad.addColorStop(0.75, "rgba(185,235,50,0.03)");
    mainGrad.addColorStop(1,    "transparent");
    ctx.fillStyle = mainGrad;
    ctx.fill(mainPath);
    ctx.restore();

    // Bright inner core — near projector lens
    ctx.save();
    const corePath = new Path2D();
    corePath.moveTo(projX - W * 0.005, projY);
    corePath.lineTo(projX + W * 0.005, projY);
    corePath.lineTo(projX + W * 0.065, H * 0.55);
    corePath.lineTo(projX - W * 0.065, H * 0.55);
    corePath.closePath();
    const coreGrad = ctx.createLinearGradient(0, projY, 0, H * 0.55);
    coreGrad.addColorStop(0,    "rgba(230,255,160,0.60)");
    coreGrad.addColorStop(0.3,  "rgba(220,255,140,0.22)");
    coreGrad.addColorStop(0.7,  "rgba(205,245,110,0.07)");
    coreGrad.addColorStop(1,    "transparent");
    ctx.fillStyle = coreGrad;
    ctx.fill(corePath);
    ctx.restore();

    // ── 4. Side walls with luxury texture ────────────────────────────────────
    // Left wall — deep velvet red
    const lw = ctx.createLinearGradient(0, 0, W * 0.2, 0);
    lw.addColorStop(0,    "rgba(90,14,22,0.85)");
    lw.addColorStop(0.35, "rgba(65,10,16,0.55)");
    lw.addColorStop(0.7,  "rgba(45,7,12,0.25)");
    lw.addColorStop(1,    "transparent");
    ctx.fillStyle = lw; ctx.fillRect(0, 0, W * 0.2, H);

    const rw = ctx.createLinearGradient(W, 0, W * 0.8, 0);
    rw.addColorStop(0,    "rgba(90,14,22,0.85)");
    rw.addColorStop(0.35, "rgba(65,10,16,0.55)");
    rw.addColorStop(0.7,  "rgba(45,7,12,0.25)");
    rw.addColorStop(1,    "transparent");
    ctx.fillStyle = rw; ctx.fillRect(W * 0.8, 0, W * 0.2, H);

    // Wall sconces — pairs of warm amber lights
    const sconces = [
      [W * 0.032, H * 0.35], [W * 0.032, H * 0.52],
      [W * 0.968, H * 0.35], [W * 0.968, H * 0.52],
    ];
    sconces.forEach(([sx, sy]) => {
      // Warm cone upward
      const up = ctx.createRadialGradient(sx, sy, 0, sx, sy - H * 0.06, W * 0.07);
      up.addColorStop(0,   "rgba(255,190,90,0.55)");
      up.addColorStop(0.4, "rgba(220,140,50,0.20)");
      up.addColorStop(1,   "transparent");
      ctx.fillStyle = up; ctx.beginPath(); ctx.arc(sx, sy - H * 0.03, W * 0.07, 0, Math.PI * 2); ctx.fill();
      // Sconce body
      ctx.fillStyle = "rgba(255,210,120,0.85)";
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
    });

    // ── 5. Ceiling — projector booth visible ─────────────────────────────────
    // Dark ceiling with projector window
    ctx.fillStyle = "rgba(8,2,4,0.65)";
    ctx.fillRect(0, 0, W, H * 0.09);

    // Projector booth window — small rectangle emitting beam
    const boothW = W * 0.04, boothH = H * 0.025;
    const boothX = projX - boothW / 2;
    const boothY = H * 0.03;
    ctx.fillStyle = "rgba(200,255,0,0.75)";
    ctx.fillRect(boothX, boothY, boothW, boothH);
    ctx.fillStyle = "rgba(230,255,120,0.95)";
    ctx.fillRect(boothX + boothW * 0.1, boothY + boothH * 0.1, boothW * 0.8, boothH * 0.8);

    // Ceiling coffer grid
    ctx.strokeStyle = "rgba(50,15,20,0.2)";
    ctx.lineWidth = 0.6;
    for (let cx = 0; cx < W; cx += W / 10) {
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H * 0.09); ctx.stroke();
    }

    // ── 6. Dust in beam ───────────────────────────────────────────────────────
    const beamHalfAt = (y: number) => {
      const p = Math.max(0, (y - projY) / (H * 0.88 - projY));
      return W * 0.016 + (W * 0.22 - W * 0.016) * p;
    };
    st.dust.forEach(d => {
      d.x += d.vx + Math.sin(t * 0.008 + d.y * 0.009) * 0.08;
      d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < projY) d.y = H * 0.70;
      if (d.y > H * 0.70) d.y = projY;
      const half = beamHalfAt(d.y);
      const dist = Math.abs(d.x - projX);
      const vis  = dist < half ? Math.pow(1 - dist / half, 1.6) : 0;
      if (vis < 0.04) return;
      ctx.fillStyle = `rgba(220,255,140,${d.op * vis})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    });

    // ── 7. Audience seats — rich velvet red, not just black ───────────────────
    // Back row seat backs — dark crimson velvet
    const bR = Math.min(W / 52, 14);
    const bCount = Math.floor(W / (bR * 3.4));
    const bGap   = W / bCount;
    const bY     = H * 0.695;

    for (let i = 0; i < bCount; i++) {
      const cx = bGap * (i + 0.5) + (i % 2 === 0 ? 2 : -2);

      // Seat back — dark red velvet catching the screen glow
      const seatLight = Math.max(0, 0.4 - Math.abs(cx - W/2) / (W * 0.6));
      ctx.fillStyle = `rgba(${55 + seatLight * 40},${6 + seatLight * 4},${10 + seatLight * 6},0.92)`;
      ctx.beginPath();
      ctx.roundRect(cx - bR * 0.85, bY - bR * 0.9, bR * 1.7, bR * 1.3, [bR * 0.35, bR * 0.35, 0, 0]);
      ctx.fill();

      // Head — dark silhouette, slight warm edge from screen light
      ctx.fillStyle = `rgba(${12 + seatLight * 15},${4 + seatLight * 5},${5 + seatLight * 5},1)`;
      ctx.beginPath(); ctx.ellipse(cx, bY - bR * 1.15, bR * 0.72, bR * 0.88, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Front row — larger, lower, with more visible seat detail
    const fR = Math.min(W / 38, 18);
    const fCount = Math.floor(W / (fR * 3.0));
    const fGap   = W / fCount;
    const fY     = H * 0.835;

    for (let i = 0; i < fCount; i++) {
      const cx = fGap * (i + 0.5) + (i % 3 === 0 ? 3 : i % 3 === 1 ? -3 : 0);
      const seatLight = Math.max(0, 0.5 - Math.abs(cx - W/2) / (W * 0.55));

      // Seat back — warmer, catches screen glow more
      ctx.fillStyle = `rgba(${70 + seatLight * 55},${8 + seatLight * 6},${12 + seatLight * 8},0.95)`;
      ctx.beginPath();
      ctx.roundRect(cx - fR * 0.92, fY - fR * 1.05, fR * 1.84, fR * 1.5, [fR * 0.38, fR * 0.38, 0, 0]);
      ctx.fill();

      // Head — larger, person sitting close to us
      ctx.fillStyle = `rgba(${18 + seatLight * 20},${5 + seatLight * 6},${6 + seatLight * 6},1)`;
      ctx.beginPath(); ctx.ellipse(cx, fY - fR * 1.28, fR * 0.82, fR * 0.98, 0, 0, Math.PI * 2); ctx.fill();

      // Neck
      ctx.beginPath(); ctx.ellipse(cx, fY - fR * 0.22, fR * 0.38, fR * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    }

    // ── 8. Floor — aisle with amber guide lights ──────────────────────────────
    ctx.fillStyle = "#080203";
    ctx.fillRect(0, H * 0.90, W, H * 0.10);

    // Aisle lighting — small warm dots at floor level
    const dotCount = Math.floor(W / 80);
    for (let i = 0; i < dotCount; i++) {
      const dx = (i + 0.5) * (W / dotCount);
      const dy = H * 0.915;
      const flicker = Math.sin(t * 0.03 + i * 1.3) * 0.1 + 0.9;
      const ag = ctx.createRadialGradient(dx, dy, 0, dx, dy, 12);
      ag.addColorStop(0,   `rgba(200,255,0,${0.65 * flicker})`);
      ag.addColorStop(0.5, `rgba(160,220,0,${0.22 * flicker})`);
      ag.addColorStop(1,   "transparent");
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(dx, dy, 12, 0, Math.PI * 2); ctx.fill();
    }

    // Exit signs
    [[W * 0.018, H * 0.895], [W * 0.982, H * 0.895]].forEach(([ex, ey]) => {
      ctx.fillStyle = "rgba(200,30,30,0.9)";
      ctx.fillRect(ex - 18, ey - 4, 36, 7);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("EXIT", ex, ey + 1);
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 28);
      eg.addColorStop(0,   "rgba(255,30,30,0.35)");
      eg.addColorStop(1,   "transparent");
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 28, 0, Math.PI * 2); ctx.fill();
    });

    // ── 9. Film grain ─────────────────────────────────────────────────────────
    if (!reducedMotion) {
      for (let i = 0; i < 180; i++) {
        const gx = Math.random() * W, gy = Math.random() * H;
        const go = Math.random() * 0.06 + 0.01;
        const gv = Math.random() > 0.5 ? 240 : 10;
        ctx.fillStyle = `rgba(${gv},${gv},${gv},${go})`;
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    // ── 10. Letterbox + frame ─────────────────────────────────────────────────
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H * 0.048);           // top bar (hides above screen)
    ctx.fillRect(0, H * 0.952, W, H * 0.048);   // bottom bar

    // ── 11. Vignette ──────────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(W/2, H * 0.42, H * 0.1, W/2, H * 0.42, H * 0.8);
    vg.addColorStop(0,   "transparent");
    vg.addColorStop(0.65,"rgba(0,0,0,0.18)");
    vg.addColorStop(1,   "rgba(0,0,0,0.68)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    rafRef.current = requestAnimationFrame(draw);
  }, [reducedMotion, init]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    init(canvas.width, canvas.height);
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

  return (
    <canvas ref={canvasRef} aria-hidden style={{
      position: "absolute", inset: 0,
      width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0,
    }}/>
  );
}