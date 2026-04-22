"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ARENAS } from "@/lib/arenas";
import { isArenaComplete } from "@/lib/objectives";
import type { Profile } from "@/types";

// ── Panel definitions ──────────────────────────────────────────────────────
// Each panel is a floating holographic screen positioned over the background.
// left/top/width are % of the container. rotate is degrees (Z-axis tilt).
// perspective3d gives the outward lean seen in the reference art.
const PANELS: {
  arenaId:      number;
  src:          string | null;   // null = custom glass card (Arena 1)
  left:         string;
  top:          string;
  width:        string;
  rotateZ:      number;
  rotateY:      number;          // positive = face right (left panels), negative = face left (right panels)
  rotateX:      number;          // positive = tilt top away (bottom panels)
  floatDelay:   number;
  floatRange:   number;          // px amplitude for idle float
  zIndex:       number;
}[] = [
  // Arena 6 — Director's Suite → Video Vision (top center, largest — faces straight)
  { arenaId: 6, src: "/panels/video_vision.png",  left: "38%", top: "2%",  width: "27%", rotateZ:  0,  rotateY:   0, rotateX:  8, floatDelay: 0.0, floatRange: 10, zIndex: 12 },
  // Arena 5 — Sound Booth → Audio Fusion (top left — swings right toward center)
  { arenaId: 5, src: "/panels/audio_fusion.png",  left:  "13%", top: "10%",  width: "22%", rotateZ: -3,  rotateY:  28, rotateX:  8, floatDelay: 0.6, floatRange: 12, zIndex: 11 },
  // Arena 2 — Prompt Lab → Slide Skate (top right — swings left toward center)
  { arenaId: 2, src: "/panels/slide_skate.png",   left: "70%", top: "10%",  width: "21%", rotateZ:  3,  rotateY: -28, rotateX:  8, floatDelay: 1.1, floatRange: 12, zIndex: 11 },
  // Arena 3 — Story Forge → Script (bottom left — swings right + tilts top back)
  { arenaId: 3, src: "/panels/script.png",        left:  "16%", top: "50%", width: "21%", rotateZ: -5,  rotateY:  32, rotateX: -5, floatDelay: 1.7, floatRange:  9, zIndex: 32 },
  // Arena 4 — Visual Studio → Pic Drop (bottom right — swings left + tilts top back)
  { arenaId: 4, src: "/panels/pic_drop.png",      left: "68%", top: "51%", width: "20%", rotateZ:  5,  rotateY: -32, rotateX: -5, floatDelay: 2.2, floatRange:  9, zIndex: 32 },
];

export default function HubPage() {
  const router = useRouter();
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [hoveredArena, setHoveredArena] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);
  const [videoError,   setVideoError]   = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, []);

  const handleArenaClick = useCallback((arenaId: number) => {
    const arena = ARENAS.find(a => a.id === arenaId)!;
    const level = profile?.level ?? 1;
    if (arena.unlockLevel > level) return;
    setTransitioning(arenaId);
    setVideoError(false);
  }, [profile]);

  // Auto-navigate after 8s fallback
  useEffect(() => {
    if (transitioning === null) return;
    const timer = setTimeout(() => {
      router.push(`/dashboard/world/${transitioning}`);
    }, 8000);
    return () => clearTimeout(timer);
  }, [transitioning, router]);

  const goToWorld = useCallback(() => {
    if (transitioning !== null) router.push(`/dashboard/world/${transitioning}`);
  }, [transitioning, router]);

  const level = profile?.level ?? 1;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: "calc(100vh - 57px)", background: "#06060f" }}
    >

      {/* ── Room background ── */}
      <img
        src="/panels/background.png"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover", objectPosition: "center" }}
      />

      {/* Vignette overlay — darkens edges, lifts centre */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, rgba(4,2,14,0.55) 100%)",
      }}/>
      {/* Bottom gradient so desk area reads cleanly */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(to top, rgba(4,2,14,0.75) 0%, transparent 45%)",
      }}/>

      {/* ── Top-row panels (rendered BEFORE avatar — sit behind it) ── */}
      {PANELS.filter(p => p.zIndex < 20).map(panel => (
        <PanelCard
          key={panel.arenaId}
          panel={panel}
          arena={ARENAS.find(a => a.id === panel.arenaId)!}
          level={level}
          hovered={hoveredArena === panel.arenaId}
          onHover={setHoveredArena}
          onClick={handleArenaClick}
        />
      ))}

      {/* ── Avatar ── */}
      <img
        src="/panels/avatar.png"
        alt="Hub character"
        draggable={false}
        className="absolute pointer-events-none"
        style={{
          bottom: 170,
          left: "50%",
          transform: "translateX(-50%)",
          height: "clamp(260px, 68%, 620px)",
          width: "auto",
          objectFit: "contain",
          zIndex: 22,
        }}
      />

      {/* ── Table / desk ── */}
      <img
        src="/panels/table.png"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute pointer-events-none"
        style={{
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(420px, 72%, 1100px)",
          height: "auto",
          objectFit: "contain",
          zIndex: 28,
        }}
      />

      {/* ── Front panels (rendered AFTER desk — float in front of it) ── */}
      {PANELS.filter(p => p.zIndex >= 20).map(panel => (
        <PanelCard
          key={panel.arenaId}
          panel={panel}
          arena={ARENAS.find(a => a.id === panel.arenaId)!}
          level={level}
          hovered={hoveredArena === panel.arenaId}
          onHover={setHoveredArena}
          onClick={handleArenaClick}
        />
      ))}

      {/* ── Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-12 left-0 right-0 flex flex-col items-center text-center pointer-events-none px-4"
        style={{ zIndex: 60 }}
      >
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">
          Welcome back
        </p>
        <h1
          className="font-display font-black text-white text-2xl sm:text-3xl tracking-tight whitespace-nowrap"
          style={{ textShadow: "0 0 40px rgba(0,180,255,0.5)" }}
        >
          {profile?.display_name ?? "Explorer"}
          <span style={{ color: "#00D4FF" }}>.</span>
        </h1>
        <p className="text-xs text-white/35 mt-1">
          Choose your world — click a panel to enter
        </p>
      </motion.div>

      {/* ── Hover tooltip ── */}
      <AnimatePresence>
        {hoveredArena && (() => {
          const a = ARENAS.find(x => x.id === hoveredArena)!;
          const unlocked = a.unlockLevel <= level;
          return (
            <motion.div
              key={hoveredArena}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{    opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ bottom: "14%", zIndex: 200 }}
            >
              <div
                className="px-4 py-2.5 rounded-2xl backdrop-blur-xl text-center"
                style={{
                  background: "rgba(10,6,28,0.92)",
                  border: `1px solid ${a.accent}45`,
                  boxShadow: `0 0 28px ${a.accentGlow}`,
                }}
              >
                <p className="font-display font-extrabold text-sm tracking-tight" style={{ color: a.accent }}>
                  {a.emoji} {a.name}
                </p>
                <p className="text-xs text-white/50 mt-0.5">{a.tagline}</p>
                {!unlocked && (
                  <p className="text-[10px] mt-1" style={{ color: a.accent }}>
                    Unlocks at Level {a.unlockLevel} · {a.unlockXP} XP
                  </p>
                )}
                {unlocked && (
                  <p className="text-[10px] text-white/40 mt-1">Click to enter →</p>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Video transition overlay ── */}
      <AnimatePresence>
        {transitioning !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-black"
            style={{ zIndex: 9999 }}
          >
            {!videoError ? (
              <video
                key={transitioning}
                src={`/transitions/arena-${transitioning}.mp4`}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                onEnded={goToWorld}
                onError={() => setVideoError(true)}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: `radial-gradient(ellipse at center, ${ARENAS.find(a => a.id === transitioning)?.accent}33 0%, #000 70%)`,
                  animation: "pulse 1s ease-in-out infinite",
                }}
              >
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">
                    {ARENAS.find(a => a.id === transitioning)?.emoji}
                  </div>
                  <p className="font-display font-black text-white text-xl tracking-tight">
                    Entering {ARENAS.find(a => a.id === transitioning)?.name}…
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={goToWorld}
              className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-bold text-white/60 hover:text-white border border-white/20 hover:border-white/40 transition-all"
              style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.4)" }}
            >
              Skip <span className="text-white/40">→</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PanelCard component ────────────────────────────────────────────────────
interface PanelDef {
  arenaId:    number;
  src:        string | null;
  left:       string;
  top:        string;
  width:      string;
  rotateZ:    number;
  rotateY:    number;
  rotateX:    number;
  floatDelay: number;
  floatRange: number;
  zIndex:     number;
}

function PanelCard({
  panel, arena, level, hovered, onHover, onClick,
}: {
  panel:   PanelDef;
  arena:   (typeof ARENAS)[0];
  level:   number;
  hovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (id: number) => void;
}) {
  const unlocked  = arena.unlockLevel <= level;
  const completed = typeof window !== "undefined" && isArenaComplete(arena.id);

  return (
    // Outer wrapper: position + 3D perspective container
    // transformPerspective is Framer Motion's per-element perspective — composes with y/rotateY/rotateZ
    <motion.div
      animate={{ y: [0, -panel.floatRange, 0] }}
      transition={{
        duration:  3.2 + panel.floatDelay * 0.3,
        repeat:    Infinity,
        ease:      "easeInOut",
        delay:     panel.floatDelay,
      }}
      style={{
        position:          "absolute",
        left:              panel.left,
        top:               panel.top,
        width:             panel.width,
        zIndex:            panel.zIndex,
        rotateY:           panel.rotateY,
        rotateZ:           panel.rotateZ,
        rotateX:           panel.rotateX,
        transformPerspective: 900,
        willChange:        "transform",
      }}
      onMouseEnter={() => onHover(arena.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(arena.id)}
    >
      <motion.div
        whileHover={unlocked ? { scale: 1.07 } : { scale: 1.02 }}
        whileTap={unlocked   ? { scale: 0.96 } : {}}
        style={{ cursor: unlocked ? "pointer" : "not-allowed" }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Glow halo — only on hover, no border ring */}
        <div
          className="absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            boxShadow: hovered && unlocked
              ? `0 0 40px ${arena.accentGlow}, 0 0 80px ${arena.accentGlow}`
              : "none",
            borderRadius: 12,
            zIndex: 1,
          }}
        />

        {/* Panel image or custom glass card for Arena 1 */}
        {panel.src ? (
          <img
            src={panel.src}
            alt={arena.name}
            draggable={false}
            className="w-full h-auto block rounded-xl"
            style={{
              filter: unlocked
                ? hovered
                  ? `brightness(1.25) drop-shadow(0 0 16px ${arena.accent})`
                  : `brightness(1.05) drop-shadow(0 0 8px ${arena.accentGlow})`
                : "grayscale(1) brightness(0.35)",
              transition: "filter 0.3s ease",
            }}
          />
        ) : (
          // Arena 1 — custom glass card since no panel image yet
          <div
            className="w-full rounded-xl flex flex-col items-center justify-center gap-3 py-6 px-4"
            style={{
              aspectRatio: "4/3",
              background: `linear-gradient(135deg, ${arena.accent}22, ${arena.accentGlow} 80%, rgba(8,6,22,0.9))`,
              border: `1.5px solid ${arena.accent}55`,
              backdropFilter: "blur(12px)",
              boxShadow: `inset 0 0 30px ${arena.accentGlow}`,
              filter: unlocked ? "none" : "grayscale(1) brightness(0.35)",
            }}
          >
            {/* Scan-line decoration */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-20"
              style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)" }}/>
            <span className="text-4xl sm:text-5xl drop-shadow-lg">{arena.emoji}</span>
            <p className="font-display font-black text-sm sm:text-base tracking-tight text-center leading-tight"
              style={{ color: arena.accent, textShadow: `0 0 20px ${arena.accentGlow}` }}>
              {arena.name}
            </p>
            <p className="text-[10px] sm:text-xs text-white/50 text-center leading-relaxed">
              {arena.tagline}
            </p>
          </div>
        )}

        {/* Lock overlay */}
        {!unlocked && (
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(4,2,14,0.72)", backdropFilter: "blur(3px)" }}
          >
            <span className="text-2xl">🔒</span>
            <p className="text-[10px] font-mono text-white/50">Level {arena.unlockLevel}</p>
          </div>
        )}

        {/* Completed badge */}
        {completed && unlocked && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#00FF94", color: "#08080F", boxShadow: "0 0 12px rgba(0,255,148,0.7)", zIndex: 10 }}
          >
            ✓
          </div>
        )}

        {/* Arena name label below panel */}
        <div className="mt-2 text-center">
          <p
            className="text-[10px] sm:text-xs font-display font-extrabold tracking-tight leading-tight transition-colors duration-200"
            style={{ color: hovered && unlocked ? arena.accent : unlocked ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)" }}
          >
            {arena.name.replace(" Arena", "").replace(" Suite", "").replace(" Studio", "")}
          </p>
          {!unlocked && (
            <p className="text-[9px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
              {arena.unlockXP} XP needed
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
