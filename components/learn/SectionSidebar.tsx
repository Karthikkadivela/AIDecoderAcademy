"use client";

import { motion } from "framer-motion";
import { LearnChapter, ChapterProgress, PhaseId, PHASES, PhaseStatus } from "@/lib/learnPath";

interface Props {
  chapter: LearnChapter;
  progress: ChapterProgress;
  activeSectionId: string;
  activePhase: PhaseId;
  onSelectSection: (sectionId: string, phase: PhaseId) => void;
}

function PhaseDot({ status, color, bg }: { status: PhaseStatus; color: string; bg: string }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: status === "done" ? color : status === "active" ? "white" : "#E2E8F0",
      border: `2px solid ${status === "locked" ? "#CBD5E1" : color}`,
      boxShadow: status === "done" ? `0 0 0 2px ${bg}` : "none",
      transition: "all 0.3s ease",
    }} />
  );
}

export default function SectionSidebar({ chapter, progress, activeSectionId, activePhase, onSelectSection }: Props) {
  const completedSections = chapter.sections.filter(
    (s) => PHASES.every((p) => progress[s.id]?.[p.id] === "done")
  ).length;

  return (
    <div style={{
      width: 236, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: "#FFFFFF", borderRight: "1.5px solid #E2E8F0",
      overflowY: "auto", scrollbarWidth: "none",
    }}>
      {/* Chapter header */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1.5px solid #F1F5F9" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 22, marginBottom: 10,
          background: `linear-gradient(${chapter.gradient})`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}>
          {chapter.emoji}
        </div>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 17, color: "#1E293B", lineHeight: 1.2, marginBottom: 2 }}>
          {chapter.title}
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'Outfit',sans-serif", fontWeight: 500, marginBottom: 12 }}>
          {chapter.subject} · {chapter.gradeLevel}
        </div>
        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 3, background: `linear-gradient(${chapter.gradient})` }}
              initial={{ width: 0 }}
              animate={{ width: `${(completedSections / chapter.sections.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Outfit',sans-serif", fontWeight: 700 }}>
            {completedSections}/{chapter.sections.length}
          </span>
        </div>
      </div>

      {/* Section list */}
      <div style={{ flex: 1, padding: "10px 10px" }}>
        <div style={{ fontSize: 10, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 6px 8px" }}>
          Sections
        </div>
        {chapter.sections.map((section) => {
          const sectionProg = progress[section.id] ?? {};
          const isActive   = section.id === activeSectionId;
          const isComplete = PHASES.every((p) => sectionProg[p.id] === "done");
          const isLocked   = sectionProg[1] === "locked";
          const bestPhase  = isLocked ? 1 : (
            ([4, 3, 2, 1] as PhaseId[]).find((p) => sectionProg[p] === "active" || sectionProg[p] === "done") ?? 1
          );

          return (
            <motion.div
              key={section.id}
              onClick={() => { if (!isLocked) onSelectSection(section.id, isActive ? activePhase : (bestPhase as PhaseId)); }}
              whileHover={!isLocked ? { x: 2 } : {}}
              style={{
                padding: "10px 10px 9px", borderRadius: 12, marginBottom: 3,
                cursor: isLocked ? "default" : "pointer",
                background: isActive ? "#EEF2FF" : "transparent",
                borderLeft: isActive ? "3px solid #4F46E5" : "3px solid transparent",
                opacity: isLocked ? 0.45 : 1,
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, flexShrink: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 15,
                  background: isComplete ? `linear-gradient(${chapter.gradient})` : isActive ? "#E0E7FF" : "#F8FAFC",
                  color: isComplete ? "#fff" : "#64748B",
                  boxShadow: isComplete ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                }}>
                  {isComplete ? "✓" : section.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13,
                    color: isActive ? "#3730A3" : "#334155",
                    lineHeight: 1.3, marginBottom: 5,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {section.title}
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {PHASES.map((ph) => (
                      <PhaseDot key={ph.id} status={sectionProg[ph.id] ?? "locked"} color={ph.color} bg={ph.bg} />
                    ))}
                  </div>
                </div>
                {isLocked && <span style={{ fontSize: 11, color: "#CBD5E1", flexShrink: 0, marginTop: 2 }}>🔒</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
