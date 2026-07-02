"use client";

import { motion } from "framer-motion";

interface MCQQuestion { question: string; options: string[]; correct: number; explanation: string; }

interface Props {
  score: number;
  total: number;
  questions: MCQQuestion[];
  answers: number[];
  onPass: () => void;
  onRetry: () => void;
  onStudyAgain: () => void;
}

export default function ResultScreen({ score, total, questions, answers, onPass, onRetry, onStudyAgain }: Props) {
  const pct    = Math.round((score / total) * 100);
  const passed = pct >= 70;
  const emoji  = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "😅" : "💪";

  return (
    <div style={{ flex: 1, overflowY: "auto", background: passed ? "#ECFDF5" : "#FFF7ED", scrollbarWidth: "none" }}>
      <div style={{ maxWidth: 540, margin: "0 auto", padding: "32px 24px" }}>

        {/* Score hero */}
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ padding: "28px 24px", borderRadius: 24, background: "#FFFFFF", border: `2px solid ${passed ? "#A7F3D0" : "#FED7AA"}`, boxShadow: `0 8px 32px ${passed ? "rgba(16,185,129,0.15)" : "rgba(249,115,22,0.15)"}`, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>{emoji}</div>
          <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 52, color: passed ? "#059669" : "#EA580C", lineHeight: 1 }}>
            {pct}<span style={{ fontSize: 28 }}>%</span>
          </div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, color: "#64748B", marginTop: 6 }}>
            {score} out of {total} correct
          </div>
          <div style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, background: passed ? "#D1FAE5" : "#FFEDD5", display: "inline-block" }}>
            <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, color: passed ? "#065F46" : "#9A3412" }}>
              {passed ? "You passed! Great work 🙌" : "Keep going — you've got this!"}
            </span>
          </div>
        </motion.div>

        {/* Question breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {questions.map((q, idx) => {
            const correct = answers[idx] === q.correct;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                style={{ padding: "14px 16px", borderRadius: 16, background: "#FFFFFF", border: `1.5px solid ${correct ? "#A7F3D0" : "#FECDD3"}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: correct ? "#10B981" : "#EF4444", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13 }}>
                  {correct ? "✓" : "✗"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 13, color: "#334155", margin: "0 0 4px" }}>{q.question}</p>
                  <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#94A3B8", margin: 0 }}>
                    {correct ? "Correct" : `Your answer: ${q.options[answers[idx]]} • Correct: ${q.options[q.correct]}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {passed ? (
            <motion.button onClick={onPass} whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }} whileTap={{ scale: 0.98 }}
              style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 16, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
              Reflect & Lock it in ✨
            </motion.button>
          ) : (
            <>
              <motion.button onClick={onStudyAgain} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}>
                Study again 📖
              </motion.button>
              <motion.button onClick={onRetry} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                style={{ width: "100%", padding: "16px", borderRadius: 16, cursor: "pointer", background: "#FFFFFF", color: "#EF4444", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, border: "2px solid #FECDD3", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                Retry Challenge ⚡
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
