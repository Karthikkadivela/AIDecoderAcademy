"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConceptCard, ConceptVisual } from "@/lib/blogSeeds";

interface Props {
  cards: ConceptCard[];
  onComplete: () => void;
  /** Controlled card index — when provided, parent drives navigation */
  cardIdx?: number;
  onCardChange?: (idx: number) => void;
}

// ─── SVG Visuals ─────────────────────────────────────────────────────────────

function RatioDots({ groups }: { groups: { count: number; color: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, padding: "8px 0", position: "relative" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* dot grid */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: g.count <= 3 ? 80 : 120 }}>
            {Array.from({ length: g.count }).map((_, i) => (
              <motion.div key={i}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: gi * 0.15 + i * 0.08, type: "spring", stiffness: 300, damping: 18 }}
                style={{ width: 36, height: 36, borderRadius: "50%", background: g.color, boxShadow: `0 4px 12px ${g.color}55` }}
              />
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 22, color: g.color }}>{g.count}</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#64748B", display: "block" }}>{g.label}</span>
          </div>
        </div>
      ))}
      {/* ratio display between groups */}
      {groups.length === 2 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "absolute" }}>
        </div>
      )}
      {/* colon badge */}
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        background: "#1E293B", color: "#fff", fontFamily: "'Nunito',sans-serif",
        fontWeight: 900, fontSize: 20, padding: "6px 14px", borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
      }}>
        {groups.map(g => g.count).join(" : ")}
      </div>
    </div>
  );
}

function RatioForms({ a, b }: { a: number; b: number }) {
  const forms = [
    { label: "Colon form",    display: `${a} : ${b}`,      note: "Most common in problems" },
    { label: "Fraction form", display: `${a} / ${b}`,      note: "Useful for calculations" },
    { label: "Word form",     display: `${a} to ${b}`,     note: "Used in speech" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {forms.map((f, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
          style={{ display: "flex", alignItems: "center", gap: 16, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ width: 90, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: "#6366F1", textAlign: "center" }}>
            {f.display}
          </div>
          <div>
            <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: "#1E293B" }}>{f.label}</div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#64748B" }}>{f.note}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FactorGrid({ a, b }: { a: number; b: number }) {
  function getFactors(n: number) {
    const f: number[] = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i);
    return f;
  }
  const fa = getFactors(a);
  const fb = getFactors(b);
  const common = new Set(fa.filter(x => fb.includes(x)));
  const hcf = Math.max(...Array.from(common));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[{ n: a, factors: fa }, { n: b, factors: fb }].map(({ n, factors }, ri) => (
        <div key={ri}>
          <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: "#475569", marginBottom: 8 }}>
            Factors of <span style={{ color: "#1E293B" }}>{n}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {factors.map((f, fi) => {
              const isCommon = common.has(f);
              const isHcf = f === hcf;
              return (
                <motion.div key={fi}
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: ri * 0.2 + fi * 0.05 }}
                  style={{
                    width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15,
                    background: isHcf ? "#FEF3C7" : isCommon ? "#EEF2FF" : "#F8FAFC",
                    border: `2px solid ${isHcf ? "#F59E0B" : isCommon ? "#A5B4FC" : "#E2E8F0"}`,
                    color: isHcf ? "#92400E" : isCommon ? "#4338CA" : "#94A3B8",
                    boxShadow: isHcf ? "0 2px 10px rgba(245,158,11,0.25)" : "none",
                  }}>
                  {f}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
      {/* legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: "#EEF2FF", border: "2px solid #A5B4FC" }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#475569" }}>Common factor</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: "#FEF3C7", border: "2px solid #F59E0B" }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#475569" }}>HCF = {hcf}</span>
        </div>
      </div>
    </div>
  );
}

function SimplifyVisual({ from, hcf, to }: { from: [number, number]; hcf: number; to: [number, number] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
      {/* original ratio */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ background: "#F1F5F9", border: "2px solid #CBD5E1", borderRadius: 12, padding: "10px 20px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 24, color: "#475569" }}>
          {from[0]}
        </div>
        <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 20, color: "#94A3B8" }}>:</span>
        <div style={{ background: "#F1F5F9", border: "2px solid #CBD5E1", borderRadius: 12, padding: "10px 20px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 24, color: "#475569" }}>
          {from[1]}
        </div>
      </div>

      {/* divide arrow */}
      <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ delay: 0.4 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ background: "#FEF3C7", border: "1.5px solid #FCD34D", borderRadius: 8, padding: "4px 12px", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: "#92400E" }}>
          ÷ HCF({from[0]}, {from[1]}) = ÷ {hcf}
        </div>
        <div style={{ fontSize: 20, color: "#F59E0B" }}>↓</div>
      </motion.div>

      {/* simplified ratio */}
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 16 }}
        style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ background: "#ECFDF5", border: "2px solid #6EE7B7", borderRadius: 12, padding: "10px 24px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 28, color: "#059669" }}>
          {to[0]}
        </div>
        <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 24, color: "#10B981" }}>:</span>
        <div style={{ background: "#ECFDF5", border: "2px solid #6EE7B7", borderRadius: 12, padding: "10px 24px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 28, color: "#059669" }}>
          {to[1]}
        </div>
      </motion.div>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#059669", fontWeight: 700 }}>Simplest form ✓</span>
    </div>
  );
}

function ScaleChainVisual({ base, steps }: { base: [number, number]; steps: number[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {steps.map((k, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {i > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>×{k}</span>
              <span style={{ fontSize: 14, color: "#94A3B8" }}>→</span>
            </div>
          )}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: i === 0 ? "#EEF2FF" : "#F8FAFC",
              border: `2px solid ${i === 0 ? "#A5B4FC" : "#E2E8F0"}`,
              borderRadius: 12, padding: "10px 16px",
            }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: i === 0 ? "#4338CA" : "#475569" }}>
              {base[0] * k} : {base[1] * k}
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: "#94A3B8" }}>
              {i === 0 ? "base" : `×${k}`}
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}

function CrossCheckVisual({ p, q }: { p: [number, number]; q: [number, number] }) {
  const left = p[0] * q[1];
  const right = p[1] * q[0];
  const equal = left === right;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      {/* the two ratios */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: "#6366F1", background: "#EEF2FF", border: "2px solid #A5B4FC", borderRadius: 12, padding: "10px 18px" }}>
          {p[0]} : {p[1]}
        </div>
        <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 18, color: "#94A3B8" }}>vs</span>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 22, color: "#D97706", background: "#FFFBEB", border: "2px solid #FCD34D", borderRadius: 12, padding: "10px 18px" }}>
          {q[0]} : {q[1]}
        </div>
      </div>

      {/* cross multiply arrows */}
      <div style={{ position: "relative", width: 220, height: 36 }}>
        <svg width="220" height="36" viewBox="0 0 220 36">
          <defs>
            <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6366F1" />
            </marker>
            <marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#D97706" />
            </marker>
          </defs>
          <line x1="40" y1="8" x2="180" y2="28" stroke="#6366F1" strokeWidth="2" markerEnd="url(#ah)" />
          <line x1="180" y1="8" x2="40" y2="28" stroke="#D97706" strokeWidth="2" markerEnd="url(#ah2)" />
        </svg>
      </div>

      {/* products */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: "#6366F1" }}>
          {p[0]} × {q[1]} = <span style={{ color: "#1E293B" }}>{left}</span>
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
          style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 22, color: equal ? "#059669" : "#DC2626" }}>
          {equal ? "=" : "≠"}
        </motion.div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 18, color: "#D97706" }}>
          {p[1]} × {q[0]} = <span style={{ color: "#1E293B" }}>{right}</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
        style={{ background: equal ? "#ECFDF5" : "#FEF2F2", border: `1.5px solid ${equal ? "#6EE7B7" : "#FECACA"}`, borderRadius: 10, padding: "8px 18px", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, color: equal ? "#059669" : "#DC2626" }}>
        {equal ? "✓ Equivalent ratios!" : "✗ Not equivalent"}
      </motion.div>
    </div>
  );
}

function MissingValVisual({ known, target, scale, answer }: { known: [number, number]; target: number; scale: number; answer: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      {/* equation */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 20 }}>
        <span style={{ color: "#6366F1" }}>{known[0]} : {known[1]}</span>
        <span style={{ color: "#94A3B8" }}>=</span>
        <span style={{ color: "#D97706" }}>
          <span style={{ background: "#FEF3C7", padding: "2px 10px", borderRadius: 8, border: "2px dashed #F59E0B", color: "#92400E" }}>?</span>
          {" "}: {target}
        </span>
      </div>

      {/* scale factor finding */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "12px 20px", width: "100%", maxWidth: 320 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#64748B", marginBottom: 6 }}>Find the scale factor:</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15, color: "#1E293B" }}>
          {known[1]} × <span style={{ color: "#6366F1" }}>{scale}</span> = {target}
        </div>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 13, color: "#6366F1", fontWeight: 700, marginTop: 4 }}>Scale factor = {scale}</div>
      </motion.div>

      {/* apply to first term */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "12px 20px", width: "100%", maxWidth: 320 }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#64748B", marginBottom: 6 }}>Apply to first term:</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15, color: "#1E293B" }}>
          {known[0]} × <span style={{ color: "#6366F1" }}>{scale}</span> = <span style={{ color: "#059669", fontSize: 18 }}>{answer}</span>
        </div>
      </motion.div>

      {/* answer */}
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: "spring" }}
        style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 16, color: "#059669", background: "#ECFDF5", border: "2px solid #6EE7B7", borderRadius: 12, padding: "10px 24px" }}>
        {known[0]} : {known[1]} = {answer} : {target} ✓
      </motion.div>
    </div>
  );
}

// ─── Visual Router ────────────────────────────────────────────────────────────

function ConceptVisualRenderer({ visual }: { visual: ConceptVisual }) {
  switch (visual.type) {
    case "ratio-dots":    return <RatioDots groups={visual.groups} />;
    case "ratio-forms":   return <RatioForms a={visual.a} b={visual.b} />;
    case "factor-grid":   return <FactorGrid a={visual.a} b={visual.b} />;
    case "simplify":      return <SimplifyVisual from={visual.from} hcf={visual.hcf} to={visual.to} />;
    case "scale-chain":   return <ScaleChainVisual base={visual.base} steps={visual.steps} />;
    case "cross-check":   return <CrossCheckVisual p={visual.p} q={visual.q} />;
    case "missing-val":   return <MissingValVisual known={visual.known} target={visual.target} scale={visual.scale} answer={visual.answer} />;
    default:              return null;
  }
}

// ─── Main ConceptExplainer ────────────────────────────────────────────────────

export default function ConceptExplainer({ cards, onComplete, cardIdx: externalIdx, onCardChange }: Props) {
  const [internalIdx, setInternalIdx] = useState(0);
  const idx = externalIdx !== undefined ? externalIdx : internalIdx;
  const card = cards[idx];
  const isLast = idx === cards.length - 1;

  // Sync internal state when parent drives externally (avoids stale idx on uncontrolled fallback)
  useEffect(() => {
    if (externalIdx !== undefined) setInternalIdx(externalIdx);
  }, [externalIdx]);

  function navigate(next: number) {
    const clamped = Math.max(0, Math.min(cards.length - 1, next));
    if (externalIdx !== undefined) {
      onCardChange?.(clamped);
    } else {
      setInternalIdx(clamped);
      onCardChange?.(clamped);
    }
  }

  // Layout: outer = flex column filling available space.
  // Scrollable content area takes all space above the sticky nav bar.
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#F8FAFC" }}>

      {/* progress bar */}
      <div style={{ height: 4, background: "#E2E8F0", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${((idx + 1) / cards.length) * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 2 }}
        />
      </div>

      {/* scrollable card content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 16px" }}>

        {/* step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {cards.map((_, i) => (
              <motion.div key={i}
                animate={{ width: i === idx ? 24 : 8, background: i < idx ? "#6366F1" : i === idx ? "#818CF8" : "#E2E8F0" }}
                style={{ height: 8, borderRadius: 4 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>
            {idx + 1} of {cards.length}
          </span>
        </div>

        {/* card */}
        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* title */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#EEF2FF", marginBottom: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: "#6366F1", letterSpacing: 1 }}>CONCEPT {idx + 1}</span>
              </div>
              <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 24, color: "#1E293B", margin: 0, lineHeight: 1.3 }}>
                {card.title}
              </h2>
            </div>

            {/* hook */}
            <div style={{ background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)", border: "2px solid #C7D2FE", borderRadius: 14, padding: "16px 20px" }}>
              <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 17, color: "#3730A3", margin: 0, lineHeight: 1.5 }}>
                {card.hook}
              </p>
            </div>

            {/* visual row: interactive diagram left + generated image right */}
            <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
              {/* interactive SVG diagram */}
              <div style={{ flex: 1, background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                {card.imageUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, textTransform: "uppercase" }}>
                      Interactive Diagram
                    </span>
                  </div>
                )}
                <ConceptVisualRenderer visual={card.visual} />
              </div>

              {/* generated image */}
              {card.imageUrl && (
                <div style={{ width: 260, flexShrink: 0, borderRadius: 16, overflow: "hidden", border: "1.5px solid #E2E8F0", boxShadow: "0 4px 20px rgba(99,102,241,0.12)", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
                  />
                </div>
              )}
            </div>

            {/* body paragraphs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {card.body.map((para, pi) => (
                <p key={pi} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, color: "#334155", lineHeight: 1.75, margin: 0 }}>
                  {para}
                </p>
              ))}
            </div>

            {/* tip */}
            {card.tip && (
              <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "#92400E", lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                  {card.tip}
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* sticky nav bar — always visible at bottom */}
      <div style={{
        flexShrink: 0,
        borderTop: "1.5px solid #E2E8F0",
        background: "#FFFFFF",
        padding: "14px 28px",
        display: "flex",
        gap: 10,
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <button onClick={() => navigate(idx - 1)} disabled={idx === 0}
          style={{
            padding: "11px 24px", borderRadius: 12, border: "1.5px solid #E2E8F0",
            background: idx === 0 ? "#F8FAFC" : "#FFFFFF",
            color: idx === 0 ? "#CBD5E1" : "#334155",
            fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
            cursor: idx === 0 ? "default" : "pointer",
          }}>
          ← Back
        </button>

        {/* dot indicators in the middle */}
        <div style={{ display: "flex", gap: 6 }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => navigate(i)} style={{
              width: i === idx ? 20 : 8, height: 8, borderRadius: 4, cursor: "pointer",
              background: i < idx ? "#6366F1" : i === idx ? "#818CF8" : "#E2E8F0",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {isLast ? (
          <motion.button onClick={onComplete}
            whileHover={{ scale: 1.04, boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: "13px 28px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 15,
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
            }}>
            Start Solving 🚀
          </motion.button>
        ) : (
          <motion.button onClick={() => navigate(idx + 1)}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{
              padding: "11px 28px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #818CF8, #6366F1)",
              color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15,
              boxShadow: "0 4px 14px rgba(99,102,241,0.28)",
            }}>
            Next →
          </motion.button>
        )}
      </div>
    </div>
  );
}
