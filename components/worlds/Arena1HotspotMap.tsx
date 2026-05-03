"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import type { Objective } from "@/lib/objectives";

// Percentage positions [left%, top%] — top-left corner of each invisible card hit-area
const HOTSPOT_POSITIONS: Record<number, [number, number]> = {
  // ── TOP-LEFT wall ──
  1:  [6,   18],
  2:  [14,  20],
  3:  [20,  21],
  4:  [26,  22],
  5:  [32,  23],

  // ── BOTTOM-LEFT wall ──
  6:  [6,   45],
  7:  [14,  45],
  8:  [21,  45],
  9:  [28,  45],

  // ── TOP-RIGHT wall ──
  10: [69,  24],
  11: [76,  23],
  12: [84,  22],
  13: [92,  21],

  // ── BOTTOM-RIGHT wall ──
  14: [69,  49],
  15: [74,  49],
  16: [80,  49],
  17: [86,  49],
  18: [92,  49],
};

const OUTPUT_COLORS: Record<string, string> = {
  text:   "#C4B5FD",
  json:   "#7BFFC4",
  image:  "#7AEFFF",
  audio:  "#FF8FB8",
  slides: "#C8FF00",
};

function getTooltipStyle(left: number, top: number): React.CSSProperties {
  const showBelow   = top < 35;
  const anchorRight = left > 78;
  const anchorLeft  = left < 18;

  const hAlign = anchorRight
    ? { right: 0 }
    : anchorLeft
    ? { left: 0 }
    : { left: "50%", transform: "translateX(-50%)" };

  return {
    position:      "absolute",
    width:         210,
    zIndex:        50,
    pointerEvents: "auto",       // ← must be auto so the card itself is hoverable
    ...(showBelow
      ? { top:    "calc(100% + 8px)", ...hAlign }
      : { bottom: "calc(100% + 8px)", ...hAlign }),
  };
}

function getArrowStyle(left: number, top: number, accent: string): React.CSSProperties {
  const showBelow   = top < 35;
  const anchorRight = left > 78;
  const anchorLeft  = left < 18;

  const hPos = anchorRight
    ? { right: 14, left: "auto" }
    : anchorLeft
    ? { left: 14, right: "auto" }
    : { left: "50%", transform: "translateX(-50%)" };

  return {
    position: "absolute",
    ...(showBelow ? { top: -5 } : { bottom: -5 }),
    ...hPos,
    width:      10,
    height:     10,
    background: "rgba(6,6,15,0.94)",
    border:     `1px solid ${accent}50`,
    ...(showBelow
      ? { borderBottom: "none", borderRight: "none" }
      : { borderTop:    "none", borderLeft:  "none" }),
    rotate: "45deg",
    pointerEvents: "none",
  };
}

interface Props {
  objectives:       Objective[];
  completed:        Set<string>;
  onObjectiveClick: (obj: Objective) => void;
}

export default function Arena1HotspotMap({ objectives, completed, onObjectiveClick }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 w-full h-full">
      {objectives.map((obj) => {
        const pos = HOTSPOT_POSITIONS[obj.order];
        if (!pos) return null;

        const [left, top] = pos;
        const done       = completed.has(obj.id);
        const accent     = OUTPUT_COLORS[obj.outputType] ?? "#7C3AED";
        const isVisible  = hoveredId === obj.id;

        return (
          <div
            key={obj.id}
            style={{
              position: "absolute",
              left:     `${left}%`,
              top:      `${top}%`,
              zIndex:   isVisible ? 40 : 30,
            }}
          >
            {/* Invisible card-sized hit area */}
            <button
              onMouseEnter={() => setHoveredId(obj.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onObjectiveClick(obj)}
              aria-label={obj.title}
              style={{
                width:      "clamp(56px, 5.5vw, 90px)",
                height:     "clamp(64px, 12vh, 110px)",
                background: "transparent",
                border:     "none",
                cursor:     "pointer",
                display:    "block",
                padding:    0,
              }}
            />

            {/* Tooltip popup */}
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: top < 35 ? -8 : 8 }}
                  animate={{ opacity: 1, scale: 1,   y: 0 }}
                  exit={{    opacity: 0, scale: 0.9, y: top < 35 ? -8 : 8 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={getTooltipStyle(left, top)}
                  onMouseEnter={() => setHoveredId(obj.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div
                    className="rounded-2xl p-3.5"
                    style={{
                      background:     "rgba(6,6,15,0.95)",
                      border:         `1px solid ${accent}55`,
                      backdropFilter: "blur(20px)",
                      boxShadow:      `0 6px 32px rgba(0,0,0,0.7), 0 0 20px ${accent}22`,
                    }}
                  >
                    {/* Output type badge + done */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${accent}18`,
                          color:      accent,
                          border:     `1px solid ${accent}40`,
                        }}
                      >
                        {obj.outputType.toUpperCase()}
                      </span>
                      {done && (
                        <span className="text-[9px] font-mono font-bold text-[#00FF94]">
                          ✓ DONE
                        </span>
                      )}
                      <span className="text-[8px] font-mono text-white/30 ml-auto">
                        click to enter
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-display font-black text-white text-xs leading-tight mb-1.5">
                      {obj.emoji} {obj.title}
                    </p>

                    {/* Description */}
                    <p className="text-[10px] text-white/50 leading-snug mb-2">
                      {obj.description}
                    </p>

                    {/* XP */}
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold"
                      style={{ color: accent }}
                    >
                      <Zap size={9} fill="currentColor" />
                      +{obj.xpReward} XP
                    </span>
                  </div>

                  {/* Arrow */}
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
