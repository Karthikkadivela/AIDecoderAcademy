"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";
import { FlashcardDeck } from "@/components/classroom/FlashcardDeck";

interface FlashCard { question: string; answer: string; imageUrl?: string; }

interface Props { section: LearnSection; subject: string; gradeLevel: string; onSectionComplete: () => void; }

export default function SummaryPhase({ section, subject, gradeLevel, onSectionComplete }: Props) {
  const [flashcards, setFlashcards]         = useState<FlashCard[] | null>(null);
  const [flashLoading, setFlashLoading]     = useState(false);
  const [infographic, setInfographic]       = useState<string | null>(null);
  const [infoLoading, setInfoLoading]       = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

  function generateFlashcards() {
    setFlashLoading(true);
    fetch("/api/classroom/flashcards/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterTitle: section.title, subject }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.cards) setFlashcards(d.cards); })
      .catch(console.error)
      .finally(() => setFlashLoading(false));
  }

  function generateInfographic() {
    setInfoLoading(true);
    fetch("/api/classroom/infographic/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: section.title, chapterTitle: section.title, subject }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.imageUrl) setInfographic(d.imageUrl); })
      .catch(console.error)
      .finally(() => setInfoLoading(false));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ECFDF5", overflowY: "auto", scrollbarWidth: "none" }}>
      {/* Header */}
      <div style={{ background: "#FFFFFF", borderBottom: "1.5px solid #A7F3D0", padding: "16px 24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#ECFDF5", border: "1.5px solid #6EE7B7", marginBottom: 8 }}>
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "#059669" }}>Reflect Phase</span>
        </div>
        <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 20, color: "#1E293B", margin: 0 }}>
          {section.emoji} Lock in {section.title}
        </h2>
      </div>

      <div style={{ padding: "24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Flashcard card */}
        <div style={{ padding: "20px", borderRadius: 20, background: "#FFFFFF", border: "2px solid #A7F3D0", boxShadow: "0 4px 16px rgba(16,185,129,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: flashcards ? 14 : 0 }}>
            <div>
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 16, color: "#1E293B", marginBottom: 2 }}>
                🃏 Flashcard Recap
              </div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#64748B" }}>Key facts to remember</div>
            </div>
            {!flashcards ? (
              <motion.button onClick={generateFlashcards} disabled={flashLoading}
                whileHover={!flashLoading ? { scale: 1.05 } : {}} whileTap={!flashLoading ? { scale: 0.97 } : {}}
                style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: flashLoading ? "wait" : "pointer", background: flashLoading ? "#E2E8F0" : "linear-gradient(135deg, #10B981, #059669)", color: flashLoading ? "#94A3B8" : "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, boxShadow: flashLoading ? "none" : "0 4px 10px rgba(16,185,129,0.3)", transition: "all 0.18s" }}>
                {flashLoading ? "Generating..." : "Generate"}
              </motion.button>
            ) : (
              <motion.button onClick={() => setShowFlashcards(true)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 10px rgba(16,185,129,0.3)" }}>
                Open Cards ↗
              </motion.button>
            )}
          </div>
          {flashcards && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {flashcards.map((_, i) => (
                <div key={i} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontFamily: "'Outfit',sans-serif", fontWeight: 700, background: "#D1FAE5", color: "#059669", border: "1px solid #A7F3D0" }}>
                  Card {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infographic card */}
        <div style={{ padding: "20px", borderRadius: 20, background: "#FFFFFF", border: "2px solid #A7F3D0", boxShadow: "0 4px 16px rgba(16,185,129,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: infographic ? 14 : 0 }}>
            <div>
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 16, color: "#1E293B", marginBottom: 2 }}>
                🗺️ Visual Summary
              </div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#64748B" }}>A visual infographic of the section</div>
            </div>
            {!infographic && (
              <motion.button onClick={generateInfographic} disabled={infoLoading}
                whileHover={!infoLoading ? { scale: 1.05 } : {}} whileTap={!infoLoading ? { scale: 0.97 } : {}}
                style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: infoLoading ? "wait" : "pointer", background: infoLoading ? "#E2E8F0" : "linear-gradient(135deg, #34D399, #10B981)", color: infoLoading ? "#94A3B8" : "#065F46", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, boxShadow: infoLoading ? "none" : "0 4px 10px rgba(16,185,129,0.25)", transition: "all 0.18s" }}>
                {infoLoading ? "Generating..." : "Generate"}
              </motion.button>
            )}
          </div>
          {infographic && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={infographic} alt="Section infographic" style={{ width: "100%", borderRadius: 12, objectFit: "cover" }} />
            </motion.div>
          )}
        </div>

        {/* Complete CTA */}
        <motion.button onClick={onSectionComplete}
          whileHover={{ scale: 1.03, boxShadow: "0 10px 30px rgba(16,185,129,0.4)" }}
          whileTap={{ scale: 0.97 }}
          style={{ padding: "17px 0", borderRadius: 18, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 17, boxShadow: "0 6px 20px rgba(16,185,129,0.3)" }}>
          Section Complete — Next Up! 🎯
        </motion.button>
      </div>

      {showFlashcards && flashcards && (
        <FlashcardDeck cards={flashcards} topic={section.title} subject={subject} onClose={() => setShowFlashcards(false)} />
      )}
    </div>
  );
}
