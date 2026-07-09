"use client";

import { useState, useEffect, useMemo, type ReactElement } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import type { Chapter } from "@/types";

interface Props {
  onChapterSelect: (chapter: Chapter) => void;
  onBack:          () => void;
}

type LeaderboardEntry = {
  display_name: string; avatar_emoji: string; xp: number;
  level: number; active_arena: number; rank: number; is_current_user: boolean;
};

const ARENA_ACCENTS: Record<number,string> = {
  1:"#7C3AED",2:"#00D4FF",3:"#FF6B2B",4:"#00FF94",5:"#FF2D78",6:"#C8FF00",
};
const PODIUM_META = [
  { rank:2, ring:"#C0C0C0", glow:"rgba(192,192,192,0.35)", platform:28, avatar:30, label:"🥈" },
  { rank:1, ring:"#FFD700", glow:"rgba(255,215,0,0.40)",   platform:42, avatar:38, label:"👑" },
  { rank:3, ring:"#CD7F32", glow:"rgba(205,127,50,0.35)",  platform:18, avatar:26, label:"🥉" },
];

// ── Chapter library — full CBSE Class 10 syllabus order.
//    Only Trigonometry is wired to real chapter data + unlocked; the rest are
//    decorative/locked until their content is built out. ────────────────────
type ChapterDef = {
  badge: string;
  title: string;
  cornerTag: string;
  accentClass: string;
  apiChapterNumber: number | null; // maps to Chapter.chapter_number from /api/classroom/chapters
  icon: ReactElement;
};

const CHAPTERS: ChapterDef[] = [
  {
    badge: "CH 01", title: "Real Numbers", cornerTag: "ℝ", accentClass: "c01", apiChapterNumber: 2,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <line x1="10" y1="52" x2="80" y2="52" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round"/>
        <polygon points="82,52 74,48 74,56" fill="#6366f1"/>
        <line x1="25" y1="46" x2="25" y2="58" stroke="#6366f1" strokeWidth="1.5"/>
        <line x1="45" y1="46" x2="45" y2="58" stroke="#6366f1" strokeWidth="1.5"/>
        <line x1="65" y1="46" x2="65" y2="58" stroke="#6366f1" strokeWidth="1.5"/>
        <circle cx="55" cy="52" r="4.5" fill="#818cf8"/>
        <text x="40" y="36" fontSize="13" fill="#6366f1" fontFamily="Georgia,serif" fontStyle="italic">√2</text>
      </svg>
    ),
  },
  {
    badge: "CH 02", title: "Polynomials", cornerTag: "f(x)", accentClass: "c02", apiChapterNumber: 3,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <line x1="22" y1="8" x2="22" y2="80" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="22,5 18,14 26,14" fill="#d97706"/>
        <line x1="10" y1="68" x2="82" y2="68" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="84,68 76,64 76,72" fill="#d97706"/>
        <path d="M18,60 C28,60 30,40 42,48 C54,56 60,20 78,10" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    badge: "CH 03", title: "Pair of Linear Equations", cornerTag: "2x=y", accentClass: "c03", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <line x1="45" y1="8" x2="45" y2="82" stroke="#db2777" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="45,6 41,14 49,14" fill="#db2777"/>
        <line x1="8" y1="58" x2="82" y2="58" stroke="#db2777" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="84,58 76,54 76,62" fill="#db2777"/>
        <line x1="14" y1="78" x2="72" y2="20" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="14" y1="26" x2="76" y2="72" stroke="#db2777" strokeWidth="2.2" strokeLinecap="round"/>
        <circle cx="45" cy="50" r="4.5" fill="#f472b6"/>
      </svg>
    ),
  },
  {
    badge: "CH 04", title: "Quadratic Equations", cornerTag: "ax²", accentClass: "c04", apiChapterNumber: 4,
    icon: (
      <svg width="72" height="64" viewBox="0 0 100 90" fill="none">
        <text x="6" y="16" fontSize="10" fill="#059669" fontFamily="Georgia,serif" fontStyle="italic">ax²+bx+c=0</text>
        <line x1="50" y1="20" x2="50" y2="80" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="50,18 46,26 54,26" fill="#059669"/>
        <line x1="10" y1="68" x2="90" y2="68" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18,32 Q50,80 82,32" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    badge: "CH 05", title: "Arithmetic Progressions", cornerTag: "Σn", accentClass: "c05", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 88" fill="none">
        <line x1="10" y1="72" x2="82" y2="72" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
        <rect x="13" y="57" width="12" height="15" rx="2" fill="#f87171"/>
        <rect x="29" y="47" width="12" height="25" rx="2" fill="#dc2626"/>
        <rect x="45" y="37" width="12" height="35" rx="2" fill="#b91c1c"/>
        <rect x="61" y="27" width="12" height="45" rx="2" fill="#991b1b"/>
        <text x="8" y="20" fontSize="8" fill="#dc2626" fontFamily="Inter,sans-serif" fontWeight="600">a, a+d, a+2d…</text>
      </svg>
    ),
  },
  {
    badge: "CH 06", title: "Triangles", cornerTag: "△", accentClass: "c06", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 88" fill="none">
        <polygon points="45,8 8,76 82,76" stroke="#2563eb" strokeWidth="2.5" fill="rgba(96,165,250,0.1)" strokeLinejoin="round"/>
        <polygon points="45,34 30,60 60,60" stroke="#60a5fa" strokeWidth="2" fill="rgba(96,165,250,0.18)" strokeLinejoin="round"/>
        <line x1="30" y1="60" x2="8" y2="76" stroke="#2563eb" strokeWidth="1.3" strokeDasharray="3 2"/>
        <line x1="60" y1="60" x2="82" y2="76" stroke="#2563eb" strokeWidth="1.3" strokeDasharray="3 2"/>
      </svg>
    ),
  },
  {
    badge: "CH 07", title: "Coordinate Geometry", cornerTag: "(x,y)", accentClass: "c07", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 88" fill="none">
        <line x1="14" y1="74" x2="80" y2="74" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="82,74 74,70 74,78" fill="#7c3aed"/>
        <line x1="14" y1="10" x2="14" y2="74" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="14,8 10,16 18,16" fill="#7c3aed"/>
        <circle cx="28" cy="60" r="4" fill="#a78bfa"/>
        <circle cx="48" cy="44" r="4" fill="#a78bfa"/>
        <circle cx="68" cy="28" r="4" fill="#a78bfa"/>
        <line x1="28" y1="60" x2="48" y2="44" stroke="#a78bfa" strokeWidth="1.8" strokeDasharray="3 2"/>
        <line x1="48" y1="44" x2="68" y2="28" stroke="#a78bfa" strokeWidth="1.8" strokeDasharray="3 2"/>
      </svg>
    ),
  },
  {
    badge: "CH 08", title: "Introduction to Trigonometry", cornerTag: "sinθ", accentClass: "c08", apiChapterNumber: 1,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 86" fill="none">
        <polygon points="12,10 12,68 78,68" stroke="#c2410c" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
        <polyline points="12,56 24,56 24,68" stroke="#c2410c" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <text x="26" y="54" fontSize="17" fill="#c2410c" fontFamily="Georgia,serif" fontStyle="italic">θ</text>
        <path d="M4,80 C10,80 13,66 20,66 C27,66 30,86 37,86" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    badge: "CH 09", title: "Applications of Trigonometry", cornerTag: "cosθ", accentClass: "c09", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <line x1="10" y1="75" x2="80" y2="75" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"/>
        <line x1="45" y1="75" x2="45" y2="15" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="40" y="10" width="10" height="8" rx="1" fill="#2dd4bf" opacity="0.9"/>
        <line x1="10" y1="75" x2="45" y2="15" stroke="#0d9488" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round"/>
        <text x="19" y="72" fontSize="12" fill="#0d9488" fontFamily="Georgia,serif" fontStyle="italic">θ</text>
      </svg>
    ),
  },
  {
    badge: "CH 10", title: "Circles", cornerTag: "○ r", accentClass: "c10", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="50" r="28" stroke="#a21caf" strokeWidth="2.2" fill="rgba(162,28,175,0.06)"/>
        <circle cx="45" cy="50" r="3.5" fill="#a21caf"/>
        <line x1="45" y1="50" x2="73" y2="50" stroke="#a21caf" strokeWidth="2" strokeLinecap="round"/>
        <text x="54" y="46" fontSize="12" fill="#a21caf" fontFamily="Georgia,serif" fontStyle="italic">r</text>
        <line x1="73" y1="22" x2="73" y2="78" stroke="#e879f9" strokeWidth="2.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    badge: "CH 11", title: "Areas Related to Circles", cornerTag: "πr²", accentClass: "c11", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="50" r="28" stroke="#b45309" strokeWidth="2.2" fill="rgba(180,83,9,0.05)"/>
        <path d="M45,50 L73,50 A28,28 0 0,0 45,22 Z" fill="#facc15" opacity="0.55"/>
        <path d="M45,50 L73,50 A28,28 0 0,0 45,22 Z" stroke="#b45309" strokeWidth="1.5" fill="none"/>
        <circle cx="45" cy="50" r="3.5" fill="#b45309"/>
        <text x="56" y="40" fontSize="11" fill="#b45309" fontFamily="Georgia,serif" fontStyle="italic">θ</text>
      </svg>
    ),
  },
  {
    badge: "CH 12", title: "Surface Areas & Volumes", cornerTag: "3D", accentClass: "c12", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <rect x="8" y="40" width="30" height="26" rx="1" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.8"/>
        <polygon points="8,40 18,28 48,28 38,40" fill="#86efac" stroke="#16a34a" strokeWidth="1.5"/>
        <polygon points="38,40 48,28 48,54 38,66" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="68" cy="36" rx="12" ry="4.5" fill="#86efac" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="56" y="36" width="24" height="24" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="68" cy="60" rx="12" ry="4.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    badge: "CH 13", title: "Statistics", cornerTag: "μ σ", accentClass: "c13", apiChapterNumber: 5,
    icon: (
      <svg width="72" height="64" viewBox="0 0 100 88" fill="none">
        <line x1="8" y1="68" x2="52" y2="68" stroke="#be123c" strokeWidth="1.5"/>
        <rect x="12" y="48" width="8" height="20" rx="2" fill="#fb7185" opacity="0.9"/>
        <rect x="24" y="38" width="8" height="30" rx="2" fill="#be123c"/>
        <rect x="36" y="28" width="8" height="40" rx="2" fill="#9f1239"/>
        <line x1="10" y1="26" x2="10" y2="68" stroke="#be123c" strokeWidth="1.5" strokeLinecap="round"/>
        <polygon points="10,24 7,32 13,32" fill="#be123c"/>
        <path d="M74,54 L74,34 A20,20 0 1,1 54,54 Z" fill="#fb7185" opacity="0.85"/>
        <circle cx="74" cy="54" r="20" stroke="#be123c" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
  {
    badge: "CH 14", title: "Probability", cornerTag: "P(x)", accentClass: "c14", apiChapterNumber: null,
    icon: (
      <svg width="72" height="64" viewBox="0 0 90 90" fill="none">
        <rect x="14" y="18" width="40" height="40" rx="7" fill="#c7d2fe" stroke="#4338ca" strokeWidth="2"/>
        <circle cx="24" cy="28" r="3.5" fill="#4338ca"/>
        <circle cx="34" cy="38" r="3.5" fill="#4338ca"/>
        <circle cx="45" cy="48" r="3.5" fill="#4338ca"/>
        <circle cx="24" cy="48" r="3.5" fill="#4338ca"/>
        <circle cx="45" cy="28" r="3.5" fill="#4338ca"/>
        <text x="59" y="36" fontSize="14" fill="#4338ca" fontFamily="Georgia,serif" fontWeight="bold">P</text>
        <line x1="57" y1="41" x2="74" y2="41" stroke="#4338ca" strokeWidth="1.5"/>
        <text x="60" y="53" fontSize="11" fill="#4338ca" fontFamily="Georgia,serif">1/6</text>
      </svg>
    ),
  },
];

function LockMedallion() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10"
      style={{ backdropFilter:"blur(1.5px) saturate(85%)", background:"rgba(8,16,32,0.1)" }}>
      <div className="flex items-center justify-center rounded-full"
        style={{ width:38, height:38,
          background:"linear-gradient(180deg,#0B1A2F,#050E1F)",
          border:"1.5px solid rgba(125,211,252,0.65)",
          boxShadow:"0 0 18px rgba(0,212,255,0.5), inset 0 0 10px rgba(0,212,255,0.18)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#E8F4FF" strokeWidth="1.8"/>
          <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#E8F4FF" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

function PodiumSpot({ entry, meta }: { entry:LeaderboardEntry; meta:typeof PODIUM_META[0] }) {
  const isMe = entry.is_current_user;
  const accent = ARENA_ACCENTS[entry.active_arena] ?? "#7C3AED";
  return (
    <motion.div className="flex flex-col items-center flex-1"
      initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
      transition={{ duration:0.4, delay:meta.rank===1?0:0.15 }}>
      <div style={{ fontSize:meta.rank===1?14:12, marginBottom:3 }}>{meta.label}</div>
      <div className="rounded-full flex items-center justify-center"
        style={{ width:meta.avatar, height:meta.avatar,
          background:isMe?"rgba(124,58,237,0.12)":"rgba(255,255,255,0.88)",
          border:`2.5px solid ${meta.ring}`, boxShadow:`0 0 10px ${meta.glow}`,
          fontSize:meta.avatar*0.52 }}>
        {entry.avatar_emoji||"🧑‍💻"}
      </div>
      <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background:accent }} />
      <div className="font-black text-center truncate mt-0.5"
        style={{ fontSize:10, color:isMe?"#7C3AED":"#1a1a2e", maxWidth:64 }}>
        {isMe?"You":entry.display_name.split(" ")[0]}
      </div>
      <div className="font-black" style={{ fontSize:10, color:"#7C3AED", marginTop:1 }}>
        {entry.xp.toLocaleString()}
      </div>
      <div className="w-full rounded-t-lg flex items-end justify-center pb-1 mt-1"
        style={{ height:meta.platform,
          background:`linear-gradient(180deg,${meta.ring}28,${meta.ring}0c)`,
          borderTop:`1.5px solid ${meta.ring}55`,
          borderLeft:`1px solid ${meta.ring}33`, borderRight:`1px solid ${meta.ring}33`,
          fontSize:11, color:meta.ring, fontWeight:900 }}>
        {meta.rank}
      </div>
    </motion.div>
  );
}

function LeaderboardRow({ entry, index }: { entry:LeaderboardEntry; index:number }) {
  const isMe = entry.is_current_user;
  const accent = ARENA_ACCENTS[entry.active_arena] ?? "#7C3AED";
  return (
    <motion.div className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
      initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }}
      transition={{ duration:0.3, delay:index*0.04 }}
      style={{ background:isMe?"rgba(124,58,237,0.08)":"rgba(0,0,0,0.02)",
        border:isMe?"1px solid rgba(124,58,237,0.15)":"1px solid transparent" }}>
      <span className="w-5 font-black text-center flex-shrink-0" style={{ fontSize:10, color:"#bbb" }}>{entry.rank}</span>
      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background:accent }} />
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background:isMe?"rgba(124,58,237,0.1)":"rgba(0,0,0,0.05)", fontSize:13 }}>
        {entry.avatar_emoji||"🧑‍💻"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" style={{ fontSize:11, color:isMe?"#7C3AED":"#1a1a2e", lineHeight:1 }}>
          {isMe?"You":entry.display_name.split(" ")[0]}
        </div>
        <div style={{ fontSize:9, color:"#bbb", lineHeight:1, marginTop:2 }}>Lv {entry.level}</div>
      </div>
      <div className="font-black flex-shrink-0" style={{ fontSize:11, color:isMe?"#7C3AED":"#333" }}>
        {entry.xp.toLocaleString()}
      </div>
    </motion.div>
  );
}

export function MathChapterMapPage({ onChapterSelect, onBack }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lbData,   setLbData]   = useState<{top10:LeaderboardEntry[]}|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/classroom/chapters").then(r=>r.json()),
      fetch("/api/leaderboard").then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([chapData, lb]) => {
      const mathChaps = (chapData.chapters as Chapter[]).filter(
        (c: Chapter) => c.subject === "Mathematics" && c.chapter_number < 90
      );
      setChapters(mathChaps);
      setLbData(lb);
      setLoading(false);
    });
  }, []);

  const handleClick = (def: ChapterDef, locked: boolean) => {
    if (locked || def.apiChapterNumber == null) return;
    const ch = chapters.find(c => c.chapter_number === def.apiChapterNumber);
    if (ch) onChapterSelect(ch);
  };

  const mathChapters = chapters.filter(c => c.chapter_number <= 5);
  const progressPct  = mathChapters.length / 5;

  const lbEntries = lbData?.top10 ?? [];
  const podium    = lbEntries.slice(0, 3);
  const ranked    = lbEntries.slice(3);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return CHAPTERS;
    return CHAPTERS.filter(c =>
      c.title.toLowerCase().includes(term) || c.badge.toLowerCase().includes(term)
    );
  }, [search]);

  return (
    <div className="relative overflow-hidden"
      style={{ height:"100dvh", fontFamily:"var(--font-dm-sans,'DM Sans',sans-serif)" }}>

      {/* Background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/classroom/mathematics/math bg.png" alt="" aria-hidden draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex:0 }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"linear-gradient(175deg, rgba(250,250,255,0.62) 0%, rgba(247,248,254,0.56) 30%, rgba(243,245,252,0.48) 58%, rgba(239,242,251,0.42) 78%, rgba(235,239,250,0.35) 100%)", zIndex:1 }} />

      <div className="relative grid" style={{ height:"100dvh", gridTemplateColumns:"1fr 320px", zIndex:10 }}>

        {/* ══ MAIN (scrollable) ══ */}
        <div className="mc-main overflow-y-auto overflow-x-hidden flex flex-col" style={{ padding:"22px 24px 28px 28px" }}>

          {/* ── Header ── */}
          <header className="flex items-end justify-between flex-shrink-0" style={{ marginBottom:20 }}>
            <div className="flex items-end gap-4">
              <button onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70 flex-shrink-0"
                style={{ color:"rgba(15,28,77,0.6)", marginBottom:4 }}>
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <div style={{ fontSize:"0.68rem", fontWeight:800, letterSpacing:"2.2px", textTransform:"uppercase",
                  color:"#3d4480", marginBottom:6, textShadow:"0 1px 4px rgba(255,255,255,0.75)" }}>
                  CBSE · Class X
                </div>
                <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1.85rem", fontWeight:800,
                  color:"#080c22", letterSpacing:"-0.6px", lineHeight:1,
                  textShadow:"0 1px 8px rgba(255,255,255,0.7), 0 2px 20px rgba(255,255,255,0.4)" }}>
                  Mathematics
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ paddingBottom:4 }}>
              <div className="flex items-center gap-2"
                style={{ background:"rgba(255,255,255,0.92)", border:"1.5px solid rgba(150,160,220,0.85)",
                  borderRadius:14, padding:"11px 18px", boxShadow:"0 2px 8px rgba(100,110,160,0.14)" }}>
                <Search className="w-4 h-4" style={{ color:"#4b5563", opacity:0.65 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Search chapters…"
                  style={{ background:"none", border:"none", outline:"none", fontSize:"0.74rem",
                    color:"#4b5563", fontWeight:500, width:160 }}
                />
              </div>
            </div>
          </header>

          {/* ── Chapter section ── */}
          <section>
            <div className="flex items-baseline gap-2" style={{ marginBottom:13 }}>
              <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1rem", fontWeight:800,
                color:"#080c22", letterSpacing:"-0.1px", textShadow:"0 1px 5px rgba(255,255,255,0.65)" }}>
                Chapter Library
              </span>
              <span style={{ fontSize:"0.65rem", fontWeight:600, color:"#4a5280",
                textShadow:"0 1px 4px rgba(255,255,255,0.6)" }}>
                {filtered.length} chapter{filtered.length===1?"":"s"} · tap to practice
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center" style={{ padding:"60px 20px", color:"#9ca3af" }}>
                <div style={{ fontSize:"3rem", marginBottom:12 }}>🔍</div>
                <div style={{ fontSize:"0.95rem", fontWeight:600, color:"#6b7280" }}>No chapters found</div>
                <div style={{ fontSize:"0.75rem", color:"#a8b0c8", marginTop:6 }}>Try a different search term</div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3.5">
                {filtered.map((def) => {
                  const locked = def.apiChapterNumber !== 1; // only Trigonometry unlocked
                  return (
                    <div key={def.title}
                      onClick={() => handleClick(def, locked)}
                      className={`mc-card ${def.accentClass}`}
                      style={{ cursor: locked ? "not-allowed" : "pointer" }}>
                      <div className="mc-illus">
                        <div className="mc-illus-glow" />
                        <div className="mc-illus-inner">{def.icon}</div>
                        <div className="mc-corner-tag">{def.cornerTag}</div>
                      </div>
                      <div className="mc-body">
                        <div>
                          <div className="mc-num-badge">{def.badge}</div>
                          <div className="mc-title">{def.title}</div>
                        </div>
                        <div style={{ marginTop:10 }}>
                          <div className="flex items-center justify-between" style={{ marginBottom:5 }}>
                            <span className="mc-pct">0%</span>
                            <span className="mc-acc">Accuracy 0%</span>
                          </div>
                          <div className="mc-bar-wrap"><div className="mc-bar" style={{ width:"0%" }} /></div>
                        </div>
                      </div>
                      {locked && <LockMedallion />}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Integrated Exam Practice ── */}
          <div style={{ marginTop:22 }}>
            <div className="flex items-baseline gap-2" style={{ marginBottom:13 }}>
              <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1rem", fontWeight:800,
                color:"#080c22", textShadow:"0 1px 5px rgba(255,255,255,0.65)" }}>
                Next Level
              </span>
              <span style={{ fontSize:"0.65rem", fontWeight:600, color:"#4a5280" }}>
                cross-chapter · exam-ready
              </span>
            </div>

            <div className="relative flex items-stretch overflow-hidden rounded-2xl"
              style={{ background:"linear-gradient(118deg,#1e1b4b 0%,#312e81 22%,#3730a3 46%,#4f46e5 72%,#6366f1 100%)",
                boxShadow:"0 10px 40px rgba(55,48,163,0.32), 0 3px 10px rgba(55,48,163,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
                opacity:0.88 }}>

              <div className="flex items-center gap-4 flex-shrink-0" style={{ padding:"20px 26px" }}>
                <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                  style={{ width:48, height:48, background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.22)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize:"0.42rem", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.52)", marginBottom:4 }}>
                    Featured Practice
                  </div>
                  <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.9rem", fontWeight:800, color:"#fff", whiteSpace:"nowrap" }}>
                    Integrated Exam Practice
                  </div>
                  <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.58)", marginTop:3, whiteSpace:"nowrap" }}>
                    All 14 chapters · Real exam simulation
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center min-w-0" style={{ padding:"18px 28px" }}>
                <div style={{ fontSize:"0.42rem", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"rgba(255,255,255,0.45)", marginBottom:8 }}>
                  Practice Modes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Chapter Questions","Case Based","MCQs","PYQs","Full Tests"].map(m => (
                    <span key={m} style={{ fontSize:"0.5rem", fontWeight:600, color:"rgba(255,255,255,0.88)",
                      background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)",
                      borderRadius:20, padding:"4px 11px", whiteSpace:"nowrap" }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center items-end gap-3 flex-shrink-0" style={{ padding:"18px 26px" }}>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1rem", fontWeight:800, color:"#fff" }}>14</div>
                    <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.48)", marginTop:2 }}>Chapters</div>
                  </div>
                  <div style={{ width:1, height:24, background:"rgba(255,255,255,0.16)" }} />
                  <div className="text-center">
                    <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1rem", fontWeight:800, color:"#fff" }}>5</div>
                    <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.48)", marginTop:2 }}>Modes</div>
                  </div>
                </div>
                <button disabled
                  className="flex items-center gap-1.5"
                  style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.54rem", fontWeight:700,
                    color:"#1e1b4b", background:"#ffffff", border:"none", borderRadius:20,
                    padding:"8px 16px", cursor:"not-allowed", whiteSpace:"nowrap" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#1e1b4b" strokeWidth="2"/>
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RAIL ══ */}
        <div className="mc-rail flex flex-col overflow-y-auto" style={{ padding:"18px 20px 14px 14px", gap:10, scrollbarWidth:"none" }}>

          {/* Subject Progress */}
          <div className="rounded-2xl" style={{ background:"rgba(255,255,255,0.94)", backdropFilter:"blur(8px)",
            padding:"15px 15px 13px", boxShadow:"0 1px 3px rgba(100,110,160,0.07), 0 4px 14px rgba(100,110,160,0.08)",
            border:"1px solid rgba(220,226,248,0.6)" }}>
            <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", fontWeight:700, color:"#1e2340", marginBottom:13 }}>
              Subject Progress
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="relative" style={{ width:86, height:86 }}>
                <svg width="86" height="86" viewBox="0 0 86 86" style={{ transform:"rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a5b4fc"/>
                      <stop offset="100%" stopColor="#4f46e5"/>
                    </linearGradient>
                  </defs>
                  <circle cx="43" cy="43" r="35" fill="none" stroke="#eef0f8" strokeWidth="6.5"/>
                  <circle cx="43" cy="43" r="35" fill="none" stroke="url(#rg)" strokeWidth="6.5" strokeLinecap="round"
                    strokeDasharray={`${2*Math.PI*35*progressPct} ${2*Math.PI*35}`}
                    style={{ transition:"stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1.45rem", fontWeight:900, color:"#4f46e5",
                    lineHeight:1, letterSpacing:"-0.6px", textShadow:"0 1px 6px rgba(79,70,229,0.25)" }}>
                    {Math.round(progressPct*100)}%
                  </span>
                  <span style={{ fontSize:"0.58rem", fontWeight:700, color:"#6b7280", marginTop:3,
                    textTransform:"uppercase", letterSpacing:"0.5px" }}>
                    overall
                  </span>
                </div>
              </div>
              <div className="w-full">
                {[
                  { label:"Completed",    value:`${mathChapters.length} / 5` },
                  { label:"Tests Attempted", value:"—" },
                  { label:"Avg. Accuracy",   value:"—" },
                ].map(({ label, value }, i) => (
                  <div key={label} className="flex items-center justify-between"
                    style={{ padding:"5px 0", borderBottom: i<2 ? "1px solid rgba(240,242,252,0.9)" : "none" }}>
                    <span style={{ fontSize:"0.62rem", fontWeight:700, color:"#4b5563", letterSpacing:"0.2px" }}>{label}</span>
                    <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.58rem", fontWeight:700, color:"#1e2340" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="flex-1 min-h-0 flex flex-col rounded-2xl" style={{ background:"rgba(255,255,255,0.94)",
            backdropFilter:"blur(8px)", padding:"15px 15px 13px",
            boxShadow:"0 1px 3px rgba(100,110,160,0.07), 0 4px 14px rgba(100,110,160,0.08)",
            border:"1px solid rgba(220,226,248,0.6)" }}>
            <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", fontWeight:700, color:"#1e2340", marginBottom:13 }}>
              Leaderboard
            </p>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color:"#2563eb" }} />
              </div>
            ) : lbEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p style={{ fontSize:11, color:"#bbb" }}>No data yet</p>
              </div>
            ) : (
              <>
                {podium.length === 3 && (
                  <div className="flex-shrink-0 flex items-end gap-1 pb-2"
                    style={{ borderBottom:"1px solid rgba(240,242,252,0.9)" }}>
                    {PODIUM_META.map(meta => {
                      const entry = podium.find(e=>e.rank===meta.rank);
                      return entry ? <PodiumSpot key={meta.rank} entry={entry} meta={meta} /> : null;
                    })}
                  </div>
                )}
                {ranked.length > 0 && (
                  <>
                    <div className="flex items-center gap-2" style={{ padding:"8px 0 6px" }}>
                      <div className="flex-1 h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                      <span style={{ fontSize:9, color:"#ccc", fontWeight:700, letterSpacing:"0.08em" }}>RANKING</span>
                      <div className="flex-1 h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                    </div>
                    <div className="mc-rail flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
                      <div className="flex flex-col gap-0.5">
                        {ranked.map((e,i) => <LeaderboardRow key={e.rank} entry={e} index={i} />)}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .mc-main {
          scrollbar-width: thin;
          scrollbar-color: rgba(160,168,210,0.3) transparent;
        }
        .mc-main::-webkit-scrollbar { width: 5px; }
        .mc-main::-webkit-scrollbar-track { background: transparent; }
        .mc-main::-webkit-scrollbar-thumb { background: rgba(160,168,210,0.3); border-radius: 99px; }
        .mc-rail {
          scrollbar-width: none;
        }
        .mc-rail::-webkit-scrollbar { display: none; }
        .mc-card {
          border-radius: 16px;
          background: rgba(255,255,255,0.90);
          backdrop-filter: blur(10px) saturate(1.3);
          border: 1.5px solid rgba(215,222,245,0.9);
          box-shadow:
            inset 0 1.5px 0 rgba(255,255,255,0.98),
            inset 0 -1px 0 rgba(100,110,165,0.04),
            0 2px 6px rgba(100,110,160,0.07),
            0 8px 28px rgba(100,110,160,0.12),
            0 1px 3px rgba(100,110,160,0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          transition: transform 0.24s cubic-bezier(0.16,1,0.3,1), box-shadow 0.24s ease, border-color 0.2s ease;
        }
        .mc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%; height: 2.5px;
          border-radius: 0 0 4px 4px;
          background: var(--accent-gradient);
          opacity: 0.35;
          transition: opacity 0.2s ease, left 0.24s ease, right 0.24s ease;
          z-index: 4;
        }
        .mc-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 52%;
          border-radius: 15px 15px 0 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0) 100%);
          pointer-events: none;
          z-index: 3;
        }
        .mc-card:not([style*="not-allowed"]):hover {
          transform: translateY(-5px);
          border-color: var(--accent-color);
          background: rgba(255,255,255,0.96);
        }
        .mc-card:not([style*="not-allowed"]):hover::before { opacity: 1; left: 8%; right: 8%; }
        .mc-illus {
          flex-shrink: 0;
          padding: 20px 14px 14px;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(ellipse 92% 82% at 50% 54%, var(--accent-bg) 0%, rgba(255,255,255,0) 72%);
          position: relative; z-index: 1;
        }
        .mc-illus-glow {
          position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          width: 58%; height: 20px; border-radius: 50%;
          background: var(--accent-color); filter: blur(16px); opacity: 0.17;
          pointer-events: none; transition: opacity 0.26s ease, width 0.26s ease;
        }
        .mc-card:hover .mc-illus-glow { opacity: 0.42; width: 76%; }
        .mc-illus-inner {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.32s cubic-bezier(0.16,1,0.3,1), filter 0.28s ease;
        }
        .mc-card:hover .mc-illus-inner { transform: scale(1.11) rotate(3deg); filter: drop-shadow(0 6px 14px var(--accent-glow-soft)); }
        .mc-corner-tag {
          position: absolute; top: 9px; right: 9px;
          font-family: 'Georgia', serif;
          font-size: 0.64rem; font-weight: 800; font-style: italic;
          color: var(--accent-color);
          background: rgba(255,255,255,0.95);
          border: 1.5px solid var(--accent-color);
          border-radius: 6px; padding: 4px 8px;
          line-height: 1; opacity: 0.95; z-index: 4;
        }
        .mc-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 6px 14px 15px; position: relative; z-index: 1; }
        .mc-num-badge {
          display: inline-flex; align-items: center;
          font-family: 'Poppins', sans-serif;
          font-size: 0.42rem; font-weight: 800;
          color: var(--accent-color);
          background: var(--accent-bg);
          border: 1px solid color-mix(in srgb, var(--accent-color) 22%, transparent);
          border-radius: 20px; padding: 2.5px 9px;
          letter-spacing: 0.7px; text-transform: uppercase;
          box-shadow: 0 0 9px var(--accent-glow-soft), inset 0 1px 0 rgba(255,255,255,0.75);
          margin-bottom: 5px; width: fit-content;
        }
        .mc-title { font-family: 'Poppins', sans-serif; font-size: 0.75rem; font-weight: 800; color: #1a1f36; line-height: 1.28; letter-spacing: -0.15px; }
        .mc-pct { font-family: 'Poppins', sans-serif; font-size: 0.6rem; font-weight: 700; color: var(--accent-color); line-height: 1; }
        .mc-acc { font-size: 0.58rem; font-weight: 700; color: #6b7280; line-height: 1; letter-spacing: 0.2px; }
        .mc-bar-wrap { height: 3px; border-radius: 999px; background: rgba(160,168,210,0.14); }
        .mc-bar { height: 100%; border-radius: 999px; background: var(--accent-gradient); box-shadow: 0 0 6px var(--accent-glow-soft); }

        .c01 { --accent-color:#6366f1; --accent-gradient:linear-gradient(135deg,#818cf8,#6366f1); --accent-glow-soft:rgba(99,102,241,0.16); --accent-bg:rgba(99,102,241,0.065); }
        .c02 { --accent-color:#d97706; --accent-gradient:linear-gradient(135deg,#fbbf24,#d97706); --accent-glow-soft:rgba(217,119,6,0.14); --accent-bg:rgba(217,119,6,0.065); }
        .c03 { --accent-color:#db2777; --accent-gradient:linear-gradient(135deg,#f472b6,#db2777); --accent-glow-soft:rgba(219,39,119,0.14); --accent-bg:rgba(219,39,119,0.065); }
        .c04 { --accent-color:#059669; --accent-gradient:linear-gradient(135deg,#34d399,#059669); --accent-glow-soft:rgba(5,150,105,0.14); --accent-bg:rgba(5,150,105,0.065); }
        .c05 { --accent-color:#dc2626; --accent-gradient:linear-gradient(135deg,#f87171,#dc2626); --accent-glow-soft:rgba(220,38,38,0.14); --accent-bg:rgba(220,38,38,0.065); }
        .c06 { --accent-color:#2563eb; --accent-gradient:linear-gradient(135deg,#60a5fa,#2563eb); --accent-glow-soft:rgba(37,99,235,0.14); --accent-bg:rgba(37,99,235,0.065); }
        .c07 { --accent-color:#7c3aed; --accent-gradient:linear-gradient(135deg,#a78bfa,#7c3aed); --accent-glow-soft:rgba(124,58,237,0.14); --accent-bg:rgba(124,58,237,0.065); }
        .c08 { --accent-color:#c2410c; --accent-gradient:linear-gradient(135deg,#fb923c,#c2410c); --accent-glow-soft:rgba(194,65,12,0.14); --accent-bg:rgba(194,65,12,0.065); }
        .c09 { --accent-color:#0d9488; --accent-gradient:linear-gradient(135deg,#2dd4bf,#0d9488); --accent-glow-soft:rgba(13,148,136,0.14); --accent-bg:rgba(13,148,136,0.065); }
        .c10 { --accent-color:#a21caf; --accent-gradient:linear-gradient(135deg,#e879f9,#a21caf); --accent-glow-soft:rgba(162,28,175,0.14); --accent-bg:rgba(162,28,175,0.065); }
        .c11 { --accent-color:#b45309; --accent-gradient:linear-gradient(135deg,#facc15,#b45309); --accent-glow-soft:rgba(180,83,9,0.14); --accent-bg:rgba(180,83,9,0.065); }
        .c12 { --accent-color:#16a34a; --accent-gradient:linear-gradient(135deg,#4ade80,#16a34a); --accent-glow-soft:rgba(22,163,74,0.14); --accent-bg:rgba(22,163,74,0.065); }
        .c13 { --accent-color:#be123c; --accent-gradient:linear-gradient(135deg,#fb7185,#be123c); --accent-glow-soft:rgba(190,18,60,0.14); --accent-bg:rgba(190,18,60,0.065); }
        .c14 { --accent-color:#4338ca; --accent-gradient:linear-gradient(135deg,#818cf8,#4338ca); --accent-glow-soft:rgba(67,56,202,0.14); --accent-bg:rgba(67,56,202,0.065); }
      `}</style>
    </div>
  );
}