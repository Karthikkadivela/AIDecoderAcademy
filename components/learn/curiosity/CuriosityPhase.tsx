"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThinkCard, { ThinkCardData, ThinkCardHandle } from "./ThinkCard";
import { LearnSection } from "@/lib/learnPath";

export interface CuriosityPhaseHandle {
  /** Ms. Aria auto-selects an option; card stays in reflect stage. */
  selectOption: (idx: number) => void;
  /** Ms. Aria reveals the fact card after student gives confidence/reasoning. */
  revealCard: () => void;
}

interface Props {
  section: LearnSection;
  gradeLevel: string;
  subject: string;
  onPhaseComplete: () => void;
  onCardActive?: (question: string | null) => void;
  /** Fires with option texts whenever the active card changes (for voice context). */
  onCardOptionsActive?: (options: string[]) => void;
  onOptionSelect?: (optionText: string) => void;
  onReveal?: (hookText: string) => void;
}

const CuriosityPhase = forwardRef<CuriosityPhaseHandle, Props>(function CuriosityPhase(
  { section, gradeLevel, subject, onPhaseComplete, onCardActive, onCardOptionsActive, onOptionSelect, onReveal },
  ref,
) {
  const [cards,    setCards]    = useState<ThinkCardData[]>([]);
  const [cardIdx,  setCardIdx]  = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [allDone,  setAllDone]  = useState(false);

  const thinkCardRef = useRef<ThinkCardHandle>(null);

  useImperativeHandle(ref, () => ({
    selectOption(idx: number) {
      thinkCardRef.current?.selectOption(idx);
    },
    revealCard() {
      thinkCardRef.current?.revealCard();
    },
  }));

  // Notify parent whenever the active card changes (question + options for voice)
  useEffect(() => {
    const card = cards[cardIdx];
    onCardActive?.(card?.question ?? null);
    onCardOptionsActive?.(card?.options.map(o => o.text) ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardIdx, cards]);

  useEffect(() => {
    setCardIdx(0); setAllDone(false); setError("");

    if (section.thinkCards?.length) {
      setCards(section.thinkCards);
      setLoading(false);
      return;
    }

    setLoading(true); setCards([]);
    fetch("/api/learn/think-cards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionTitle: section.title, topic: section.topic, subject, gradeLevel }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.cards?.length) throw new Error(); setCards(d.cards); })
      .catch(() => setError("Couldn't load think cards. Please try again."))
      .finally(() => setLoading(false));
  }, [section.id]);

  function handleCardDone() {
    if (cardIdx < cards.length - 1) setCardIdx((i) => i + 1);
    else setAllDone(true);
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#FFFBEB" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #FDE68A", borderTopColor: "#F59E0B" }} />
      <p style={{ fontFamily: "'Outfit',sans-serif", color: "#92400E", fontSize: 15, fontWeight: 600 }}>Brewing some curious questions...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#FFFBEB" }}>
      <p style={{ color: "#DC2626", fontFamily: "'Outfit',sans-serif" }}>{error}</p>
      <button onClick={() => { setLoading(true); setError(""); }}
        style={{ padding: "8px 20px", borderRadius: 10, background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>
        Try again
      </button>
    </div>
  );

  if (allDone) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "0 24px", background: "#FFFBEB" }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }} style={{ fontSize: 72 }}>
        🔥
      </motion.div>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 28, color: "#1E293B", marginBottom: 10 }}>
          You&apos;re curious now!
        </h2>
        <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 16 }}>
          Great questions spark great learning. Let&apos;s find the answers!
        </p>
      </div>
      <motion.button onClick={onPhaseComplete}
        whileHover={{ scale: 1.05, boxShadow: "0 10px 28px rgba(217,119,6,0.4)" }}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: "15px 40px", borderRadius: 16, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 17,
          boxShadow: "0 6px 18px rgba(217,119,6,0.35)",
        }}>
        Start Learning 📖
      </motion.button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 32px", gap: 26, background: "#FFFBEB", overflowY: "auto" }}>
      {/* Section header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: "#FEF3C7", border: "1.5px solid #FCD34D", marginBottom: 10 }}>
          <span style={{ fontSize: 13 }}>🔦</span>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12, color: "#92400E" }}>Spark Phase</span>
        </div>
        <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 20, color: "#1E293B" }}>
          {section.emoji} {section.title}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={cardIdx}
          initial={{ opacity: 0, x: 60, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: "100%", maxWidth: 520 }}
        >
          {cards[cardIdx] && (
            <ThinkCard
              ref={thinkCardRef}
              card={cards[cardIdx]}
              cardIndex={cardIdx}
              totalCards={cards.length}
              onComplete={handleCardDone}
              onOptionSelect={onOptionSelect}
              onReveal={onReveal}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {cards.map((_, i) => (
          <motion.div key={i}
            animate={{ width: i === cardIdx ? 24 : 8, background: i <= cardIdx ? "#F59E0B" : "#E2E8F0" }}
            style={{ height: 8, borderRadius: 4, transition: "all 0.3s ease" }}
          />
        ))}
      </div>
    </div>
  );
});

CuriosityPhase.displayName = "CuriosityPhase";
export default CuriosityPhase;
