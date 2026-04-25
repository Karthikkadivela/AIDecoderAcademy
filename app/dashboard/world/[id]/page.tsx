"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Lock } from "lucide-react";
import { getArena } from "@/lib/arenas";
import { getArenaObjectives, getCompletedObjectives, type Objective } from "@/lib/objectives";
import type { Profile } from "@/types";
import Arena1RoomPage from "@/components/worlds/Arena1RoomPage";

const OUTPUT_LABELS: Record<string, { label: string; color: string }> = {
  text:   { label: "Text",   color: "#C4B5FD" },
  json:   { label: "JSON",   color: "#7BFFC4" },
  image:  { label: "Image",  color: "#7AEFFF" },
  audio:  { label: "Audio",  color: "#FF8FB8" },
  slides: { label: "Slides", color: "#C8FF00" },
};

export default function WorldPage() {
  const params  = useParams();
  const router  = useRouter();
  const arenaId = parseInt(params.id as string) || 1;
  const arena   = getArena(arenaId);

  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [completed,  setCompleted]  = useState<Set<string>>(new Set());
  const [launching,  setLaunching]  = useState<string | null>(null);

  const objectives = getArenaObjectives(arenaId);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
    setCompleted(getCompletedObjectives());
  }, []);

  const level     = profile?.level ?? 1;
  const unlocked  = arena.unlockLevel <= level;

  const handleStartObjective = (obj: Objective) => {
    if (!unlocked) return;
    setLaunching(obj.id);
    const params = new URLSearchParams({
      outputType: obj.outputType,
      prompt:     obj.starterPrompt,
      objective:  obj.id,
    });
    setTimeout(() => {
      router.push(`/dashboard/playground?${params.toString()}`);
    }, 400);
  };

  const completedCount  = objectives.filter(o => completed.has(o.id)).length;
  const allDone         = completedCount === objectives.length;

  // Arena 1 gets its own immersive 3D room page
  if (arenaId === 1) {
    return <Arena1RoomPage />;
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100vh" }}>

      {/* ── World background ── */}
      <div className="absolute inset-0">
        <img
          src={`/worlds/arena-${arenaId}.png`}
          alt={arena.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src.endsWith(".png")) {
              el.src = `/worlds/arena-${arenaId}.jpg`;
            } else {
              el.src = `/arena${arenaId}/background.png`;
            }
          }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(6,6,15,0.55) 0%, rgba(6,6,15,0.3) 40%, rgba(6,6,15,0.7) 100%)" }}/>
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${arena.accentGlow} 0%, transparent 60%)` }}/>
      </div>

      {/* ── Back button ── */}
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={() => router.push("/dashboard")}
        className="absolute top-5 left-5 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-display font-bold text-white/60 hover:text-white transition-all"
        style={{ background: "rgba(6,6,15,0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
      >
        <ArrowLeft size={14}/> Hub
      </motion.button>

      {/* ── Arena header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 z-40 flex flex-col items-center pt-5 pb-3 pointer-events-none"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{arena.emoji}</span>
          <h1 className="font-display font-black text-white text-2xl sm:text-3xl tracking-tight"
            style={{ textShadow: `0 0 30px ${arena.accentGlow}` }}>
            {arena.name}
          </h1>
        </div>
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: arena.accent }}>
          {arena.tagline}
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex gap-1.5">
            {objectives.map((o, i) => (
              <div key={o.id} className="w-8 h-1.5 rounded-full overflow-hidden bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: completed.has(o.id) ? "100%" : "0%" }}
                  transition={{ delay: i * 0.1 + 0.5, duration: 0.5 }}
                  style={{ background: arena.accent, boxShadow: `0 0 6px ${arena.accentGlow}` }}
                />
              </div>
            ))}
          </div>
          <span className="text-xs font-mono" style={{ color: arena.accent }}>
            {completedCount}/{objectives.length}
          </span>
          {allDone && <span className="text-xs text-[#00FF94] font-bold">✓ Complete!</span>}
        </div>
      </motion.div>

      {/* ── Mission cards ── */}
      <div className="absolute inset-0 flex items-center justify-center z-30 px-4 sm:px-8"
        style={{ paddingTop: "100px", paddingBottom: "20px" }}>
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          {objectives.map((obj, i) => {
            const done        = completed.has(obj.id);
            const isLocked    = !unlocked;
            const isLaunching = launching === obj.id;
            const outMeta     = OUTPUT_LABELS[obj.outputType] ?? OUTPUT_LABELS.text;

            return (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 + 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.button
                  onClick={() => handleStartObjective(obj)}
                  disabled={isLocked || isLaunching}
                  whileHover={!isLocked ? { y: -4, scale: 1.02 } : {}}
                  whileTap={!isLocked   ? { scale: 0.97 }         : {}}
                  className="w-full text-left rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    background:     done ? `${arena.accent}18` : "rgba(15,15,26,0.82)",
                    border:         `1px solid ${done ? arena.accent + "60" : "rgba(255,255,255,0.1)"}`,
                    backdropFilter: "blur(20px)",
                    boxShadow:      done ? `0 0 24px ${arena.accentGlow}` : "0 8px 32px rgba(0,0,0,0.4)",
                    cursor:         isLocked ? "not-allowed" : "pointer",
                    opacity:        isLocked ? 0.5 : 1,
                  }}
                >
                  {/* Card top accent stripe */}
                  <div className="h-0.5 w-full" style={{ background: done ? arena.accent : "rgba(255,255,255,0.08)" }}/>

                  <div className="p-5">
                    {/* Mission number + emoji */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{obj.emoji}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                          style={{ background: `${outMeta.color}15`, color: outMeta.color, border: `1px solid ${outMeta.color}30` }}>
                          {outMeta.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {done ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: arena.accent, color: "#08080F" }}>✓</div>
                        ) : isLocked ? (
                          <Lock size={14} className="text-white/25"/>
                        ) : (
                          <span className="text-[10px] font-mono text-white/30">
                            Mission {obj.order}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-black text-base tracking-tight text-white mb-1.5 leading-tight">
                      {obj.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-white/55 leading-relaxed mb-4">
                      {obj.description}
                    </p>

                    {/* Footer: XP + CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs font-bold"
                        style={{ color: arena.accent }}>
                        <Zap size={11} fill="currentColor"/>
                        +{obj.xpReward} XP
                      </div>

                      {!isLocked && (
                        <div
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-display font-extrabold transition-all duration-200"
                          style={done ? {
                            background: "rgba(0,255,148,0.12)",
                            color: "#7BFFC4",
                            border: "1px solid rgba(0,255,148,0.2)",
                          } : {
                            background: isLaunching ? arena.accent : `${arena.accent}20`,
                            color: isLaunching ? "#08080F" : arena.accent,
                            border: `1px solid ${arena.accent}40`,
                          }}
                        >
                          {isLaunching ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10"/>
                              </svg>
                              Launching…
                            </span>
                          ) : done ? "Redo ↺" : "Start →"}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Locked world overlay ── */}
      {!unlocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ background: "rgba(6,6,15,0.75)", backdropFilter: "blur(4px)" }}
        >
          <div className="text-center px-8 max-w-sm">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-display font-black text-white text-2xl mb-2">
              {arena.name} is Locked
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Reach Level {arena.unlockLevel} ({arena.unlockXP} XP) to unlock this world.
            </p>
            <button
              onClick={() => router.push("/dashboard/playground")}
              className="px-6 py-3 rounded-xl font-display font-extrabold text-sm transition-all duration-200 active:scale-95"
              style={{ background: arena.accent, color: "#08080F", boxShadow: `0 0 20px ${arena.accentGlow}` }}
            >
              Go to Playground →
            </button>
          </div>
        </motion.div>
      )}

      {/* ── All done banner ── */}
      {allDone && !launching && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: "rgba(15,15,26,0.92)",
            border: `1px solid ${arena.accent}50`,
            boxShadow: `0 0 32px ${arena.accentGlow}`,
            backdropFilter: "blur(20px)",
          }}
        >
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-display font-extrabold text-sm" style={{ color: arena.accent }}>
              World Complete!
            </p>
            <p className="text-xs text-white/40">All missions in {arena.name} done.</p>
          </div>
          {arenaId < 6 && (
            <button
              onClick={() => router.push(`/dashboard/world/${arenaId + 1}`)}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all active:scale-95"
              style={{ background: arena.accent, color: "#08080F" }}
            >
              Next World →
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
