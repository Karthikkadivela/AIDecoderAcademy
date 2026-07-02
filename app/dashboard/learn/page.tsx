"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LEARN_CHAPTERS, PHASES, loadProgress } from "@/lib/learnPath";
import { useEffect, useState } from "react";

export default function LearnIndexPage() {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const ch of LEARN_CHAPTERS) {
      try {
        const prog = loadProgress(ch.id, ch);
        const done = ch.sections.filter((s) => PHASES.every((p) => prog[s.id]?.[p.id] === "done")).length;
        map[ch.id] = Math.round((done / ch.sections.length) * 100);
      } catch { map[ch.id] = 0; }
    }
    setProgressMap(map);
  }, []);

  return (
    <div style={{ minHeight: "calc(100vh - 57px)", background: "linear-gradient(160deg, #F8F9FF 0%, #EEF2FF 100%)", padding: "40px 48px" }}>
      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: "#EEF2FF", border: "1.5px solid #C7D2FE", marginBottom: 14 }}>
            <span style={{ fontSize: 13 }}>🎓</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12, color: "#4338CA" }}>Interactive Learning Path</span>
          </div>
          <h1 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 38, color: "#1E293B", marginBottom: 8, lineHeight: 1.1 }}>
            Choose your chapter
          </h1>
          <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 16, marginBottom: 36 }}>
            Four phases. One chapter. Total mastery.
          </p>
        </motion.div>

        {/* Phase legend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: "flex", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
          {PHASES.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: "#FFFFFF", border: `1.5px solid ${p.color}33`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: p.color, fontWeight: 700 }}>
                {p.emoji} {p.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Chapter cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {LEARN_CHAPTERS.map((ch, i) => {
            const pct = progressMap[ch.id] ?? 0;
            return (
              <motion.div key={ch.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}>
                <Link href={`/dashboard/learn/${ch.id}`} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ y: -5, boxShadow: "0 16px 40px rgba(79,70,229,0.12)" }}
                    whileTap={{ scale: 0.98 }}
                    style={{ borderRadius: 24, overflow: "hidden", cursor: "pointer", background: "#FFFFFF", border: "2px solid #E2E8F0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", transition: "all 0.2s ease" }}
                  >
                    {/* Banner */}
                    <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(${ch.gradient})`, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.12)" }} />
                      <span style={{ fontSize: 52, position: "relative" }}>{ch.emoji}</span>
                      <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                          {ch.sections.length} sections
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: "18px 20px 20px" }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
                          {ch.subject} · {ch.gradeLevel}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 20, color: "#1E293B", marginBottom: 14 }}>
                        {ch.title}
                      </h3>

                      {/* Phase pills */}
                      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
                        {PHASES.map((p) => (
                          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: p.bg, border: `1px solid ${p.color}40` }}>
                            <span style={{ fontSize: 9 }}>{p.emoji}</span>
                            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, color: p.color }}>{p.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: `linear-gradient(${ch.gradient})`, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
