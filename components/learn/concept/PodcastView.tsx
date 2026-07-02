"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";
import { AudioPlayer, AudioData } from "@/components/playground/AudioPlayer";

interface Props { section: LearnSection; subject: string; gradeLevel: string; onViewed: () => void; viewed: boolean; }

export default function PodcastView({ section, subject, gradeLevel, onViewed, viewed }: Props) {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [started, setStarted]     = useState(false);
  const [error, setError]         = useState("");

  function generate() {
    setStarted(true); setLoading(true); setError("");
    fetch("/api/generate-audio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Create an engaging educational podcast episode about "${section.title}" for Class 10 students. Topic: ${section.topic}. Make it conversational between a host and a guest expert, use real-world examples, around 3–4 minutes.`,
        outputType: "audio",
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.audioUrl) { setAudioData({ url: d.audioUrl, script: d.script ?? [] }); if (!viewed) onViewed(); }
        else throw new Error(d.error ?? "No audio");
      })
      .catch(() => setError("Couldn't generate podcast. Please try again."))
      .finally(() => setLoading(false));
  }

  if (!started) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 4px 14px rgba(124,58,237,0.15)" }}>🎙️</div>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 20, color: "#1E293B", marginBottom: 6 }}>Mini Podcast</h3>
        <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 14, maxWidth: 300, margin: 0 }}>
          A 3–4 min audio episode where a host and guest expert break down {section.title}.
        </p>
      </div>
      <motion.button onClick={generate} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        style={{ padding: "12px 30px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
        Generate Podcast
      </motion.button>
    </div>
  );

  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #EDE9FE", borderTopColor: "#8B5CF6" }} />
      <p style={{ fontFamily: "'Outfit',sans-serif", color: "#6D28D9", fontSize: 15, fontWeight: 600 }}>Recording your podcast episode...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: "#DC2626", fontFamily: "'Outfit',sans-serif" }}>{error}</p>
      <button onClick={generate} style={{ padding: "8px 20px", borderRadius: 10, background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>Retry</button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px", gap: 16, overflowY: "auto", scrollbarWidth: "none" }}>
      {viewed && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "#ECFDF5", border: "1.5px solid #A7F3D0" }}>
          <span style={{ fontSize: 11, color: "#059669" }}>✓</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#059669" }}>Listened</span>
        </div>
      )}
      {audioData && <AudioPlayer data={audioData} />}
    </div>
  );
}
