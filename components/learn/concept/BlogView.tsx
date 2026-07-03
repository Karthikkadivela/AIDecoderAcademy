"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";
import { BLOG_SEEDS, CONCEPT_SEEDS, BlogVisual, TextPart, BarData } from "@/lib/blogSeeds";
import ConceptExplainer from "./ConceptExplainer";

export interface BlogState {
  blogPhase: "concept" | "problems";
  conceptCardIdx: number;
  conceptCardTitle: string;
  conceptCardHook: string;
  conceptCardBody: string[];    // explanation paragraphs for full context
  conceptCards: { title: string; hook: string }[];
  problemIdx: number;
  stepIdx: number;
  totalSteps: number;
  isLastStep: boolean;
  isLastProblem: boolean;
  stepInstruction: string;
  stepWhy: string;              // the "why" explanation for the current step
}

export interface BlogViewHandle {
  nextConceptCard: () => void;
  prevConceptCard: () => void;
  goToConceptCard: (idx: number) => void;
  startSolving: () => void;
  goToConcept: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

interface Props {
  section: LearnSection;
  subject: string;
  gradeLevel: string;
  onViewed: () => void;
  viewed: boolean;
  onBlogStateChange?: (state: BlogState) => void;
}

// ── colour helpers ────────────────────────────────────────────────────────────
const BAR_COLORS: Record<BarData["color"], string> = {
  purple: "#7C3AED",
  cyan:   "#00D4FF",
  orange: "#F97316",
  green:  "#10B981",
};

const PART_COLORS: Record<NonNullable<TextPart["color"]>, string> = {
  accent:    "#D97706",   // amber-600
  success:   "#059669",   // emerald-600
  highlight: "#6366F1",   // indigo-500
};

// ── bar chart visual ──────────────────────────────────────────────────────────
function BarChart({ bars }: { bars: BarData[] }) {
  const maxVal = Math.max(...bars.map((b) => b.value));
  const height = 180;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 28, padding: "16px 0 8px", justifyContent: "center", minHeight: 220 }}>
      {bars.map((bar, i) => {
        const barH = Math.max(20, (bar.value / maxVal) * height);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 16, color: BAR_COLORS[bar.color] }}>
              {bar.value}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.1 }}
              style={{
                width: 68,
                borderRadius: "8px 8px 0 0",
                background: `linear-gradient(180deg, ${BAR_COLORS[bar.color]}dd, ${BAR_COLORS[bar.color]}88)`,
                boxShadow: `0 4px 12px ${BAR_COLORS[bar.color]}44`,
              }}
            />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#64748B", fontWeight: 600, textAlign: "center", maxWidth: 80 }}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── equation visual ───────────────────────────────────────────────────────────
function EquationDisplay({ lines }: { lines: TextPart[][] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 500, color: "#1E293B", lineHeight: 1.6 }}>
          {line.map((part, pi) => {
            const color = part.color ? PART_COLORS[part.color] : "#1E293B";
            return (
              <span key={pi} style={{ fontWeight: part.bold ? 800 : 500, color }}>
                {part.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── main visual router ────────────────────────────────────────────────────────
function Visual({ visual }: { visual: BlogVisual }) {
  if (visual.type === "bars") return <BarChart bars={visual.bars} />;
  return <EquationDisplay lines={visual.lines} />;
}

// ── key facts card ────────────────────────────────────────────────────────────
function KeyFacts({ facts }: { facts: { what: string; formula: string; example: string; tip: string } }) {
  const rows: { icon: string; label: string; text: string }[] = [
    { icon: "💡", label: "What",    text: facts.what    },
    { icon: "📐", label: "Formula", text: facts.formula },
    { icon: "🔢", label: "Example", text: facts.example },
    { icon: "✨", label: "Tip",     text: facts.tip     },
  ];
  return (
    <div style={{
      borderRadius: 18,
      background: "#FFFFFF",
      border: "1.5px solid #E2E8F0",
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
      position: "sticky",
      top: 0,
    }}>
      {/* header */}
      <div style={{
        background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
        padding: "14px 20px",
      }}>
        <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 14, color: "#BFDBFE", letterSpacing: 1.5, margin: 0 }}>KEY FACTS</p>
      </div>
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row) => (
          <div key={row.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{row.icon}</span>
              <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#1E40AF", letterSpacing: 0.8 }}>{row.label.toUpperCase()}</span>
            </div>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{row.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main BlogView ─────────────────────────────────────────────────────────────
const BlogView = forwardRef<BlogViewHandle, Props>(function BlogView(
  { section, onViewed, viewed, onBlogStateChange },
  ref,
) {
  const content  = BLOG_SEEDS[section.id];
  const concepts = CONCEPT_SEEDS[section.id];

  // "concept" → show explainer first; "problems" → problem walkthrough
  const [phase, setPhase]               = useState<"concept" | "problems">(concepts ? "concept" : "problems");
  const [conceptCardIdx, setConceptCardIdx] = useState(0);
  const [probIdx, setProbIdx]           = useState(0);
  const [stepIdx, setStepIdx]           = useState(0);
  const [allDone, setAllDone]           = useState(false);

  // Stable refs so imperative handle doesn't go stale
  const phaseRef         = useRef(phase);
  const conceptCardIdxRef = useRef(conceptCardIdx);
  const probIdxRef       = useRef(probIdx);
  const stepIdxRef       = useRef(stepIdx);
  phaseRef.current          = phase;
  conceptCardIdxRef.current = conceptCardIdx;
  probIdxRef.current        = probIdx;
  stepIdxRef.current        = stepIdx;

  // Reset when section changes
  useEffect(() => {
    const hasConceptsForSection = !!CONCEPT_SEEDS[section.id];
    setPhase(hasConceptsForSection ? "concept" : "problems");
    setConceptCardIdx(0);
    setProbIdx(0);
    setStepIdx(0);
    setAllDone(false);
  }, [section.id]);

  // Fire onViewed when all problems are done
  useEffect(() => {
    if (allDone && !viewed) onViewed();
  }, [allDone]);

  // Report blog state upward whenever anything changes
  useEffect(() => {
    if (!onBlogStateChange) return;
    const contentNow  = BLOG_SEEDS[section.id];
    const conceptsNow = CONCEPT_SEEDS[section.id];
    const cards       = conceptsNow?.cards ?? [];
    const problems    = contentNow?.problems ?? [];
    const prob        = problems[probIdx];
    const totalSteps  = prob?.steps.length ?? 0;
    onBlogStateChange({
      blogPhase:        phase,
      conceptCardIdx,
      conceptCardTitle: cards[conceptCardIdx]?.title ?? "",
      conceptCardHook:  cards[conceptCardIdx]?.hook  ?? "",
      conceptCardBody:  cards[conceptCardIdx]?.body  ?? [],
      conceptCards:     cards.map(c => ({ title: c.title, hook: c.hook })),
      problemIdx:       probIdx,
      stepIdx,
      totalSteps,
      isLastStep:    stepIdx === totalSteps - 1,
      isLastProblem: probIdx === problems.length - 1,
      stepInstruction: prob?.steps[stepIdx]?.instruction ?? "",
      stepWhy:         prob?.steps[stepIdx]?.why         ?? "",
    });
  }, [phase, conceptCardIdx, probIdx, stepIdx, section.id]);

  // Expose navigation methods to parent (teacher)
  useImperativeHandle(ref, () => ({
    nextConceptCard:   () => setConceptCardIdx(i => Math.min((CONCEPT_SEEDS[section.id]?.cards.length ?? 1) - 1, i + 1)),
    prevConceptCard:   () => setConceptCardIdx(i => Math.max(0, i - 1)),
    goToConceptCard:   (idx) => { setPhase("concept"); setConceptCardIdx(Math.max(0, Math.min((CONCEPT_SEEDS[section.id]?.cards.length ?? 1) - 1, idx))); },
    startSolving:      () => setPhase("problems"),
    goToConcept:       () => { setPhase("concept"); setConceptCardIdx(0); },
    nextStep:          () => {
      const contentNow = BLOG_SEEDS[section.id];
      const problems   = contentNow?.problems ?? [];
      const totalSteps = problems[probIdxRef.current]?.steps.length ?? 0;
      if (stepIdxRef.current < totalSteps - 1) {
        setStepIdx(i => i + 1);
      } else if (probIdxRef.current < problems.length - 1) {
        setProbIdx(i => i + 1);
        setStepIdx(0);
      }
    },
    prevStep: () => {
      if (stepIdxRef.current > 0) setStepIdx(i => i - 1);
    },
  }), [section.id]);

  // ── concept explainer phase ───────────────────────────────────────────────
  if (phase === "concept" && concepts) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* phase switcher banner */}
        <div style={{ background: "#FFF", borderBottom: "1.5px solid #E2E8F0", padding: "10px 20px", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2 }}>
            <div style={{ padding: "6px 16px", borderRadius: 8, background: "#6366F1", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13 }}>
              📖 Learn
            </div>
            <button onClick={() => setPhase("problems")}
              style={{ padding: "6px 16px", borderRadius: 8, background: "transparent", color: "#64748B", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
              🧩 Practice
            </button>
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#94A3B8" }}>Read all concepts, then try the problems</span>
        </div>
        {/* two-column: concept cards left, key facts right */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <ConceptExplainer
        cards={concepts.cards}
        cardIdx={conceptCardIdx}
        onCardChange={setConceptCardIdx}
        onComplete={() => setPhase("problems")}
      />
          {content && (
            <div style={{ width: 260, flexShrink: 0, borderLeft: "1.5px solid #E2E8F0", padding: 16, overflowY: "auto", background: "#F1F5F9" }}>
              <KeyFacts facts={content.keyFacts} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── no seed data ──────────────────────────────────────────────────────────
  if (!content) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 40 }}>📝</span>
        <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 15, textAlign: "center" }}>
          Blog content for this section is coming soon.
        </p>
      </div>
    );
  }

  const problem  = content.problems[probIdx];
  const step     = problem.steps[stepIdx];
  const totalSteps = problem.steps.length;
  const isLastStep = stepIdx === totalSteps - 1;
  const isLastProblem = probIdx === content.problems.length - 1;

  function goNext() {
    if (!isLastStep) {
      setStepIdx((i) => i + 1);
    } else if (!isLastProblem) {
      setProbIdx((i) => i + 1);
      setStepIdx(0);
    } else {
      setAllDone(true);
    }
  }

  function goBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  function restart() {
    setStepIdx(0);
  }

  function selectProblem(idx: number) {
    setProbIdx(idx);
    setStepIdx(0);
  }

  // ── completion screen ─────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32, background: "#FFFBEB" }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} style={{ fontSize: 64 }}>
          🏆
        </motion.div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 26, color: "#1E293B", marginBottom: 8 }}>All problems solved!</h2>
          <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 15 }}>
            You worked through every step of {section.title}. You&apos;re ready for the challenge!
          </p>
        </div>
        <motion.button
          onClick={() => { setProbIdx(0); setStepIdx(0); setAllDone(false); }}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{ padding: "13px 32px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 6px 20px rgba(217,119,6,0.35)" }}>
          Review problems again
        </motion.button>
      </div>
    );
  }

  // ── main layout ───────────────────────────────────────────────────────────
  // Scroll happens on the outermost div. Left column flows naturally (no fixed
  // height, no inner scroll). Right column is sticky so it stays visible.
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#F8FAFC" }}>

      {/* top bar — problem selector — sticks to top while scrolling */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFF", borderBottom: "1.5px solid #E2E8F0", padding: "10px 20px", display: "flex", gap: 8, alignItems: "center" }}>
        {concepts && (
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 10, padding: 3, gap: 2, marginRight: 8 }}>
            <button onClick={() => setPhase("concept")}
              style={{ padding: "5px 14px", borderRadius: 8, background: "transparent", color: "#64748B", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
              📖 Learn
            </button>
            <div style={{ padding: "5px 14px", borderRadius: 8, background: "#6366F1", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13 }}>
              🧩 Practice
            </div>
          </div>
        )}
        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginRight: 4 }}>PROBLEM</span>
        {content.problems.map((_, i) => (
          <button key={i} onClick={() => selectProblem(i)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "1.5px solid",
              borderColor: i === probIdx ? "#F59E0B" : "#E2E8F0",
              background: i === probIdx ? "#FEF3C7" : "transparent",
              color: i === probIdx ? "#92400E" : "#64748B",
              fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13,
              cursor: "pointer", transition: "all 0.2s",
            }}>
            {i + 1}
          </button>
        ))}
        {viewed && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: "#ECFDF5", border: "1.5px solid #A7F3D0" }}>
            <span style={{ fontSize: 10, color: "#059669" }}>✓</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, color: "#059669" }}>Completed</span>
          </div>
        )}
      </div>

      {/* two-column body — align-items: flex-start so columns size to their content */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>

        {/* ── LEFT: step walkthrough — natural flow, no height constraint ── */}
        <div style={{ flex: 1, padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* eyebrow header */}
          <div style={{ padding: "10px 16px", border: "2px dashed #FCD34D", borderRadius: 12, background: "#FFFBEB" }}>
            <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 11, color: "#92400E", letterSpacing: 1.5, margin: 0 }}>
              WATCH A HARD PROBLEM BECOME SIMPLE
            </p>
          </div>

          {/* problem title */}
          <AnimatePresence mode="wait">
            <motion.h2 key={probIdx + "-title"}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 20, color: "#1E293B", margin: 0 }}>
              {problem.title}
            </motion.h2>
          </AnimatePresence>

          {/* problem statement */}
          <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 11, color: "#92400E", letterSpacing: 1.5 }}>THE PROBLEM</span>
            </div>
            <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "#1E293B", lineHeight: 1.7, margin: 0 }}>
              {problem.problem}
            </p>
          </div>

          {/* step card — no overflow:hidden so bar animation isn't clipped */}
          <AnimatePresence mode="wait">
            <motion.div key={`${probIdx}-${stepIdx}`}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28 }}
              style={{ background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

              {/* step header */}
              <div style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "18px 18px 0 0" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 11, color: "#6366F1", letterSpacing: 1.5, background: "#EEF2FF", padding: "4px 10px", borderRadius: 8 }}>
                  {step.method}
                </span>
                <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: "#94A3B8" }}>
                  STEP {stepIdx + 1} OF {totalSteps}
                </span>
              </div>

              {/* instruction + visual + why */}
              <div style={{ padding: "20px 20px 20px" }}>
                <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 16, color: "#1E293B", margin: "0 0 18px" }}>
                  {step.instruction}
                </p>

                {/* visual */}
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "20px 18px", border: "1.5px solid #E2E8F0", marginBottom: 16 }}>
                  <Visual visual={step.visual} />
                </div>

                {/* why */}
                <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "14px 16px" }}>
                  <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#1D4ED8", display: "block", marginBottom: 6, letterSpacing: 0.8 }}>WHY:</span>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, color: "#1E40AF", lineHeight: 1.7, margin: 0 }}>
                    {step.why}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* progress dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
            {problem.steps.map((_, i) => (
              <motion.div key={i}
                animate={{ width: i === stepIdx ? 22 : 8, background: i <= stepIdx ? "#F59E0B" : "#E2E8F0" }}
                style={{ height: 8, borderRadius: 4 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          {/* nav buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={goBack} disabled={stepIdx === 0}
              style={{
                padding: "11px 24px", borderRadius: 12, border: "1.5px solid #E2E8F0",
                background: stepIdx === 0 ? "#F8FAFC" : "#FFFFFF",
                color: stepIdx === 0 ? "#CBD5E1" : "#334155",
                fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
                cursor: stepIdx === 0 ? "default" : "pointer",
              }}>
              ← Back
            </button>
            <button onClick={restart}
              style={{
                padding: "11px 24px", borderRadius: 12, border: "1.5px solid #E2E8F0",
                background: "#FFFFFF", color: "#64748B",
                fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}>
              Restart
            </button>
            <motion.button onClick={goNext}
              whileHover={{ scale: 1.04, boxShadow: "0 6px 20px rgba(217,119,6,0.35)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "11px 30px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
                boxShadow: "0 4px 14px rgba(217,119,6,0.28)",
              }}>
              {isLastStep ? (isLastProblem ? "Finish 🏆" : "Next Problem →") : "Next Step →"}
            </motion.button>
          </div>
        </div>

        {/* ── RIGHT: key facts — sticky as page scrolls ── */}
        <div style={{ width: 260, flexShrink: 0, borderLeft: "1.5px solid #E2E8F0", padding: 16, position: "sticky", top: 49, alignSelf: "flex-start", background: "#F1F5F9" }}>
          <KeyFacts facts={content.keyFacts} />
        </div>
      </div>
    </div>
  );
});

BlogView.displayName = "BlogView";
export default BlogView;
