"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getArena } from "@/lib/arenas";
import type { XPResult } from "@/lib/useXP";

interface Props {
  result:   XPResult;
  onClose:  () => void;
  onSwitchArena: (id: number) => void;
}

export function LevelUpModal({ result, onClose, onSwitchArena }: Props) {
  // Look up arena client-side — functions can't survive JSON serialization from API
  const arena = result.unlocked_arena_id
    ? getArena(result.unlocked_arena_id)
    : getArena(result.level);
  const [step, setStep] = useState<"celebrate" | "arena">("celebrate");

  useEffect(() => {
    const t = setTimeout(() => setStep("arena"), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Step 1 — Level up celebration */}
        <AnimatePresence>
          {step === "celebrate" && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="relative z-10 text-center"
            >
              <div className="text-8xl mb-4 animate-bounce">⚡</div>
              <h1 className="font-display text-5xl font-black text-white mb-2"
                style={{ textShadow: `0 0 40px ${arena.accentGlow}` }}>
                Level Up!
              </h1>
              <p className="text-2xl font-bold" style={{ color: arena.accent }}>
                You are now Level {result.level}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2 — Arena unlock */}
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
                {/* Arena emoji */}
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
                  "{arena.tagline}"
                </div>

                {/* Badge rewards */}
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