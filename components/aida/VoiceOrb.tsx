"use client";

// AIDA's audio-mode signature animation — the "Decoder Star".
//
// Unique to AIDA (not a generic Siri blob / concentric rings): a sharp
// four-pointed cyan starburst (her ✦ motif) wrapped in a rotating ring of
// radial tick-marks — a "decoder dial" that nods to "AI Decoder Academy".
//
// Four states are distinguished by MOTION + SHAPE, never colour alone
// (colour-blind safe):
//   idle      → slow breathing pulse, dial still
//   listening → ring ripples INWARD, star contracts (she's taking you in)
//   thinking  → dial SPINS, star points elongate (processing)
//   speaking  → rays FLARE outward on voice amplitude + data-sparkles burst
//
// Safety: brightness oscillation is gentle and capped — no strobe/flash. With
// prefers-reduced-motion the canvas falls back to a static star + a soft
// opacity breath (no spin, no particle bursts).
//
// Amplitude (0..1) is supplied by the caller from a Web Audio AnalyserNode
// (mic while listening, TTS output while speaking). When omitted, the orb
// self-animates from its state alone.

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type OrbVariant = "aida" | "bhavna";

interface Props {
  state: OrbState;
  /** Live voice level 0..1 (mic when listening, TTS output when speaking). */
  amplitude?: number;
  /** Rendered px (square). Defaults to 160. */
  size?: number;
  /** Character signature. "aida" = sharp steel-cyan Decoder Star;
   *  "bhavna" = softer warm golden breathing halo. Defaults to "aida". */
  variant?: OrbVariant;
  className?: string;
}

// AIDA — steel-and-cyan signature (matches the AIDA panel chrome).
const CYAN_CORE = "125, 211, 252"; // #7DD3FC sky
const CYAN_MID  = "0, 212, 255";   // #00D4FF
const CYAN_DEEP = "2, 132, 199";   // #0284C7

// Bhavna — warm classroom gold (rounder halo, navy-gold).
const GOLD_CORE = "255, 236, 179"; // #FFECB3 warm white-gold
const GOLD_MID  = "245, 184, 64";  // #F5B840 amber
const GOLD_DEEP = "176, 120, 24";  // #B07818 deep gold

interface Spark {
  ang: number; rad: number; vel: number; life: number; max: number; sz: number;
}

export function VoiceOrb({ state, amplitude = 0, size = 160, variant = "aida", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Latest props read inside the RAF loop without re-subscribing.
  const stateRef = useRef<OrbState>(state);
  const ampRef   = useRef(0);          // smoothed amplitude
  const ampTarget = useRef(0);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { ampTarget.current = Math.max(0, Math.min(1, amplitude)); }, [amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Palette + shape per character. Bhavna uses a rounder inner radius so the
    // star reads as a soft golden halo rather than AIDA's sharp Decoder Star.
    const C0 = variant === "bhavna" ? GOLD_CORE : CYAN_CORE;
    const C1 = variant === "bhavna" ? GOLD_MID  : CYAN_MID;
    const C2 = variant === "bhavna" ? GOLD_DEEP : CYAN_DEEP;
    const innerK = variant === "bhavna" ? 1.7 : 1; // >1 rounds the points into a halo

    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.18;        // star core radius
    const TICKS = 36;                  // decoder-dial tick count

    let spin = 0;                      // dial rotation (thinking)
    let ripple = 0;                    // inward ripple phase (listening)
    let breath = 0;                    // idle/global breathing phase
    const sparks: Spark[] = [];
    let raf = 0;
    let last = performance.now();

    // Four-pointed star path (sharp diamond points) at radius r, rotation rot.
    function starPath(r: number, inner: number, rot: number) {
      ctx!.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = rot + (i * Math.PI) / 4;
        const rr = i % 2 === 0 ? r : inner;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last) / 1000; // clamp big tab-switch gaps
      last = now;

      const st = stateRef.current;
      // Smooth amplitude toward target (snappy up, gentle down).
      const tgt = ampTarget.current;
      ampRef.current += (tgt - ampRef.current) * (tgt > ampRef.current ? 0.35 : 0.12);
      const amp = reduced ? 0 : ampRef.current;

      breath += dt * 1.1;
      if (st === "thinking" && !reduced) spin += dt * 1.6;
      if (st === "listening" && !reduced) ripple = (ripple + dt * 0.9) % 1;

      ctx!.clearRect(0, 0, size, size);

      // ── State-driven geometry ──────────────────────────────────────────
      const breathe = (Math.sin(breath) * 0.5 + 0.5) * 0.08; // 0..0.08 gentle
      let coreScale = 1 + breathe;
      let rayFlare = 0;
      let dialAlpha = 0.22;

      if (st === "listening") {
        coreScale = 0.9 + breathe;          // contracts — "taking you in"
        dialAlpha = 0.3;
      } else if (st === "thinking") {
        coreScale = 1 + breathe * 1.4;
        dialAlpha = 0.4;
      } else if (st === "speaking") {
        coreScale = 1 + breathe + amp * 0.35;
        rayFlare  = amp;                    // rays extend with loudness
        dialAlpha = 0.34 + amp * 0.3;
      }

      const r = baseR * coreScale;

      // ── Outer glow halo (soft, no strobe) ──────────────────────────────
      const haloR = r * (2.4 + rayFlare * 1.1);
      const halo = ctx!.createRadialGradient(cx, cy, r * 0.3, cx, cy, haloR);
      halo.addColorStop(0, `rgba(${C1}, ${0.28 + rayFlare * 0.25})`);
      halo.addColorStop(0.5, `rgba(${C2}, 0.10)`);
      halo.addColorStop(1, `rgba(${C2}, 0)`);
      ctx!.fillStyle = halo;
      ctx!.fillRect(0, 0, size, size);

      // ── Decoder dial — ring of radial ticks ────────────────────────────
      const dialR = r * 1.9;
      for (let i = 0; i < TICKS; i++) {
        const a = spin + (i / TICKS) * Math.PI * 2;
        // Speaking: ticks nearest "12 o'clock" pulse with amplitude for a
        // subtle equaliser feel; otherwise uniform.
        const pulse = st === "speaking"
          ? amp * (0.5 + 0.5 * Math.cos(a - spin)) * 6
          : 0;
        const inner = dialR;
        const outer = dialR + 4 + pulse + (st === "thinking" ? 2 : 0);
        ctx!.beginPath();
        ctx!.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx!.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx!.strokeStyle = `rgba(${C0}, ${dialAlpha})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      // Listening: inward ripple ring collapsing toward the core.
      if (st === "listening" && !reduced) {
        const rr = dialR * (1 - ripple) + r * ripple;
        ctx!.beginPath();
        ctx!.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${C1}, ${0.35 * (1 - ripple)})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }

      // ── The star: outer flare points + bright core ─────────────────────
      const rot = st === "thinking" ? spin * 0.6 : Math.sin(breath * 0.5) * 0.06;

      // Flare points (longer when speaking loud)
      starPath(r * (1.7 + rayFlare * 1.3), r * 0.42 * innerK, rot);
      const flareGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
      flareGrad.addColorStop(0, `rgba(${C0}, ${0.85})`);
      flareGrad.addColorStop(0.6, `rgba(${C1}, ${0.35 + rayFlare * 0.3})`);
      flareGrad.addColorStop(1, `rgba(${C1}, 0)`);
      ctx!.fillStyle = flareGrad;
      ctx!.fill();

      // Solid core star
      starPath(r, r * 0.46 * innerK, rot);
      const coreGrad = ctx!.createRadialGradient(
        cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r,
      );
      coreGrad.addColorStop(0, "rgba(255,255,255,0.95)");
      coreGrad.addColorStop(0.4, `rgba(${C0}, 0.95)`);
      coreGrad.addColorStop(1, `rgba(${C2}, 0.9)`);
      ctx!.fillStyle = coreGrad;
      ctx!.fill();

      // ── Speaking: data-sparkles burst from the star points ─────────────
      if (st === "speaking" && !reduced) {
        if (amp > 0.12 && sparks.length < 60 && Math.random() < amp) {
          const pt = Math.floor(Math.random() * 4) * (Math.PI / 2) + rot;
          sparks.push({
            ang: pt + (Math.random() - 0.5) * 0.5,
            rad: r * 1.6,
            vel: 24 + amp * 70 + Math.random() * 30,
            life: 0, max: 0.5 + Math.random() * 0.4,
            sz: 1 + Math.random() * 1.8,
          });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        s.rad  += s.vel * dt;
        if (s.life >= s.max) { sparks.splice(i, 1); continue; }
        const k = 1 - s.life / s.max;
        ctx!.beginPath();
        ctx!.arc(cx + Math.cos(s.ang) * s.rad, cy + Math.sin(s.ang) * s.rad, s.sz * k, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${C0}, ${0.9 * k})`;
        ctx!.fill();
      }
    }

    raf = requestAnimationFrame(frame);

    // Pause when tab hidden (battery + correctness).
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [size, variant]);

  const label =
    state === "listening" ? "Listening" :
    state === "thinking"  ? "Thinking"  :
    state === "speaking"  ? "Speaking"  : "Tap to talk";
  const who = variant === "bhavna" ? "Bhavna" : "AIDA";

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${who} — ${label}`}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
