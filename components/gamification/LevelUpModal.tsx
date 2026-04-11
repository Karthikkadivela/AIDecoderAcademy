"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { getArena } from "@/lib/arenas";
import { playLevelUpFanfare } from "@/lib/gameAudio";
import type { XPResult } from "@/lib/useXP";
import { CelebrationOverlay } from "./CelebrationOverlay";

interface Props {
  result:   XPResult;
  onClose:  () => void;
  onSwitchArena: (id: number) => void;
}

export function LevelUpModal({ result, onClose, onSwitchArena }: Props) {
  const reducedMotion = useReducedMotion() ?? false;
  const arena = result.unlocked_arena_id
    ? getArena(result.unlocked_arena_id)
    : getArena(result.level);
  const [step, setStep] = useState<"celebrate" | "arena">("celebrate");
  useEffect(() => {
    if (!result.leveled_up) return;
    playLevelUpFanfare(result.level, result.total_xp);
  }, [result.leveled_up, result.level, result.total_xp]);

  const goToArenaStep = () => setStep("arena");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 bg-black/80 backdrop-blur-md ${step === "celebrate" ? "cursor-pointer" : ""}`}
          onClick={step === "celebrate" ? goToArenaStep : undefined}
          aria-hidden
        />

        {step === "celebrate" && (
          <CelebrationOverlay accent={arena.accent} reducedMotion={reducedMotion} />
        )}

        <AnimatePresence>
          {step === "celebrate" && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.65, bounce: 0.35 }}
              className="relative z-10 text-center px-6 max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border-2"
                style={{
                  borderColor: `${arena.accent}88`,
                  background:  `linear-gradient(145deg, ${arena.accentDim}, rgba(15,15,26,0.9))`,
                  boxShadow:   `0 0 48px ${arena.accentGlow}`,
                }}
                animate={reducedMotion ? {} : { y: [0, -6, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
                    fill={arena.accent}
                    style={{ filter: `drop-shadow(0 0 8px ${arena.accentGlow})` }}
                  />
                </svg>
              </motion.div>
              <h1
                className="font-display text-4xl font-black text-white sm:text-5xl mb-2"
                style={{ textShadow: `0 0 36px ${arena.accentGlow}` }}>
                Level up!
              </h1>
              <p className="text-xl sm:text-2xl font-bold font-display" style={{ color: arena.accent }}>
                You are now level {result.level}
              </p>
              <p className="mt-3 text-sm text-white/50 max-w-xs mx-auto">
                Keep creating — you unlocked more of the arena track.
              </p>

              <button
                type="button"
                onClick={goToArenaStep}
                className="mt-8 w-full max-w-xs mx-auto block py-3.5 rounded-xl font-display font-black text-sm transition-all active:scale-[0.98] border-2"
                style={{
                  background:  arena.accent,
                  color:       "#08080F",
                  borderColor: arena.accent,
                  boxShadow:   `0 0 28px ${arena.accentGlow}`,
                }}>
                Continue
              </button>
              <p className="mt-3 text-[11px] text-white/35">
                Or click outside this card when you are ready
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === "arena" && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md mx-4"
            >
              <div
                className="rounded-3xl p-8 text-center border"
                style={{
                  background:   `linear-gradient(135deg, ${arena.accentDim}, rgba(15,15,26,0.95))`,
                  borderColor:  arena.accent + "40",
                  boxShadow:    `0 0 60px ${arena.accentGlow}`,
                }}
              >
                <div className="text-7xl mb-4" style={{ filter: `drop-shadow(0 0 20px ${arena.accentGlow})` }}>
                  {arena.emoji}
                </div>

                <div className="text-xs font-mono font-bold uppercase tracking-widest mb-2"
                  style={{ color: arena.accent }}>
                  New arena unlocked
                </div>

                <h2 className="font-display text-3xl font-black text-white mb-2">
                  {arena.name}
                </h2>

                <p className="text-white/60 text-sm mb-1 font-display font-bold">
                  {arena.role}
                </p>

                <p className="text-white/40 text-sm mb-6 leading-relaxed">
                  {arena.description}
                </p>

                <div className="italic text-base mb-6 font-display font-bold"
                  style={{ color: arena.accent }}>
                  &ldquo;{arena.tagline}&rdquo;
                </div>

                {result.new_badges?.length > 0 && (
                  <div className="flex justify-center gap-2 mb-6">
                    {result.new_badges.map(b => (
                      <div key={b.id} className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{b.emoji}</span>
                        <span className="text-[10px] text-white/40 font-display">{b.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { onSwitchArena(arena.id); onClose(); }}
                    className="flex-1 py-3.5 rounded-xl font-display font-black text-sm transition-all active:scale-95"
                    style={{
                      background: arena.accent,
                      color:      "#08080F",
                      boxShadow:  `0 0 20px ${arena.accentGlow}`,
                    }}
                  >
                    Enter {arena.name} →
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-3.5 rounded-xl font-display font-bold text-sm bg-white/8 text-white/60 hover:text-white transition-all border border-white/10"
                  >
                    Stay here
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
