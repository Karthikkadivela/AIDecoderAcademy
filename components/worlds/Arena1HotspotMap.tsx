"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { isObjectiveEnabled, type Objective } from "@/lib/objectives";

// Percentage positions [left%, top%] — top-left corner of each invisible card hit-area
const HOTSPOT_POSITIONS: Record<number, [number, number]> = {
  // ── LEFT COLUMN — missions 01–05 ──
  1:  [8,  10],
  2:  [8,  26],
  3:  [8,  42],
  4:  [8,  58],
  5:  [8,  74],

  // ── RIGHT COLUMN — missions 06–10 ──
  6:  [72, 10],
  7:  [72, 26],
  8:  [72, 42],
  9:  [72, 58],
  10: [72, 74],
};

const OUTPUT_COLORS: Record<string, string> = {
  text:   "#C4B5FD",
  json:   "#7BFFC4",
  image:  "#7AEFFF",
  audio:  "#FF8FB8",
  slides: "#C8FF00",
};

function getTooltipStyle(left: number, top: number): React.CSSProperties {
  const showBelow = top < 44;
  const anchorRight = left > 75;
  const anchorLeft = left < 22;
  const x = Math.min(Math.max(left, 8), 92);

  const hAlign = anchorRight
    ? { left: `${x}%`, transform: "translateX(-100%)" }
    : anchorLeft
    ? { left: `${x}%`, transform: "translateX(0)" }
    : { left: `${x}%`, transform: "translateX(-50%)" };

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
  const showBelow = top < 44;
  const anchorRight = left > 75;
  const anchorLeft = left < 22;
  const x = Math.min(Math.max(left, 8), 92);

  const hPos = anchorRight
    ? { left: `${x}%`, transform: "translateX(-100%)" }
    : anchorLeft
    ? { left: `${x}%`, transform: "translateX(0)" }
    : { left: `${x}%`, transform: "translateX(-50%)" };

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
        const enabled    = isObjectiveEnabled(obj.id);
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
              onClick={() => enabled && onObjectiveClick(obj)}
              disabled={!enabled}
              aria-label={obj.title}
              aria-disabled={!enabled}
              style={{
                width:      "clamp(90px, 8vw, 150px)",
                height:     "clamp(90px, 12vh, 150px)",
                background: "transparent",
                border:     "none",
                borderRadius: 10,
                cursor:     enabled ? "pointer" : "not-allowed",
                padding:    0,
              }}
            />

            {/* Locked tiles stay click-blocked (button disabled above) and
                the tooltip says "coming soon" — but no visual veil over the
                background art, per design decision. */}

            {/* Tooltip popup */}
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: top < 44 ? -8 : 8 }}
                  animate={{ opacity: 1, scale: 1,   y: 0 }}
                  exit={{    opacity: 0, scale: 0.9, y: top < 44 ? -8 : 8 }}
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
                        {enabled ? "click to enter" : "coming soon"}
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
