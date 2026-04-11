"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getUnlockedArenas, ARENAS, type ArenaConfig } from "@/lib/arenas";
import { Lock } from "lucide-react";

interface Props {
  currentLevel:  number;
  activeArenaId: number;
  onSelect:      (arenaId: number) => void;
  onClose:       () => void;
}

export function ArenaSelector({ currentLevel, activeArenaId, onSelect, onClose }: Props) {
  const unlocked = getUnlockedArenas(currentLevel);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative z-10 w-full max-w-2xl mx-4 mb-4 md:mb-0"
          style={{
            background:   "rgba(15,15,26,0.98)",
            border:       "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            backdropFilter: "blur(40px)",
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-black text-xl text-white">Choose Your Arena</h2>
                <p className="text-white/40 text-sm mt-0.5">Switch between any arena you've unlocked</p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/8 text-white/50 hover:text-white flex items-center justify-center transition-all">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ARENAS.map(arena => {
                const isUnlocked = arena.unlockLevel <= currentLevel;
                const isActive   = arena.id === activeArenaId;

                return (
                  <button
                    key={arena.id}
                    onClick={() => isUnlocked && onSelect(arena.id)}
                    disabled={!isUnlocked}
                    className={cn(
                      "relative p-4 rounded-2xl border text-left transition-all duration-200",

                      isUnlocked && !isActive && "hover:scale-[1.02] cursor-pointer",
                      !isUnlocked && "opacity-40 cursor-not-allowed",
                    )}
                    style={{
                      background:  isActive ? arena.accentDim : "rgba(255,255,255,0.03)",
                      borderColor: isActive ? arena.accent + "60" : "rgba(255,255,255,0.08)",
                      boxShadow:   isActive ? `0 0 0 2px ${arena.accent}, 0 0 20px ${arena.accentGlow}` : "none",
                    }}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                        style={{ background: arena.accent }}/>
                    )}

                    <div className="text-3xl mb-2">
                      {isUnlocked ? arena.emoji : <Lock size={20} className="text-white/30"/>}
                    </div>

                    <div className="text-xs font-mono font-bold mb-1"
                      style={{ color: isUnlocked ? arena.accent : "rgba(255,255,255,0.3)" }}>
                      {arena.weekLabel}
                    </div>

                    <div className="font-display font-bold text-sm text-white leading-tight mb-1">
                      {arena.name}
                    </div>

                    <div className="text-[10px] text-white/40">
                      {isUnlocked ? arena.tagline : `Unlock at Level ${arena.unlockLevel}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}