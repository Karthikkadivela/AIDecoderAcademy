"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";

interface Props { section: LearnSection; subject: string; gradeLevel: string; onViewed: () => void; viewed: boolean; }

const BORDER_COLORS = ["#6366F1", "#EC4899", "#0891B2"];

export default function StoryView({ section, subject, gradeLevel, onViewed, viewed }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  function generate() {
    setStarted(true); setLoading(true); setContent("");
    fetch("/api/learn/concept/story", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionTitle: section.title, topic: section.topic, subject, gradeLevel }),
    }).then((res) => {
      if (!res.body) return;
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      function pump(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) { setLoading(false); if (!viewed) onViewed(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const d = line.slice(6).trim();
              if (d === "[DONE]") { setLoading(false); if (!viewed) onViewed(); return; }
              try { const j = JSON.parse(d); if (j.text) setContent((p) => p + j.text); } catch {}
            }
          }
          return pump();
        });
      }
      pump().catch(() => setLoading(false));
    });
  }

  if (!started) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "#ECFEFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 4px 14px rgba(8,145,178,0.15)" }}>📖</div>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 20, color: "#1E293B", marginBottom: 6 }}>Story Time</h3>
        <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 14, maxWidth: 300, margin: 0 }}>
          A short, gripping story where the concepts come alive through a real-world adventure.
        </p>
      </div>
      <motion.button onClick={generate} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        style={{ padding: "12px 30px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #0891B2, #0E7490)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 14px rgba(8,145,178,0.3)" }}>
        Tell me a story
      </motion.button>
    </div>
  );

  const paragraphs = content.split("—").map((p) => p.trim()).filter(Boolean);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", scrollbarWidth: "none" }}>
      {viewed && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 20, padding: "5px 12px", borderRadius: 20, background: "#ECFDF5", border: "1.5px solid #A7F3D0" }}>
          <span style={{ fontSize: 11, color: "#059669" }}>✓</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#059669" }}>Read</span>
        </div>
      )}
      {paragraphs.map((para, idx) => (
        <div key={idx} style={{ marginBottom: 18, paddingLeft: 16, borderLeft: `3px solid ${BORDER_COLORS[idx % 3]}` }}>
          <p style={{ fontFamily: "'Outfit',sans-serif", color: "#334155", lineHeight: 1.8, fontSize: 15, margin: 0 }}>{para}</p>
        </div>
      ))}
      {loading && content.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #BFDBFE", borderTopColor: "#0891B2" }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", color: "#94A3B8", fontSize: 13 }}>Writing your story...</span>
        </div>
      )}
      {loading && content.length > 0 && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 40, height: 3, borderRadius: 2, background: "#0891B2", marginTop: 8 }} />
      )}
    </div>
  );
}
