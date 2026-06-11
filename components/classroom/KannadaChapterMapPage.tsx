"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { Chapter } from "@/types";

interface Props {
  onChapterSelect: (chapter: Chapter) => void;
  onBack:          () => void;
}

// ── Chapter tile positions — pentagon layout matching the background PNG ───────
const TILES = [
  { key:"ch1", num:1, locked:false, src:"/classroom/KANNADA/KANNADA 1.png",
    style:{ top:"calc(50% - 250px)", left:"calc(47% - 150px)" } },
  { key:"ch2", num:2, locked:true,  src:"/classroom/KANNADA/KANNADA 2.png",
    style:{ top:"calc(50% - 110px)", left:"calc(47% + 131px)" } },
  { key:"ch3", num:3, locked:true,  src:"/classroom/KANNADA/KANNADA 3.png",
    style:{ top:"calc(50% + 100px)", left:"calc(47% + 25px)" } },
  { key:"ch4", num:4, locked:true,  src:"/classroom/KANNADA/KANNADA 4.png",
    style:{ top:"calc(50% + 100px)", left:"calc(47% - 315px)" } },
  { key:"ch5", num:5, locked:true,  src:"/classroom/KANNADA/KANNADA 5.png",
    style:{ top:"calc(50% - 110px)", left:"calc(47% - 421px)" } },
] as const;

// ── Lock medallion ────────────────────────────────────────────────────────────
function LockMedallion() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
      style={{ backdropFilter:"blur(1.5px) saturate(85%)", background:"rgba(8,16,32,0.1)" }}>
      <div className="flex items-center justify-center rounded-full"
        style={{ width:42, height:42,
          background:"linear-gradient(180deg,#0B1A2F,#050E1F)",
          border:"1.5px solid rgba(125,211,252,0.65)",
          boxShadow:"0 0 18px rgba(0,212,255,0.5), inset 0 0 10px rgba(0,212,255,0.18)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#E8F4FF" strokeWidth="1.8"/>
          <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#E8F4FF" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function KannadaChapterMapPage({ onChapterSelect, onBack }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    fetch("/api/classroom/chapters").then(r => r.json()).then(data => {
      setChapters((data.chapters as Chapter[]).filter(
        c => c.subject === "Kannada" && c.chapter_number < 90
      ));
    });
  }, []);

  const handleClick = (num: number, locked: boolean) => {
    if (locked) return;
    const ch = chapters.find(c => c.chapter_number === num);
    if (ch) onChapterSelect(ch);
  };

  return (
    <div className="relative overflow-hidden"
      style={{ height:"100dvh", fontFamily:"var(--font-dm-sans,'DM Sans',sans-serif)" }}>

      {/* Full-page Kannada background — contains tiles, progress, leaderboard, teacher */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/classroom/KANNADA/background.png" alt="" aria-hidden draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex:0 }} />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="relative flex items-center px-6 py-3.5 gap-4 flex-shrink-0"
        style={{ zIndex:20, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,0.6)",
          boxShadow:"0 2px 20px rgba(15,28,77,0.07)" }}>

        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color:"rgba(15,28,77,0.6)" }}>
          <ChevronLeft className="w-4 h-4" />
          Back to Subjects
        </button>

        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📖</span>
            <span className="font-display font-black text-2xl tracking-tight" style={{ color:"#0f1c4d" }}>
              ಕನ್ನಡ
            </span>
          </div>
          <span className="text-xs font-medium mt-0.5" style={{ color:"rgba(15,28,77,0.45)" }}>
            CBSE Class 10
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background:"rgba(124,58,237,0.07)", border:"1px solid rgba(124,58,237,0.18)" }}>
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold" style={{ color:"#7C3AED" }}>Board: CBSE</span>
        </div>
      </header>

      {/* ── Interactive tile overlays — transparent zones over background tiles ── */}
      <div className="relative" style={{ height:"calc(100dvh - 57px)", zIndex:10 }}>
        {TILES.map((tile, i) => (
          <motion.div key={tile.key}
            className="absolute"
            style={{ ...tile.style, width:300, zIndex:4,
              cursor:tile.locked ? "not-allowed" : "pointer" }}
            initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.4, delay:0.2 + i*0.08 }}
            whileHover={!tile.locked ? { scale:1.03 } : {}}
            whileTap={!tile.locked ? { scale:0.97 } : {}}
            onClick={() => handleClick(tile.num, tile.locked)}
          >
            {/* Fixed height on every tile so all cards are identical size */}
            <div className="relative rounded-2xl overflow-hidden"
              style={{
                height: 138,
                boxShadow: tile.locked
                  ? "0 4px 16px rgba(15,28,77,0.12)"
                  : "0 6px 28px rgba(15,28,77,0.18), 0 0 0 2px rgba(124,58,237,0.3)",
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tile.src} alt={`Chapter ${tile.num}`}
                className="w-full h-full select-none block"
                style={{ objectFit:"cover", objectPosition:"top" }}
                draggable={false} />
              {!tile.locked && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity:0 }}
                  whileHover={{ opacity:1 }}
                  style={{ border:"2px solid rgba(124,58,237,0.65)",
                    background:"rgba(124,58,237,0.10)",
                    boxShadow:"0 0 24px rgba(124,58,237,0.35)" }}
                />
              )}
              {tile.locked && <LockMedallion />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
