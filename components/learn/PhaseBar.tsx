"use client";

import { motion } from "framer-motion";
import { PHASES, PhaseId, PhaseStatus } from "@/lib/learnPath";

interface Props {
  sectionProgress: Record<string, PhaseStatus>;
  activePhase: PhaseId;
  onSelectPhase: (phase: PhaseId) => void;
}

export default function PhaseBar({ sectionProgress, activePhase, onSelectPhase }: Props) {
  return (
    <div style={{
      padding: "14px 24px 0", display: "flex", alignItems: "center",
      background: "#FFFFFF", borderBottom: "1.5px solid #F1F5F9",
    }}>
      {PHASES.map((ph, idx) => {
        const status: PhaseStatus = sectionProgress[ph.id] ?? "locked";
        const isActive    = activePhase === ph.id;
        const isClickable = status !== "locked";
        const isDone      = status === "done";

        return (
          <div key={ph.id} style={{ display: "flex", alignItems: "center", flex: idx < PHASES.length - 1 ? 1 : "none" }}>
            <motion.button
              onClick={() => { if (isClickable) onSelectPhase(ph.id); }}
              whileHover={isClickable ? { y: -2 } : {}}
              whileTap={isClickable ? { scale: 0.97 } : {}}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px 10px",
                borderRadius: "10px 10px 0 0", border: "none",
                cursor: isClickable ? "pointer" : "default",
                background: isActive ? ph.bg : "transparent",
                borderBottom: isActive ? `3px solid ${ph.color}` : "3px solid transparent",
                transition: "all 0.2s ease",
                flexShrink: 0,
                position: "relative",
                bottom: -1,
              }}
            >
              <span style={{ fontSize: 15 }}>{isDone && !isActive ? "✅" : ph.emoji}</span>
              <span style={{
                fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13,
                color: isActive ? ph.color : isDone ? "#64748B" : "#CBD5E1",
              }}>
                {ph.label}
              </span>
            </motion.button>

            {idx < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 2, background: "#F1F5F9", margin: "0 4px 0" }}>
                <motion.div
                  style={{ height: "100%", background: isDone ? ph.color : "transparent", borderRadius: 1 }}
                  initial={{ width: 0 }}
                  animate={{ width: isDone ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
