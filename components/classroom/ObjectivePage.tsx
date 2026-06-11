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

// ── Lock icon — clean minimal style for light backgrounds ────────────────────
function Lock({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size,
        background: "rgba(255,255,255,0.85)",
        border: "1.5px solid rgba(0,0,0,0.12)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="11" width="14" height="10" rx="2" fill="rgba(0,0,0,0.18)" stroke="rgba(0,0,0,0.35)" strokeWidth="1.6"/>
        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="rgba(0,0,0,0.35)" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// ── Hotspot zone — clickable card overlay ─────────────────────────────────────
function Hotspot({ onClick, color }: {
  onClick: () => void; color: string; label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="absolute inset-0 rounded-2xl flex items-end justify-start p-2"
      style={{ cursor: "pointer", background: "transparent" }}
      whileHover={{ background: `${color}18`, boxShadow: `inset 0 0 0 2px ${color}` }}
      transition={{ duration: 0.15 }}
    >
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="relative z-10 text-[10px] font-black px-2 py-1 rounded-lg"
        style={{ background: color, color: "#fff" }}
      >
        Start →
      </motion.span>
    </motion.button>
  );
}

// ── Locked card overlay ───────────────────────────────────────────────────────
function LockedCard() {
  return (
    <div className="absolute inset-0 flex items-center justify-center"
      style={{ backdropFilter: "blur(2px) saturate(80%)", background: "rgba(255,255,255,0.35)" }}>
      <Lock size={32} />
    </div>
  );
}

// ── Card zone helper — wraps a positioned card area ───────────────────────────
// All positions are % of the full-page image (1440×900 reference)
// Left MCQ column:  left 2.5%–27%, rows at 20% / 31.5% / 43% / 54.5% / 66%
// Right Board column: left 54%–79%, same row tops
// Each card height ~10%

const MCQ_CARDS = [
  { level: 1, locked: false, top: "24.1%", color: "#2563eb" },
  { level: 2, locked: true,  top: "37.1%", color: "#2563eb" },
  { level: 3, locked: true,  top: "50.1%", color: "#2563eb" },
  { level: 4, locked: true,  top: "62.9%", color: "#2563eb" },
  { level: 5, locked: true,  top: "75.7%", color: "#2563eb" },
] as const;

const BOARD_CARDS = [
  { level: 1, locked: false, top: "24.1%", color: "#7C3AED" },
  { level: 2, locked: true,  top: "37.1%", color: "#7C3AED" },
  { level: 3, locked: true,  top: "50.1%", color: "#7C3AED" },
  { level: 4, locked: true,  top: "62.9%", color: "#7C3AED" },
  { level: 5, locked: true,  top: "75.7%", color: "#7C3AED" },
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
          : chapter.subject === "Physics"
          ? "/classroom/objectives/objectives_physics.png"
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
      {/* Left MCQ column */}
      {MCQ_CARDS.map(card => (
        <div key={`mcq-${card.level}`}
          className="absolute rounded-2xl overflow-hidden"
          style={{ top: card.top, left: "4.1%", width: "22%", height: "11.4%", zIndex: 10 }}>
          {card.locked
            ? <LockedCard />
            : <Hotspot onClick={() => onSelectTest("mcq")} color={card.color} label="MCQ" />
          }
        </div>
      ))}

      {/* Right Board column */}
      {BOARD_CARDS.map(card => (
        <div key={`board-${card.level}`}
          className="absolute rounded-2xl overflow-hidden"
          style={{ top: card.top, left: "55.2%", width: "20.5%", height: "11.4%", zIndex: 10 }}>
          {card.locked
            ? <LockedCard />
            : <Hotspot onClick={() => onSelectTest("written")} color={card.color} label="Board" />
          }
        </div>
      ))}

      {/* "Enter Classroom" button — center circle */}
      <motion.button
        onClick={() => onEnterArena ? onEnterArena() : router.push("/dashboard/playground")}
        className="absolute rounded-2xl"
        style={{ top: "64%", left: "33%", width: "14%", height: "6%", zIndex: 10, cursor: "pointer" }}
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
