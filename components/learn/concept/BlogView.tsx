"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { LearnSection } from "@/lib/learnPath";

interface Props { section: LearnSection; subject: string; gradeLevel: string; onViewed: () => void; viewed: boolean; }

export default function BlogView({ section, subject, gradeLevel, onViewed, viewed }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  function generate() {
    setStarted(true); setLoading(true); setContent("");
    fetch("/api/classroom/lesson", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterTitle: section.title, subject, gradeLevel, topic: section.topic }),
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
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 4px 14px rgba(79,70,229,0.15)" }}>📝</div>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 20, color: "#1E293B", marginBottom: 6 }}>Deep Dive Article</h3>
        <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 14, maxWidth: 300, margin: 0 }}>
          A clear, engaging explanation of {section.title} — written just for you.
        </p>
      </div>
      <motion.button onClick={generate} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        style={{ padding: "12px 30px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}>
        Generate Article
      </motion.button>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", scrollbarWidth: "none" }}>
      {viewed && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 16, padding: "5px 12px", borderRadius: 20, background: "#ECFDF5", border: "1.5px solid #A7F3D0" }}>
          <span style={{ fontSize: 11, color: "#059669" }}>✓</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#059669" }}>Read</span>
        </div>
      )}
      <div style={{ fontFamily: "'Outfit',sans-serif", color: "#334155", lineHeight: 1.8, fontSize: 15 }}>
        <ReactMarkdown components={{
          h1: ({ children }) => <h1 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 22, color: "#1E293B", marginBottom: 12, marginTop: 24 }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 18, color: "#1E293B", marginBottom: 10, marginTop: 20 }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, color: "#334155", marginBottom: 8, marginTop: 16 }}>{children}</h3>,
          strong: ({ children }) => <strong style={{ fontWeight: 700, color: "#1E293B" }}>{children}</strong>,
          p: ({ children }) => <p style={{ marginBottom: 14, margin: "0 0 14px" }}>{children}</p>,
        }}>
          {content}
        </ReactMarkdown>
      </div>
      {loading && <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 40, height: 3, borderRadius: 2, background: "#6366F1", marginTop: 12 }} />}
    </div>
  );
}
