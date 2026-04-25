"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import type { Objective } from "@/lib/objectives";

// Percentage positions [left%, top%] mapped to the numbered panels in arena-1.png
const HOTSPOT_POSITIONS: Record<number, [number, number]> = {
  1:  [2,  3],   // 01 AI Fundamentals
  2:  [2,   17],   // 02 Machine Learning
  3:  [2,   32],   // 03 Prompt Engineering
  4:  [2,   46],   // 04 Data & Datasets
  5:  [20,  9],   // 05 Computer Vision
  6:  [20,  25],   // 06 NLP
  7:  [20,  42],   // 07 AI Tools & Platforms
  8:  [20,  54],   // 08 AI Ethics
  9:  [37,  25],   // 09 Deep Learning
  10: [52,  25],   // 10 AI Projects
  11: [37,  45],   // 11 AI Explorer Lab
  12: [71,  12],   // 12 AI Model Training
  13: [71,  28],   // 13 Generative AI
  14: [71,  43],   // 14 AI x Design
  15: [84,  7],   // 15 AI for Creativity
  16: [84,  20],   // 16 AI in Real World
  17: [84,  33],   // 17 AI Automation
  18: [84,  46],   // 18 AI Personalisation
};

const OUTPUT_COLORS: Record<string, string> = {
  text:   "#C4B5FD",
  json:   "#7BFFC4",
  image:  "#7AEFFF",
  audio:  "#FF8FB8",
  slides: "#C8FF00",
};

// Decide tooltip placement based on hotspot position in the viewport
function getTooltipStyle(left: number, top: number): React.CSSProperties {
  const showBelow = top < 28;                    // near top edge → open downward
  const anchorRight = left > 72;                 // near right edge → anchor right
  const anchorLeft  = left < 18;                 // near left edge → anchor left

  const base: React.CSSProperties = {
    position: "absolute",
    width: 200,
    zIndex: 50,
    pointerEvents: "none",
  };

  if (showBelow) {
    return {
      ...base,
      top: "calc(100% + 10px)",
      ...(anchorRight
        ? { right: 0 }
        : anchorLeft
        ? { left: 0 }
        : { left: "50%", transform: "translateX(-50%)" }),
    };
  }

  return {
    ...base,
    bottom: "calc(100% + 10px)",
    ...(anchorRight
      ? { right: 0 }
      : anchorLeft
      ? { left: 0 }
      : { left: "50%", transform: "translateX(-50%)" }),
  };
}

function getArrowStyle(left: number, top: number, accent: string): React.CSSProperties {
  const showBelow = top < 28;
  const anchorRight = left > 72;
  const anchorLeft  = left < 18;

  const hPos = anchorRight
    ? { right: 12, left: "auto" }
    : anchorLeft
    ? { left: 12, right: "auto" }
    : { left: "50%", transform: "translateX(-50%)" };

  return {
    position: "absolute",
    ...(showBelow ? { top: -5 } : { bottom: -5 }),
    ...hPos,
    width: 10,
    height: 10,
    background: "rgba(6,6,15,0.92)",
    border: `1px solid ${accent}50`,
    ...(showBelow
      ? { borderBottom: "none", borderRight: "none" }
      : { borderTop: "none", borderLeft: "none" }),
    rotate: "45deg",
  };
}

interface Props {
  objectives: Objective[];
  completed: Set<string>;
  onObjectiveClick: (obj: Objective) => void;
}

export default function Arena1HotspotMap({ objectives, completed, onObjectiveClick }: Props) {
  // activeId covers both hover (desktop) and tap (touch)
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setActiveId(prev => (prev === id ? null : id));

  return (
    <div
      className="absolute inset-0 w-full h-full"
      // Dismiss tooltip when clicking the background
      onClick={() => setActiveId(null)}
    >
      {objectives.map((obj) => {
        const pos = HOTSPOT_POSITIONS[obj.order];
        if (!pos) return null;

        const [left, top] = pos;
        const done    = completed.has(obj.id);
        const accent  = OUTPUT_COLORS[obj.outputType] ?? "#7C3AED";
        const isOpen  = activeId === obj.id;

        return (
          <div
            key={obj.id}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              zIndex: isOpen ? 40 : 30,
            }}
            // Stop background-click from closing the tooltip immediately after opening
            onClick={e => e.stopPropagation()}
          >
            {/* Pulse ring — desktop only via pointer-coarse detection avoidance */}
            {!done && !isOpen && (
              <span
                className="absolute -inset-3 rounded-full animate-ping pointer-events-none"
                style={{
                  background: `${accent}28`,
                  animationDuration: "2.2s",
                  animationDelay: `${obj.order * 0.12}s`,
                }}
              />
            )}

            {/* Hotspot dot */}
            <motion.button
              onMouseEnter={() => setActiveId(obj.id)}
              onMouseLeave={() => !isOpen && setActiveId(null)}
              onClick={() => toggle(obj.id)}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.88 }}
              aria-label={obj.title}
              className="relative flex items-center justify-center rounded-full font-mono font-bold cursor-pointer select-none
                         text-[9px] sm:text-[10px]"
              style={{
                // Responsive size: 32px on mobile, 28px on desktop
                width:  "clamp(28px, 3vw, 36px)",
                height: "clamp(28px, 3vw, 36px)",
                background: done ? `${accent}ee` : "rgba(6,6,15,0.85)",
                border: `2px solid ${accent}`,
                color:  done ? "#08080F" : accent,
                boxShadow: `0 0 ${isOpen ? 20 : 8}px ${accent}${isOpen ? "cc" : "55"}`,
                transition: "box-shadow 0.2s, background 0.2s",
              }}
            >
              {done ? "✓" : String(obj.order).padStart(2, "0")}
            </motion.button>

            {/* Tooltip */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: top < 28 ? -6 : 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: top < 28 ? -6 : 6 }}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  style={getTooltipStyle(left, top)}
                >
                  <div
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(6,6,15,0.94)",
                      border: `1px solid ${accent}50`,
                      backdropFilter: "blur(18px)",
                      boxShadow: `0 4px 28px rgba(0,0,0,0.65), 0 0 18px ${accent}28`,
                    }}
                  >
                    {/* Output type + done badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${accent}18`,
                          color: accent,
                          border: `1px solid ${accent}40`,
                        }}
                      >
                        {obj.outputType.toUpperCase()}
                      </span>
                      {done && (
                        <span className="text-[9px] font-mono text-[#00FF94] font-bold">✓ DONE</span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="font-display font-black text-white text-xs leading-tight mb-1">
                      {obj.emoji} {obj.title}
                    </p>

                    {/* Description */}
                    <p className="text-[10px] text-white/50 leading-snug mb-2.5">
                      {obj.description}
                    </p>

                    {/* XP + CTA */}
                    <div className="flex items-center justify-between">
                      <span
                        className="flex items-center gap-1 text-[10px] font-bold"
                        style={{ color: accent }}
                      >
                        <Zap size={9} fill="currentColor" />
                        +{obj.xpReward} XP
                      </span>
                      <button
                        onClick={() => onObjectiveClick(obj)}
                        className="text-[10px] font-display font-extrabold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 active:scale-95"
                        style={{ background: accent, color: "#08080F", pointerEvents: "auto" }}
                      >
                        {done ? "Redo ↺" : "Enter →"}
                      </button>
                    </div>
                  </div>

                  {/* Arrow pointer */}
                  <div style={getArrowStyle(left, top, accent)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
