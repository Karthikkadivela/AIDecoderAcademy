"use client";

import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ThinkCardData {
  question: string;
  imageUrl?: string;
  options: Array<{ text: string; hook: string }>;
}

export interface ThinkCardHandle {
  /** Selects an option programmatically (stays in reflect stage). */
  selectOption: (idx: number) => void;
  /** Flips the card to reveal the hook — called after student gives confidence/reasoning. */
  revealCard: () => void;
}

interface Props {
  card: ThinkCardData;
  cardIndex: number;
  totalCards: number;
  onComplete: () => void;
  onOptionSelect?: (optionText: string) => void;
  onReveal?: (hookText: string) => void;
}

const OPTION_STYLES = [
  { border: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8", label: "#1D4ED8", labelBg: "#DBEAFE" },
  { border: "#8B5CF6", bg: "#F5F3FF", text: "#6D28D9", label: "#6D28D9", labelBg: "#EDE9FE" },
  { border: "#EC4899", bg: "#FDF2F8", text: "#BE185D", label: "#BE185D", labelBg: "#FCE7F3" },
];

const CONFIDENCE_OPTS = [
  { id: "not",      label: "Not confident",      border: "#FDA4AF", bg: "#FFF1F2", text: "#BE123C" },
  { id: "somewhat", label: "Somewhat confident",  border: "#FCD34D", bg: "#FFFBEB", text: "#92400E" },
  { id: "very",     label: "Very confident",      border: "#6EE7B7", bg: "#ECFDF5", text: "#065F46" },
];

type Stage = "question" | "reflect" | "revealed";

const ThinkCard = forwardRef<ThinkCardHandle, Props>(function ThinkCard(
  { card, cardIndex, totalCards, onComplete, onOptionSelect, onReveal },
  ref,
) {
  const [selected,    setSelected]    = useState<number | null>(null);
  const [stage,       setStage]       = useState<Stage>("question");
  const [confidence,  setConfidence]  = useState<string | null>(null);
  const [reasoning,   setReasoning]   = useState("");
  const [flipped,     setFlipped]     = useState(false);
  const [imgError,    setImgError]    = useState(false);

  // Keep latest selected in a ref so the reveal timer captures the right value
  const selectedRef = useRef<number | null>(null);

  function handleOption(idx: number) {
    if (stage !== "question") return;
    setSelected(idx);
    selectedRef.current = idx;
    setStage("reflect");
    onOptionSelect?.(card.options[idx].text);
  }

  function handleReveal() {
    setFlipped(true);
    setStage("revealed");
    const idx = selectedRef.current;
    if (idx !== null) onReveal?.(card.options[idx].hook);
  }

  useImperativeHandle(ref, () => ({
    selectOption(idx: number) {
      handleOption(idx); // selects + moves to reflect stage, stays there
    },
    revealCard() {
      handleReveal(); // flips card — called after student gives confidence/reasoning
    },
  }));

  const hasImage = !!card.imageUrl && !imgError;

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", perspective: 1200 }}>
      {/* Stack shadow layers */}
      <div style={{ position: "relative" }}>
        {[2, 1].map((i) => (
          <div key={i} style={{
            position: "absolute", inset: 0, borderRadius: 24,
            background: `hsl(220, 30%, ${97 - i * 2}%)`,
            border: "1.5px solid #E2E8F0",
            transform: `translateY(${i * 7}px) scale(${1 - i * 0.025})`,
            zIndex: -i,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }} />
        ))}

        <motion.div
          style={{ transformStyle: "preserve-3d", position: "relative" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* ── FRONT ── */}
          <div style={{
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            borderRadius: 24, overflow: "hidden",
            background: "#FFFFFF",
            border: "1.5px solid #E2E8F0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          }}>
            {/* Image / placeholder */}
            <div style={{
              height: 240, position: "relative", overflow: "hidden",
              background: hasImage ? "#F1F5F9" : "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt="illustration"
                  onError={() => setImgError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
              ) : (
                <span style={{ fontSize: 56, opacity: 0.6 }}>🤔</span>
              )}
              {/* Card counter chip */}
              <div style={{
                position: "absolute", top: 12, right: 12, padding: "4px 10px",
                borderRadius: 20, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(6px)",
              }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                  {cardIndex + 1} / {totalCards}
                </span>
              </div>
              {/* Traffic-light dots */}
              <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 5 }}>
                {["#F59E0B", "#EF4444", "#10B981"].map((c) => (
                  <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c, opacity: 0.75 }} />
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Question */}
              <div>
                <div style={{ fontSize: 11, fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  🤔 Think about it...
                </div>
                <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 17, color: "#1E293B", lineHeight: 1.45, margin: 0 }}>
                  {card.question}
                </p>
              </div>

              {/* Options — visible in "question" stage */}
              <AnimatePresence mode="wait">
                {stage === "question" && (
                  <motion.div key="options" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                    style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {card.options.map((opt, idx) => {
                      const s = OPTION_STYLES[idx];
                      return (
                        <motion.button key={idx} onClick={() => handleOption(idx)}
                          whileHover={{ x: 4, boxShadow: `0 4px 16px ${s.border}28` }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            padding: "11px 14px", borderRadius: 13, textAlign: "left",
                            background: "#F8FAFC", border: `2px solid #E2E8F0`,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 11,
                            transition: "all 0.18s ease",
                          }}>
                          <span style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, fontFamily: "'Outfit',sans-serif", background: "#E2E8F0", color: "#94A3B8" }}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, color: "#475569" }}>{opt.text}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Reflect stage — selected option + confidence + reasoning */}
                {stage === "reflect" && selected !== null && (
                  <motion.div key="reflect" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                    style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Chosen option pill */}
                    <div style={{ padding: "10px 14px", borderRadius: 13, background: "#F0FDF4", border: "1.5px solid #BBF7D0", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: "#10B981", color: "#fff", flexShrink: 0, fontFamily: "'Outfit',sans-serif" }}>
                        {String.fromCharCode(65 + selected)}
                      </span>
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, color: "#065F46" }}>{card.options[selected].text}</span>
                    </div>

                    {/* Confidence */}
                    <div>
                      <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>
                        How confident are you?
                      </div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {CONFIDENCE_OPTS.map((c) => (
                          <motion.button key={c.id} onClick={() => setConfidence(c.id)}
                            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                            style={{
                              padding: "7px 14px", borderRadius: 20, cursor: "pointer",
                              fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 12,
                              background: confidence === c.id ? c.bg : "#F8FAFC",
                              border: `1.5px solid ${confidence === c.id ? c.border : "#E2E8F0"}`,
                              color: confidence === c.id ? c.text : "#94A3B8",
                              transition: "all 0.15s ease",
                            }}>
                            {c.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Reasoning textarea */}
                    <div>
                      <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Explain your reasoning
                      </div>
                      <textarea
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder="Why did you choose that answer? Think step by step..."
                        rows={3}
                        style={{
                          width: "100%", padding: "11px 14px", borderRadius: 12, resize: "none",
                          fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#334155",
                          background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                          outline: "none", lineHeight: 1.55, boxSizing: "border-box",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#F59E0B"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; }}
                      />
                    </div>

                    {/* Reveal CTA */}
                    <motion.button onClick={handleReveal}
                      whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(217,119,6,0.35)" }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: "13px 0", borderRadius: 14, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, #F59E0B, #D97706)",
                        color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15,
                        boxShadow: "0 4px 14px rgba(217,119,6,0.3)",
                      }}>
                      Reveal Answer →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── BACK — hook reveal ── */}
          <div style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 24, overflow: "hidden",
            background: "linear-gradient(145deg, #FFFBEB, #FEF3C7)",
            border: "2px solid #FCD34D",
            boxShadow: "0 8px 32px rgba(245,158,11,0.15)",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ flex: 1, padding: "24px 24px 26px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    💡
                  </div>
                  <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, color: "#92400E" }}>
                    Here&apos;s something interesting!
                  </div>
                </div>
                {selected !== null && (
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: 15, color: "#78350F", lineHeight: 1.75, margin: 0 }}>
                    {card.options[selected].hook}
                  </p>
                )}
              </div>
              <motion.button onClick={onComplete}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(217,119,6,0.4)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: "14px 0", borderRadius: 14, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15,
                  boxShadow: "0 4px 14px rgba(217,119,6,0.35)",
                }}>
                {cardIndex < totalCards - 1 ? "Next card →" : "Let's learn! 🚀"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
});

ThinkCard.displayName = "ThinkCard";
export default ThinkCard;
