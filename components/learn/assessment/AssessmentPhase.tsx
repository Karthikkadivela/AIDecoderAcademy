"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";
import ResultScreen from "./ResultScreen";

interface MCQQuestion { question: string; options: string[]; correct: number; explanation: string; }

interface Props { section: LearnSection; subject: string; gradeLevel: string; onPass: () => void; onRetry: () => void; }

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function AssessmentPhase({ section, subject, gradeLevel, onPass, onRetry }: Props) {
  const [questions, setQuestions]     = useState<MCQQuestion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [qIdx, setQIdx]               = useState(0);
  const [selected, setSelected]       = useState<number | null>(null);
  const [confirmed, setConfirmed]     = useState(false);
  const [answers, setAnswers]         = useState<number[]>([]);
  const [showResult, setShowResult]   = useState(false);

  useEffect(() => { load(); }, [section.id]);

  function load() {
    setLoading(true); setError(""); setQuestions([]); setQIdx(0); setSelected(null); setConfirmed(false); setAnswers([]); setShowResult(false);
    fetch("/api/learn/assessment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionTitle: section.title, topic: section.topic, subject, gradeLevel }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.questions?.length) throw new Error(); setQuestions(d.questions); })
      .catch(() => setError("Couldn't load questions. Please try again."))
      .finally(() => setLoading(false));
  }

  function handleNext() {
    const newAnswers = [...answers, selected!];
    if (qIdx < questions.length - 1) { setAnswers(newAnswers); setQIdx((i) => i + 1); setSelected(null); setConfirmed(false); }
    else { setAnswers(newAnswers); setShowResult(true); }
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#FFF1F2" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #FECDD3", borderTopColor: "#EF4444" }} />
      <p style={{ fontFamily: "'Outfit',sans-serif", color: "#9F1239", fontSize: 15, fontWeight: 600 }}>Preparing your challenge...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#FFF1F2" }}>
      <p style={{ color: "#DC2626", fontFamily: "'Outfit',sans-serif" }}>{error}</p>
      <button onClick={load} style={{ padding: "8px 20px", borderRadius: 10, background: "#EF4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>Retry</button>
    </div>
  );

  if (showResult) {
    const score = answers.filter((a, i) => a === questions[i].correct).length;
    return <ResultScreen score={score} total={questions.length} questions={questions} answers={answers} onPass={onPass} onRetry={() => load()} onStudyAgain={onRetry} />;
  }

  const q = questions[qIdx];
  if (!q) return null;
  const isCorrect = confirmed && selected === q.correct;
  const isWrong   = confirmed && selected !== q.correct;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#FFF1F2", overflowY: "auto", scrollbarWidth: "none" }}>
      {/* Top progress strip */}
      <div style={{ background: "#FFFFFF", borderBottom: "1.5px solid #FFE4E6", padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#FFF1F2", border: "1.5px solid #FECDD3" }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "#9F1239" }}>Challenge Phase</span>
          </div>
          <span style={{ fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>
            Question {qIdx + 1} of {questions.length}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "#FFE4E6", overflow: "hidden" }}>
          <motion.div
            style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #EF4444, #F43F5E)" }}
            animate={{ width: `${((qIdx + (confirmed ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        <AnimatePresence mode="wait">
          <motion.div key={qIdx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Question card */}
            <div style={{ padding: "22px 22px", borderRadius: 18, background: "#FFFFFF", border: "2px solid #FECDD3", boxShadow: "0 4px 16px rgba(220,38,38,0.08)" }}>
              <p style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 18, color: "#1E293B", lineHeight: 1.45, margin: 0 }}>
                {q.question}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, idx) => {
                const isSelected   = selected === idx;
                const isCorrectOpt = confirmed && idx === q.correct;
                const isWrongOpt   = confirmed && isSelected && idx !== q.correct;
                return (
                  <motion.button key={idx}
                    onClick={() => { if (!confirmed) setSelected(idx); }}
                    whileHover={!confirmed ? { x: 5 } : {}}
                    whileTap={!confirmed ? { scale: 0.98 } : {}}
                    style={{
                      padding: "14px 18px", borderRadius: 14, textAlign: "left",
                      cursor: confirmed ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 14,
                      background: isCorrectOpt ? "#ECFDF5" : isWrongOpt ? "#FFF1F2" : isSelected ? "#FFF1F2" : "#FFFFFF",
                      border: `2px solid ${isCorrectOpt ? "#6EE7B7" : isWrongOpt ? "#FCA5A5" : isSelected ? "#FCA5A5" : "#E2E8F0"}`,
                      boxShadow: isCorrectOpt ? "0 0 0 3px #D1FAE5" : isWrongOpt ? "0 0 0 3px #FFE4E6" : "0 1px 4px rgba(0,0,0,0.04)",
                      transition: "all 0.18s ease",
                    } as React.CSSProperties}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0,
                      fontFamily: "'Nunito',sans-serif",
                      background: isCorrectOpt ? "#10B981" : isWrongOpt ? "#EF4444" : isSelected ? "#EF4444" : "#F1F5F9",
                      color: isCorrectOpt || isWrongOpt || isSelected ? "#fff" : "#94A3B8",
                    }}>
                      {isCorrectOpt ? "✓" : isWrongOpt ? "✗" : OPTION_LABELS[idx]}
                    </span>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 15, color: isCorrectOpt ? "#065F46" : isWrongOpt ? "#991B1B" : "#334155" }}>
                      {opt}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            {confirmed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: "14px 16px", borderRadius: 14, background: isCorrect ? "#ECFDF5" : "#FFF7ED", border: `2px solid ${isCorrect ? "#A7F3D0" : "#FED7AA"}` }}>
                <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: isCorrect ? "#065F46" : "#9A3412", marginBottom: 4 }}>
                  {isCorrect ? "✓ Correct! Great thinking!" : "Not quite — here's why:"}
                </div>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: isCorrect ? "#047857" : "#92400E", margin: 0, lineHeight: 1.55 }}>
                  {q.explanation}
                </p>
              </motion.div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto" }}>
              {!confirmed ? (
                <motion.button onClick={() => { if (selected !== null) setConfirmed(true); }}
                  disabled={selected === null}
                  whileHover={selected !== null ? { scale: 1.04 } : {}}
                  whileTap={selected !== null ? { scale: 0.97 } : {}}
                  style={{
                    padding: "13px 28px", borderRadius: 14, border: "none",
                    cursor: selected !== null ? "pointer" : "not-allowed",
                    background: selected !== null ? "linear-gradient(135deg, #EF4444, #DC2626)" : "#F1F5F9",
                    color: selected !== null ? "#fff" : "#94A3B8",
                    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15,
                    boxShadow: selected !== null ? "0 4px 14px rgba(220,38,38,0.35)" : "none",
                    transition: "all 0.18s ease",
                  }}>
                  Confirm Answer
                </motion.button>
              ) : (
                <motion.button onClick={handleNext} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "13px 28px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #EF4444, #DC2626)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 14px rgba(220,38,38,0.35)" }}>
                  {qIdx < questions.length - 1 ? "Next →" : "See Results →"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
