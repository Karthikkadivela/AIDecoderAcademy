"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ARENAS } from "@/lib/arenas";
import { isArenaComplete, isArenaUnlocked } from "@/lib/objectives";
import type { Profile } from "@/types";

// ── Panel definitions ──────────────────────────────────────────────────────
// Each panel is a floating holographic screen positioned over the background.
// left/top/width are % of the container. rotate is degrees (Z-axis tilt).
// perspective3d gives the outward lean seen in the reference art.
const PANELS: {
  arenaId:      number;
  src:          string | null;
  left:         string;
  top:          string;
  width:        string;
  aspect:       string;          // CSS aspect-ratio for the image box
  rotateZ:      number;
  rotateY:      number;          // positive = face right (left panels), negative = face left (right panels)
  rotateX:      number;          // positive = tilt top away (bottom panels)
  floatDelay:   number;
  floatRange:   number;          // px amplitude for idle float
  zIndex:       number;
}[] = [
  // ── CENTER ───────────────────────────────────────────────────────────────
  // Video Fusion — hero panel, wide cinematic ratio, top center
  { arenaId: 7, src: "/panels/video_vision.png",  left: "33%", top: "5%",  width: "35%", aspect: "16/10",  rotateZ:  0, rotateY:   0, rotateX:  6, floatDelay: 0.0, floatRange: 10, zIndex: 10 },

  // ── LEFT COLUMN: audio fusion · slide skate · script lab ─────────────────
  { arenaId: 5, src: "/panels/audio_fusion.png",  left:  "3%", top: "3%",  width: "42%", aspect: "16/10", rotateZ: -2, rotateY:  28, rotateX:  7, floatDelay: 0.6, floatRange: 12, zIndex: 11 },
  { arenaId: 6, src: "/panels/slide_skate.png",   left:  "12%", top: "35%", width: "23%", aspect: "16/10", rotateZ: -2, rotateY:  22, rotateX:  0, floatDelay: 1.1, floatRange:  9, zIndex: 14 },
  { arenaId: 3, src: "/panels/script.png",         left:  "12%", top: "58%", width: "30%", aspect: "16/10", rotateZ: -8, rotateY:  28, rotateX: 0, floatDelay: 1.7, floatRange:  8, zIndex: 32 },

  // ── RIGHT COLUMN: ai explorer · prompt lab · image module ────────────────
  { arenaId: 1, src: "/panels/ai_explorer.png",   left: "63%", top: "7%",  width: "30%", aspect: "16/10", rotateZ:  2, rotateY: -28, rotateX:  7, floatDelay: 0.4, floatRange: 12, zIndex: 11 },
  { arenaId: 2, src: "/panels/prompt_lab.png",    left: "64%", top: "35%", width: "27%", aspect: "16/10", rotateZ:  2, rotateY: -22, rotateX:  0, floatDelay: 0.9, floatRange:  9, zIndex: 14 },
  { arenaId: 4, src: "/panels/pic_drop.png",      left: "63%", top: "60%", width: "27%", aspect: "16/10", rotateZ:  8, rotateY: -28, rotateX: 0, floatDelay: 2.2, floatRange:  8, zIndex: 32 },
];

export default function HubPage() {
  const router = useRouter();
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [hoveredArena, setHoveredArena] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState<number | null>(null);
  const [videoError,   setVideoError]   = useState(false);
  const [lockedToast,  setLockedToast]  = useState<{ arenaId: number; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, []);

  const handleArenaClick = useCallback((arenaId: number, e?: React.MouseEvent) => {
    if (!isArenaUnlocked(arenaId)) {
      if (e) setLockedToast({ arenaId, x: e.clientX, y: e.clientY });
      setTimeout(() => setLockedToast(null), 2200);
      return;
    }
    setLockedToast(null);
    setTransitioning(arenaId);
    setVideoError(false);
  }, []);

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
      style={{ height: "100dvh", background: "#06060f" }}
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
          key={panel.src ?? panel.arenaId}
          panel={panel}
          arena={ARENAS.find(a => a.id === panel.arenaId)!}
          hovered={hoveredArena === panel.arenaId}
          onHover={setHoveredArena}
          onClick={handleArenaClick}
        />
      ))}

      ── Avatar ──
      <img
        src="/panels/avatar.png"
        alt="Hub character"
        draggable={false}
        className="absolute pointer-events-none"
        style={{
          bottom: "clamp(60px, 17vh, 200px)",
          left: "50%",
          transform: "translateX(-50%)",
          height: "clamp(180px, 80vh, 600px)",
          width: "auto",
          objectFit: "contain",
          zIndex: 11,
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
          width: "clamp(300px, 72%, 1100px)",
          height: "auto",
          objectFit: "contain",
          zIndex: 12,
        }}
      />

      {/* ── Front panels (rendered AFTER desk — float in front of it) ── */}
      {PANELS.filter(p => p.zIndex >= 20).map(panel => (
        <PanelCard
          key={panel.src ?? panel.arenaId}
          panel={panel}
          arena={ARENAS.find(a => a.id === panel.arenaId)!}
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
        className="absolute left-0 right-0 flex flex-col items-center text-center pointer-events-none px-4"
        style={{
          zIndex: 60,
          // respects iPhone home-indicator / Android nav bar
          bottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))",
        }}
      >
        <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">
          Welcome back
        </p>
        <h1
          className="font-display font-black text-white text-xl sm:text-2xl md:text-3xl tracking-tight whitespace-nowrap"
          style={{ textShadow: "0 0 40px rgba(0,180,255,0.5)" }}
        >
          {profile?.display_name ?? "Explorer"}
          <span style={{ color: "#00D4FF" }}>.</span>
        </h1>
        {/* "tap" on touch devices, "click" on pointer devices */}
        <p className="text-xs text-white/35 mt-1 hidden sm:block">
          Choose your world — click a panel to enter
        </p>
        <p className="text-xs text-white/35 mt-1 sm:hidden">
          Tap a panel to enter
        </p>
      </motion.div>

      {/* ── Mobile notice (screens narrower than 480 px) ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center xs:hidden"
        style={{
          zIndex: 70,
          background: "rgba(6,4,18,0.88)",
          backdropFilter: "blur(12px)",
          display: "none",   // hidden by default; overridden below via media query
        }}
      >
        <style>{`
          @media (max-width: 479px) {
            .hub-mobile-notice { display: flex !important; }
          }
        `}</style>
      </div>
      <div
        className="hub-mobile-notice absolute inset-0 flex-col items-center justify-center px-6 text-center"
        style={{
          zIndex: 70,
          background: "rgba(6,4,18,0.92)",
          backdropFilter: "blur(12px)",
          display: "none",
        }}
      >
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="font-display font-black text-white text-xl mb-2">Open on a bigger screen</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          The AI Decoder Academy Hub looks best on a tablet or laptop.
        </p>
        <button
          onClick={() => router.push("/dashboard/playground")}
          className="px-6 py-3 rounded-xl font-display font-extrabold text-sm"
          style={{ background: "#7C3AED", color: "#fff", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}
        >
          Go to Playground →
        </button>
      </div>

      {/* ── Hover tooltip ── */}
      <AnimatePresence>
        {hoveredArena && (() => {
          const a = ARENAS.find(x => x.id === hoveredArena)!;
          const unlocked = isArenaUnlocked(a.id);
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
                    🔒 Complete Arena {a.id - 1} to unlock
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

      {/* ── Locked arena toast ── */}
      <AnimatePresence>
        {lockedToast && (() => {
          const a = ARENAS.find(x => x.id === lockedToast.arenaId)!;
          return (
            <motion.div
              key="locked-toast"
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{    opacity: 0, scale: 0.85, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed pointer-events-none"
              style={{
                left: Math.min(lockedToast.x, window.innerWidth - 260),
                top:  Math.max(lockedToast.y - 80, 20),
                zIndex: 9000,
              }}
            >
              <div
                className="px-4 py-3 rounded-2xl backdrop-blur-2xl"
                style={{
                  background: "rgba(8,4,22,0.95)",
                  border: `1px solid ${a.accent}50`,
                  boxShadow: `0 0 32px ${a.accentGlow}, 0 8px 32px rgba(0,0,0,0.6)`,
                  minWidth: "220px",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🔒</span>
                  <p className="font-display font-extrabold text-sm text-white tracking-tight">
                    {a.name} is locked
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Complete all missions in{" "}
                  <span style={{ color: a.accent, fontWeight: 700 }}>
                    Arena {a.id - 1}
                  </span>{" "}
                  first to unlock this world.
                </p>
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
  aspect:     string;
  rotateZ:    number;
  rotateY:    number;
  rotateX:    number;
  floatDelay: number;
  floatRange: number;
  zIndex:     number;
}

function PanelCard({
  panel, arena, hovered, onHover, onClick,
}: {
  panel:   PanelDef;
  arena:   (typeof ARENAS)[0];
  hovered: boolean;
  onHover: (id: number | null) => void;
  onClick: (id: number, e: React.MouseEvent) => void;
}) {
  const unlocked  = isArenaUnlocked(arena.id);
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
        // perspective scales with viewport so the 3D lean looks natural on all screen sizes
        transformPerspective: "clamp(500px, 70vw, 1100px)" as unknown as number,
        willChange:        "transform",
      }}
      onMouseEnter={() => onHover(arena.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onClick(arena.id, e)}
    >
      <motion.div
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.96 }}
        style={{ cursor: "pointer" }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/*
          Uniform panel box — all images rendered at the same aspect ratio so they
          line up perfectly regardless of their natural pixel dimensions.
          object-fit: cover fills the box; object-position: top keeps the header
          visible if vertical content is trimmed.
        */}
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: panel.aspect }}
        >
          {/* Panel image */}
          {panel.src && (
            <img
              src={panel.src}
              alt={arena.name}
              draggable={false}
              className="absolute inset-0 w-full h-full rounded-xl"
              style={{
                objectFit:     "cover",
                objectPosition: "top center",
                filter: hovered
                  ? `brightness(1.25) drop-shadow(0 0 16px ${arena.accent})`
                  : `brightness(1.05) drop-shadow(0 0 8px ${arena.accentGlow})`,
                transition: "filter 0.3s ease",
              }}
            />
          )}

          {/* Glow halo — sits on top of the image, pointer-events off */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300"
            style={{
              boxShadow: hovered && unlocked
                ? `0 0 40px ${arena.accentGlow}, 0 0 80px ${arena.accentGlow}`
                : "none",
            }}
          />


          {/* Completed badge */}
          {completed && unlocked && (
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#00FF94", color: "#08080F", boxShadow: "0 0 12px rgba(0,255,148,0.7)", zIndex: 10 }}
            >
              ✓
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
