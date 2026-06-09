"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/types";

interface Props {
  chapter:          Chapter;
  onSelectTest:     (type: "mcq" | "written") => void;
  onBack:           () => void;
  onEnterArena?:    () => void;
  onCorrectNotes?:  () => void;
}

// ── Lock medallion (same as arena / chapter map) ──────────────────────────────
function Lock({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size,
        background: "linear-gradient(180deg,#0B1A2F,#050E1F)",
        border: "1.5px solid rgba(125,211,252,0.6)",
        boxShadow: "0 0 14px rgba(0,212,255,0.45), inset 0 0 8px rgba(0,212,255,0.15)" }}>
      <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="#E8F4FF" strokeWidth="1.8"/>
        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#E8F4FF" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// ── Hotspot zone — clickable card overlay ─────────────────────────────────────
function Hotspot({ onClick, color, label }: {
  onClick: () => void; color: string; label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="absolute w-full h-full rounded-2xl flex items-end justify-start p-2"
      style={{ cursor: "pointer", background: "transparent" }}
      whileHover={{ background: `${color}18` }}
      transition={{ duration: 0.15 }}
    >
      {/* Hover glow ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{ border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40` }}
      />
      {/* "Start" badge visible on hover */}
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="relative z-10 text-[10px] font-black px-2 py-1 rounded-lg"
        style={{ background: color, color: "#fff", boxShadow: `0 0 12px ${color}60` }}
      >
        Start →
      </motion.span>
    </motion.button>
  );
}

// ── Locked card overlay ───────────────────────────────────────────────────────
function LockedCard() {
  return (
    <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
      style={{ backdropFilter: "blur(1px) saturate(85%)", background: "rgba(8,16,32,0.08)" }}>
      <Lock size={34} />
    </div>
  );
}

// ── Card zone positions — measured from pixel analysis of both PNG backgrounds
// Left MCQ column:  left 2%–26%  (x = 1.8%–25.4% in PNG)
// Right Board column: left 53%–76% (x = 53.2%–75.6% in PNG)
// Card top rows (badge top): L1=14%, L2=36%, L3=50%, L4=63%, L5=76%
// Card heights:              L1=21%,  L2=13%, L3=13%, L4=12%, L5=11%

const MCQ_CARDS = [
  { level: 1, locked: false, top: "14%", height: "21%", color: "#2563eb" },
  { level: 2, locked: true,  top: "36%", height: "13%", color: "#2563eb" },
  { level: 3, locked: true,  top: "50%", height: "13%", color: "#2563eb" },
  { level: 4, locked: true,  top: "63%", height: "12%", color: "#2563eb" },
  { level: 5, locked: true,  top: "76%", height: "11%", color: "#2563eb" },
] as const;

const BOARD_CARDS = [
  { level: 1, locked: false, top: "14%", height: "21%", color: "#7C3AED" },
  { level: 2, locked: true,  top: "36%", height: "13%", color: "#7C3AED" },
  { level: 3, locked: true,  top: "50%", height: "13%", color: "#7C3AED" },
  { level: 4, locked: true,  top: "63%", height: "12%", color: "#7C3AED" },
  { level: 5, locked: true,  top: "76%", height: "11%", color: "#7C3AED" },
] as const;

// ── Main component ────────────────────────────────────────────────────────────
export function ObjectivePage({ chapter, onSelectTest, onBack, onEnterArena, onCorrectNotes }: Props) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden select-none"
      style={{ height: "100dvh", fontFamily: "var(--font-dm-sans,'DM Sans',sans-serif)" }}>

      {/* Full-page objectives image stretched to fill */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={chapter.subject === "Mathematics"
          ? "/classroom/objectives/objectives_mathematics.png"
          : chapter.subject === "Kannada"
          ? "/classroom/objectives/objectives_kannada.png"
          : "/classroom/objectives/objectives_chemistry.png"}
        alt="Chapter Objectives"
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "fill", zIndex: 0 }}
      />

      {/* ── Back button ──────────────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="absolute flex items-center gap-1.5 text-sm font-semibold transition-all px-3 py-1.5 rounded-xl hover:opacity-80"
        style={{ top: 16, left: 16, zIndex: 20,
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)",
          color: "rgba(15,28,77,0.7)", border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 2px 12px rgba(15,28,77,0.08)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Chapters
      </button>

      {/* ── Interactive card zones ────────────────────────────────────────────── */}
      {/* Left MCQ column — x=2%–26% matching PNG card column (1.8%–25.4%) */}
      {MCQ_CARDS.map(card => (
        <div key={`mcq-${card.level}`}
          className="absolute"
          style={{ top: card.top, left: "2%", width: "24%", height: card.height, zIndex: 10 }}>
          {card.locked
            ? <LockedCard />
            : <Hotspot onClick={() => onSelectTest("mcq")} color={card.color} label="MCQ" />
          }
        </div>
      ))}

      {/* Right Board column — x=53%–76% matching PNG card column (53.2%–75.6%) */}
      {BOARD_CARDS.map(card => (
        <div key={`board-${card.level}`}
          className="absolute"
          style={{ top: card.top, left: "53%", width: "23%", height: card.height, zIndex: 10 }}>
          {card.locked
            ? <LockedCard />
            : <Hotspot onClick={() => onSelectTest("written")} color={card.color} label="Board" />
          }
        </div>
      ))}

      {/* "Enter Classroom" button — covers bottom action area of center circle */}
      <motion.button
        onClick={() => onEnterArena ? onEnterArena() : router.push("/dashboard/playground")}
        className="absolute rounded-2xl"
        style={{ top: "63%", left: "30%", width: "18%", height: "8%", zIndex: 10, cursor: "pointer" }}
        whileHover={{ background: "rgba(124,58,237,0.18)", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}
        transition={{ duration: 0.15 }}
      />

      {/* "Correct My Notes" button — below arena circle, centered between columns */}
      <motion.button
        onClick={() => onCorrectNotes?.()}
        className="absolute flex items-center justify-center gap-1.5 rounded-2xl text-[11px] font-black"
        style={{
          top: "73%", left: "29%", width: "20%", height: "5%", zIndex: 10,
          cursor: "pointer", color: "#fff",
          background: "linear-gradient(135deg, #06B6D4cc, #0891B2cc)",
          backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(6,182,212,0.6)",
          boxShadow: "0 0 16px rgba(6,182,212,0.35)",
          letterSpacing: "0.01em",
        }}
        whileHover={{ boxShadow: "0 0 28px rgba(6,182,212,0.6)", scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}>
        ✏️ Correct My Notes
      </motion.button>
    </div>
  );
}
