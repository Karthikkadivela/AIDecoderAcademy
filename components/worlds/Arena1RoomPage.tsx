"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Lock } from "lucide-react";
import { getArenaObjectives, getCompletedObjectives, type Objective } from "@/lib/objectives";

// ── Theme ─────────────────────────────────────────────────────────────────────
const ACCENT      = "#7C3AED";
const ACCENT_GLOW = "rgba(124,58,237,0.45)";

const OUTPUT_META: Record<string, { label: string; color: string }> = {
  text:   { label: "Text",   color: "#C4B5FD" },
  json:   { label: "JSON",   color: "#7BFFC4" },
  image:  { label: "Image",  color: "#7AEFFF" },
  audio:  { label: "Audio",  color: "#FF8FB8" },
  slides: { label: "Slides", color: "#C8FF00" },
};

// ── Ambient canvas particles ──────────────────────────────────────────────────
function AmbientParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; va: number };
    const particles: P[] = [];

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const W = () => canvas.width;
    const H = () => canvas.height;

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: Math.random() * W(), y: Math.random() * H(),
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -(Math.random() * 0.16 + 0.04),
        a: Math.random(),
        va: (Math.random() - 0.5) * 0.004,
      });
    }

    let last = 0;
    const draw = (t: number) => {
      rafId = requestAnimationFrame(draw);
      if (t - last < 34) return; // ~30 fps
      last = t;
      ctx.clearRect(0, 0, W(), H());
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.a = Math.max(0, Math.min(1, p.a + p.va));
        if (p.a <= 0 || p.a >= 1) p.va *= -1;
        if (p.y < -4)  { p.y = H() + 4; p.x = Math.random() * W(); }
        if (p.x < 0)     p.x = W();
        if (p.x > W())   p.x = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,58,237,${(p.a * 0.55).toFixed(2)})`;
        ctx.fill();
      }
    };
    rafId = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}

// ── Holographic mission panel ─────────────────────────────────────────────────
function HoloPanel({
  obj, index, completed, unlocked, launching, onClick, size = "normal",
}: {
  obj: Objective;
  index: number;
  completed: boolean;
  unlocked: boolean;
  launching: boolean;
  onClick: () => void;
  size?: "normal" | "large";
}) {
  const out = OUTPUT_META[obj.outputType] ?? OUTPUT_META.text;
  const num = String(obj.order).padStart(2, "0");
  const [hov, setHov] = useState(false);

  const glowColor = completed
    ? `0 0 30px rgba(124,58,237,0.5), inset 0 0 24px rgba(124,58,237,0.08)`
    : hov
    ? `0 0 44px rgba(124,58,237,0.6), 0 14px 44px rgba(0,0,0,0.65), inset 0 0 30px rgba(124,58,237,0.07)`
    : `0 4px 28px rgba(0,0,0,0.6)`;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.055 + 0.22, duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.button
        whileHover={unlocked ? { scale: 1.028 } : {}}
        whileTap={unlocked   ? { scale: 0.972 } : {}}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        disabled={!unlocked || !!launching}
        className="w-full h-full text-left block"
        style={{ cursor: unlocked ? "pointer" : "not-allowed" }}
      >
        <div
          className="relative w-full h-full rounded-xl overflow-hidden flex flex-col"
          style={{
            padding:        size === "large" ? "clamp(10px,1.35vw,17px)" : "clamp(8px,1vw,13px)",
            gap:            "clamp(4px,0.55vw,7px)",
            background:     completed ? "rgba(124,58,237,0.14)" : hov ? "rgba(18,9,46,0.93)" : "rgba(6,4,20,0.88)",
            border:         `1px solid ${completed ? "rgba(124,58,237,0.58)" : hov ? "rgba(124,58,237,0.48)" : "rgba(124,58,237,0.2)"}`,
            backdropFilter: "blur(22px)",
            boxShadow:      glowColor,
            transition:     "background 0.22s, border-color 0.22s, box-shadow 0.22s",
            minHeight:      size === "large" ? "clamp(88px,10.5vh,138px)" : "clamp(76px,9.5vh,118px)",
          }}
        >
          {/* Top accent stripe */}
          <div className="absolute top-0 left-0 right-0 rounded-t-xl" style={{
            height: 2,
            background: completed ? ACCENT : hov ? `${ACCENT}99` : `${ACCENT}30`,
            transition: "background 0.22s",
          }} />

          {/* Scan line sweep */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div style={{
              position:       "absolute",
              left:           0, right: 0,
              height:         40,
              background:     `linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.18) 50%, transparent 100%)`,
              opacity:        hov ? 0.9 : 0.22,
              transition:     "opacity 0.22s",
              animation:      `holoScan ${3.2 + (index % 4) * 0.55}s linear infinite`,
              animationDelay: `-${(index * 0.6) % 3.5}s`,
            }} />
          </div>

          {/* Corner brackets */}
          {(["tl","tr","bl","br"] as const).map(corner => (
            <div key={corner} style={{
              position:     "absolute",
              top:          corner.startsWith("t") ? 6 : undefined,
              bottom:       corner.startsWith("b") ? 6 : undefined,
              left:         corner.endsWith("l") ? 6 : undefined,
              right:        corner.endsWith("r") ? 6 : undefined,
              width:        10, height: 10,
              borderTop:    corner.startsWith("t") ? `1.5px solid ${ACCENT}${hov ? "bb" : "44"}` : undefined,
              borderBottom: corner.startsWith("b") ? `1.5px solid ${ACCENT}${hov ? "bb" : "44"}` : undefined,
              borderLeft:   corner.endsWith("l")   ? `1.5px solid ${ACCENT}${hov ? "bb" : "44"}` : undefined,
              borderRight:  corner.endsWith("r")   ? `1.5px solid ${ACCENT}${hov ? "bb" : "44"}` : undefined,
              transition:   "border-color 0.22s",
              pointerEvents:"none",
            }} />
          ))}

          {/* Mission number + output badge */}
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="font-mono font-black" style={{
              fontSize:   "clamp(0.72rem, 1.1vw, 0.96rem)",
              letterSpacing: "0.1em",
              color:      completed ? ACCENT : hov ? `${ACCENT}dd` : "rgba(255,255,255,0.2)",
              textShadow: (completed || hov) ? `0 0 10px ${ACCENT_GLOW}` : "none",
              transition: "color 0.22s",
            }}>
              {num}
            </span>
            <div className="flex items-center gap-1">
              <span className="font-mono rounded-full" style={{
                fontSize:   "clamp(0.46rem, 0.7vw, 0.58rem)",
                padding:    "1.5px 5px",
                background: `${out.color}18`,
                color:       out.color,
                border:     `1px solid ${out.color}32`,
              }}>
                {out.label}
              </span>
              {completed && (
                <div style={{
                  width:  15, height: 15, borderRadius: "50%",
                  background: ACCENT, color: "#08080F",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.5rem", fontWeight: 900,
                }}>✓</div>
              )}
            </div>
          </div>

          {/* Emoji + title + description */}
          <div className="flex items-start gap-1.5 flex-shrink-0">
            <span style={{
              fontSize:  size === "large" ? "clamp(1rem, 1.6vw, 1.4rem)" : "clamp(0.85rem, 1.3vw, 1.1rem)",
              lineHeight: 1, flexShrink: 0,
            }}>
              {obj.emoji}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-extrabold text-white leading-tight" style={{
                fontSize: size === "large"
                  ? "clamp(0.62rem, 0.98vw, 0.88rem)"
                  : "clamp(0.55rem, 0.85vw, 0.76rem)",
              }}>
                {obj.title}
              </p>
              <p className="text-white/38 leading-snug mt-0.5 line-clamp-2" style={{
                fontSize: "clamp(0.46rem, 0.7vw, 0.6rem)",
              }}>
                {obj.description}
              </p>
            </div>
          </div>

          {/* Footer: XP + CTA */}
          <div className="flex items-center justify-between mt-auto flex-shrink-0">
            <span className="flex items-center gap-0.5 font-bold" style={{
              fontSize: "clamp(0.46rem, 0.7vw, 0.6rem)",
              color: ACCENT,
            }}>
              <Zap size={8} fill="currentColor" />
              +{obj.xpReward} XP
            </span>
            {unlocked ? (
              <span className="font-display font-extrabold" style={{
                fontSize:   "clamp(0.46rem, 0.7vw, 0.6rem)",
                color:       launching ? "rgba(255,255,255,0.3)" : completed ? "#7BFFC4" : hov ? ACCENT : `${ACCENT}77`,
                transition: "color 0.15s",
              }}>
                {launching ? "↗ Going…" : completed ? "Redo ↺" : "Enter →"}
              </span>
            ) : (
              <Lock size={9} className="text-white/25" />
            )}
          </div>

          {/* Locked overlay */}
          {!unlocked && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(4,2,14,0.72)", backdropFilter: "blur(2px)" }}>
              <Lock size={14} className="text-white/30" />
            </div>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Arena1RoomPage() {
  const router      = useRouter();
  const objectives  = getArenaObjectives(1);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => { setCompleted(getCompletedObjectives()); }, []);

  const unlocked       = true; // Arena 1 always unlocked at Level 1
  const completedCount = objectives.filter(o => completed.has(o.id)).length;
  const allDone        = completedCount === objectives.length;

  const handleClick = (obj: Objective) => {
    if (launching) return;
    setLaunching(obj.id);
    const p = new URLSearchParams({
      outputType: obj.outputType,
      prompt:     obj.starterPrompt,
      objective:  obj.id,
    });
    setTimeout(() => router.push(`/dashboard/playground?${p.toString()}`), 380);
  };

  const leftObjs   = objectives.slice(0, 4);   // 01–04
  const centerObjs = objectives.slice(4, 10);  // 05–10
  const rightObjs  = objectives.slice(10, 14); // 11–14

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: "100dvh", background: "#04020E" }}
    >
      {/* Scan-line keyframe */}
      <style>{`
        @keyframes holoScan {
          0%   { top: -40px; }
          100% { top: 110%;  }
        }
      `}</style>

      {/* Layer 0: canvas particles */}
      <AmbientParticles />

      {/* Layer 1: background image */}
      <img
        src="/worlds/arena-1.png"
        alt="" aria-hidden draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover", objectPosition: "center", opacity: 0.28, zIndex: 0 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
      />

      {/* Layer 2: gradient atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
        background: "linear-gradient(180deg, rgba(4,2,14,0.92) 0%, rgba(4,2,14,0.08) 40%, rgba(4,2,14,0.94) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
        background: "radial-gradient(ellipse 85% 55% at 50% 8%, rgba(124,58,237,0.32) 0%, transparent 65%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
        background: "linear-gradient(90deg, rgba(4,2,14,0.72) 0%, transparent 22%, transparent 78%, rgba(4,2,14,0.72) 100%)" }} />

      {/* Layer 3: SVG perspective floor grid */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "40%", zIndex: 3 }}>
        <svg width="100%" height="100%" viewBox="0 0 1400 320" preserveAspectRatio="none">
          {/* Radial lines to vanishing point */}
          {Array.from({ length: 15 }, (_, i) => i - 7).map(i => (
            <line key={`v${i}`}
              x1={700 + i * 75} y1={0}
              x2={700 + i * 720} y2={320}
              stroke={`rgba(124,58,237,${Math.max(0.03, 0.13 - Math.abs(i) * 0.008)})`}
              strokeWidth="0.75"
            />
          ))}
          {/* Horizontal depth lines */}
          {[0.12, 0.28, 0.46, 0.65, 0.84, 1].map((t, i) => (
            <line key={`h${i}`}
              x1={700 - t * 700} y1={t * 320}
              x2={700 + t * 700} y2={t * 320}
              stroke={`rgba(124,58,237,${0.06 + t * 0.08})`}
              strokeWidth="0.7"
            />
          ))}
        </svg>
      </div>

      {/* Layer 4: holographic floor rings */}
      <div className="absolute left-1/2 pointer-events-none"
        style={{ bottom: "clamp(26px,5vh,72px)", transform: "translateX(-50%)", zIndex: 6 }}>
        {[1, 0.62, 0.36].map((scale, i) => (
          <motion.div key={i} className="absolute top-1/2 left-1/2" style={{
            width:        "clamp(250px,40vw,560px)",
            height:       "clamp(32px,5.5vw,74px)",
            borderRadius: "50%",
            border:       `${i === 0 ? "1.5px" : "1px"} solid ${ACCENT}${i === 0 ? "cc" : "50"}`,
            boxShadow:    i === 0 ? `0 0 32px ${ACCENT_GLOW}, inset 0 0 20px ${ACCENT_GLOW}` : undefined,
            transform:    `translate(-50%,-50%) scale(${scale})`,
          }}
            animate={{ opacity: [0.28 + i * 0.12, 0.65 + i * 0.08, 0.28 + i * 0.12] }}
            transition={{ duration: 3.2 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          />
        ))}
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 8, height: 8, background: ACCENT, boxShadow: `0 0 20px ${ACCENT_GLOW}` }}
          animate={{ scale: [1, 1.7, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Layer 5: wall junction glow lines (room corners) */}
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{
        left:       "19.5%",
        width:       2,
        background: `linear-gradient(180deg, transparent 0%, ${ACCENT}55 20%, ${ACCENT}77 55%, ${ACCENT}55 80%, transparent 100%)`,
        boxShadow:  `0 0 14px ${ACCENT_GLOW}`,
        zIndex:      18,
      }} />
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{
        right:      "19.5%",
        width:       2,
        background: `linear-gradient(180deg, transparent 0%, ${ACCENT}55 20%, ${ACCENT}77 55%, ${ACCENT}55 80%, transparent 100%)`,
        boxShadow:  `0 0 14px ${ACCENT_GLOW}`,
        zIndex:      18,
      }} />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => router.push("/dashboard")}
        className="absolute top-5 left-5 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-display font-bold text-white/60 hover:text-white transition-all"
        style={{ background: "rgba(6,6,15,0.68)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(14px)" }}
      >
        <ArrowLeft size={14} /> Hub
      </motion.button>

      {/* Arena header */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 z-40 flex flex-col items-center pt-4 pointer-events-none"
      >
        <span className="text-2xl mb-0.5">⚛️</span>
        <h1
          className="font-display font-black text-white uppercase tracking-tight leading-none"
          style={{
            fontSize:   "clamp(1.3rem, 3vw, 2.5rem)",
            textShadow: `0 0 40px ${ACCENT_GLOW}, 0 0 80px ${ACCENT_GLOW}`,
          }}
        >
          AI Explorer Arena
        </h1>
        <p className="font-mono uppercase tracking-[0.24em] mt-1" style={{
          fontSize: "clamp(0.5rem, 0.95vw, 0.68rem)", color: ACCENT,
        }}>
          Master · Explore · Build the Future
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex gap-[3px]">
            {objectives.map((o, i) => (
              <div key={o.id} className="rounded-full overflow-hidden"
                style={{ width: "clamp(7px, 1.1vw, 11px)", height: 3, background: "rgba(255,255,255,0.1)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: completed.has(o.id) ? "100%" : "0%" }}
                  transition={{ delay: i * 0.03 + 0.6, duration: 0.35 }}
                  style={{ background: ACCENT }}
                />
              </div>
            ))}
          </div>
          <span className="font-mono text-[10px]" style={{ color: ACCENT }}>
            {completedCount}/{objectives.length}
          </span>
          {allDone && (
            <span className="text-[10px] font-bold text-[#7BFFC4]">✓ Complete!</span>
          )}
        </div>
      </motion.div>

      {/* ── Three-wall room layout ── */}
      <div
        className="absolute inset-0 flex items-stretch z-20"
        style={{
          paddingTop:    "clamp(90px, 11vh, 124px)",
          paddingBottom: "clamp(50px, 8.5vh, 88px)",
        }}
      >
        {/* ════ LEFT WALL — 01–04 ════ */}
        <motion.div
          initial={{ opacity: 0, x: -70 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="flex flex-col gap-2 overflow-hidden"
          style={{
            width:           "clamp(145px, 19.5%, 248px)",
            padding:         "4px 10px 4px 14px",
            transformOrigin: "left center",
            transform:       "perspective(900px) rotateY(32deg) translateZ(-12px)",
            maskImage:       "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        >
          {leftObjs.map((obj, i) => (
            <div key={obj.id} className="flex-1 min-h-0">
              <HoloPanel
                obj={obj} index={i}
                completed={completed.has(obj.id)} unlocked={unlocked}
                launching={launching === obj.id} onClick={() => handleClick(obj)}
              />
            </div>
          ))}
        </motion.div>

        {/* ════ CENTER WALL — 05–10 ════ */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="flex-1 flex flex-col overflow-hidden"
          style={{ padding: "0 clamp(8px, 2%, 22px)" }}
        >
          <div
            className="h-full grid grid-cols-3 gap-2"
            style={{ gridTemplateRows: "repeat(2, 1fr)" }}
          >
            {centerObjs.map((obj, i) => (
              <HoloPanel
                key={obj.id} obj={obj} index={i + 4} size="large"
                completed={completed.has(obj.id)} unlocked={unlocked}
                launching={launching === obj.id} onClick={() => handleClick(obj)}
              />
            ))}
          </div>
        </motion.div>

        {/* ════ RIGHT WALL — 11–14 ════ */}
        <motion.div
          initial={{ opacity: 0, x: 70 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="flex flex-col gap-2 overflow-hidden"
          style={{
            width:           "clamp(145px, 19.5%, 248px)",
            padding:         "4px 14px 4px 10px",
            transformOrigin: "right center",
            transform:       "perspective(900px) rotateY(-32deg) translateZ(-12px)",
            maskImage:       "linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        >
          {rightObjs.map((obj, i) => (
            <div key={obj.id} className="flex-1 min-h-0">
              <HoloPanel
                obj={obj} index={i + 10}
                completed={completed.has(obj.id)} unlocked={unlocked}
                launching={launching === obj.id} onClick={() => handleClick(obj)}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── All-done banner ── */}
      <AnimatePresence>
        {allDone && !launching && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background:     "rgba(12,8,28,0.96)",
              border:         `1px solid ${ACCENT}55`,
              boxShadow:      `0 0 38px ${ACCENT_GLOW}`,
              backdropFilter: "blur(22px)",
            }}
          >
            <span className="text-xl">🎉</span>
            <div>
              <p className="font-display font-extrabold text-sm" style={{ color: ACCENT }}>
                Arena Complete!
              </p>
              <p className="text-xs text-white/40">All 14 missions done. You&apos;re an AI Explorer.</p>
            </div>
            <button
              onClick={() => router.push("/dashboard/world/2")}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all active:scale-95"
              style={{ background: ACCENT, color: "#fff" }}
            >
              Prompt Lab →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
