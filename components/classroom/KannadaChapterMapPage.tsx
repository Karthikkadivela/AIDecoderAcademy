"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";
import type { Chapter } from "@/types";

interface Props {
  onChapterSelect: (chapter: Chapter) => void;
  onBack: () => void;
}

type LeaderboardEntry = {
  display_name: string; avatar_emoji: string; xp: number;
  level: number; active_arena: number; rank: number; is_current_user: boolean;
};

const PURPLE      = "#5B21B6";
const PURPLE_MID  = "#7C3AED";
const NAVY        = "#0f1c4d";

const ARENA_ACCENTS: Record<number, string> = {
  1:"#7C3AED", 2:"#00D4FF", 3:"#FF6B2B", 4:"#00FF94", 5:"#FF2D78", 6:"#C8FF00",
};

const PODIUM_META = [
  { rank:2, ring:"#C0C0C0", glow:"rgba(192,192,192,0.35)", platform:28, avatar:30, label:"🥈" },
  { rank:1, ring:"#FFD700", glow:"rgba(255,215,0,0.40)",   platform:42, avatar:38, label:"👑" },
  { rank:3, ring:"#CD7F32", glow:"rgba(205,127,50,0.35)",  platform:18, avatar:26, label:"🥉" },
];

const CONNECTORS = [
  { id:"c1", x1:48.7, y1:50, x2:48.7, y2:17 },
  { id:"c2", x1:48.7, y1:50, x2:65,   y2:40 },
  { id:"c3", x1:48.7, y1:50, x2:59,   y2:74 },
  { id:"c4", x1:48.7, y1:50, x2:36,   y2:74 },
  { id:"c5", x1:48.7, y1:50, x2:32,   y2:40 },
];

const CHAPTERS_DATA = [
  {
    num: 1, key: "ch1",
    title: "ಕನ್ನಡ ಭಾಷೆಯ ಪರಿಚಯ", subtitle: "ಅ ಆ ಇ ಕ →",
    progress: 80, accuracy: 72, locked: false,
    book: { color:"#7C3AED", darkColor:"#4C1D95", pageColor:"#EDE9FE", letter:"ಅ",  bookmarkColor:"#F59E0B" },
    pos: { top:"calc(50% - 290px)", left:"calc(50% - 175px)" },
  },
  {
    num: 2, key: "ch2",
    title: "ವ್ಯಾಕರಣ", subtitle: "ಸಂಧಿ • ಸಮಾಸ • ನಾಮಪದ",
    progress: 65, accuracy: 68, locked: true,
    book: { color:"#3B82F6", darkColor:"#1D4ED8", pageColor:"#DBEAFE", letter:"ವ್ಯಾ", bookmarkColor:"#EF4444" },
    pos: { top:"calc(50% - 91px)", left:"calc(50% + 83px)" },
  },
  {
    num: 3, key: "ch3",
    title: "ಗದ್ಯ ಪಾಠಗಳು", subtitle: "ಪ್ರಬಂಧ • ಪ್ರಶ್ನೋತ್ತರ • ಭಾವ",
    progress: 70, accuracy: 75, locked: true,
    book: { color:"#059669", darkColor:"#065F46", pageColor:"#D1FAE5", letter:"ಗದ್ಯ", bookmarkColor:"#F59E0B" },
    pos: { top:"calc(50% + 108px)", left:"calc(50% + 12px)" },
  },
  {
    num: 4, key: "ch4",
    title: "ಪದ್ಯ ಪಾಠಗಳು", subtitle: "ಕವಿತೆ • ಛಂದಸ್ಸು • ಅಲಂಕಾರ",
    progress: 60, accuracy: 65, locked: true,
    book: { color:"#EA580C", darkColor:"#C2410C", pageColor:"#FED7AA", letter:"ಪದ್ಯ", bookmarkColor:"#7C3AED" },
    pos: { top:"calc(50% + 108px)", left:"calc(50% - 354px)" },
  },
  {
    num: 5, key: "ch5",
    title: "ಪೂರಕ ಓದು", subtitle: "ಹೆಚ್ಚುವರಿ • ಪ್ರಬಂಧ • ಮಾಹಿತಿ",
    progress: 50, accuracy: 55, locked: true,
    book: { color:"#0D9488", darkColor:"#0F766E", pageColor:"#CCFBF1", letter:"ಓದು", bookmarkColor:"#F59E0B" },
    pos: { top:"calc(50% - 91px)", left:"calc(50% - 440px)" },
  },
] as const;

/* ─── Book SVG illustration ─────────────────────────────────────────── */
function BookIllustration({
  color, darkColor, pageColor, letter, bookmarkColor = "#F59E0B",
}: { color:string; darkColor:string; pageColor:string; letter:string; bookmarkColor?:string }) {
  return (
    <svg width="82" height="96" viewBox="0 0 82 96" fill="none">
      <ellipse cx="41" cy="90" rx="24" ry="4" fill={`${darkColor}22`} />
      {/* shadow copy */}
      <rect x="26" y="10" width="38" height="74" rx="4" fill={darkColor} transform="rotate(4 26 10)" />
      {/* cover */}
      <rect x="18" y="8" width="38" height="74" rx="4" fill={color} />
      {/* spine */}
      <rect x="18" y="8" width="7" height="74" rx="4" fill={darkColor} />
      {/* page block */}
      <rect x="56" y="11" width="4" height="68" rx="2" fill={pageColor} />
      {/* cover lines */}
      <rect x="28" y="22" width="22" height="2.5" rx="1.2" fill="rgba(255,255,255,0.55)" />
      <rect x="28" y="29" width="16" height="2"   rx="1"   fill="rgba(255,255,255,0.35)" />
      <rect x="28" y="35" width="19" height="2"   rx="1"   fill="rgba(255,255,255,0.35)" />
      {/* Kannada label */}
      <text x="37" y="62" textAnchor="middle" fontFamily="serif" fontSize="20"
        fill="rgba(255,255,255,0.70)" fontWeight="bold">{letter}</text>
      {/* bookmark ribbon */}
      <rect x="48" y="5" width="5" height="18" rx="2.5" fill={bookmarkColor} />
      <polygon points="48,23 50.5,27 53,23" fill={bookmarkColor} />
    </svg>
  );
}

/* ─── Lock medallion ────────────────────────────────────────────────── */
function LockMedallion() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl"
      style={{ backdropFilter:"blur(1.5px) saturate(85%)", background:"rgba(8,16,32,0.10)" }}>
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

/* ─── Chapter tile card ─────────────────────────────────────────────── */
function ChapterTile({
  chapter, index, onClick,
}: {
  chapter: typeof CHAPTERS_DATA[number];
  index: number;
  onClick: () => void;
}) {
  const num = String(chapter.num).padStart(2, "0");
  return (
    <motion.div className="absolute"
      style={{ ...chapter.pos, width:310, height:140, zIndex:4,
        cursor: chapter.locked ? "not-allowed" : "pointer" }}
      initial={{ opacity:0, scale:0.88 }}
      animate={{ opacity:1, scale:1 }}
      transition={{ duration:0.4, delay:0.2 + index * 0.08 }}
      whileHover={!chapter.locked ? { scale:1.036, y:-3 } : {}}
      whileTap={!chapter.locked ? { scale:0.97 } : {}}
      onClick={!chapter.locked ? onClick : undefined}>

      <div className="relative flex overflow-hidden"
        style={{ width:310, height:140, borderRadius:16,
          background:"rgba(255,255,255,0.93)",
          backdropFilter:"blur(22px)",
          border:"1.5px solid rgba(255,255,255,0.92)",
          boxShadow: chapter.locked
            ? "0 4px 22px rgba(15,28,77,0.14)"
            : "0 6px 28px rgba(15,28,77,0.22), 0 0 0 2px rgba(91,33,182,0.20)" }}>

        {/* Left — badge + title + progress */}
        <div style={{ display:"flex", flexDirection:"column",
          padding:"14px 12px 13px", width:196, flexShrink:0 }}>

          {/* Badge + text row */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1 }}>
            <div style={{ width:46, height:46, background:PURPLE, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontWeight:900, fontSize:18, letterSpacing:-1,
              flexShrink:0, boxShadow:"0 4px 14px rgba(91,33,182,0.35)" }}>
              {num}
            </div>
            <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:0, paddingTop:2 }}>
              <div style={{ fontWeight:900, fontSize:13, color:NAVY,
                lineHeight:1.25, textTransform:"uppercase" }}>
                {chapter.title}
              </div>
              <div style={{ fontSize:"9.5px", fontWeight:600,
                color:"rgba(15,28,77,0.44)", marginTop:5, lineHeight:1.4 }}>
                {chapter.subtitle}
              </div>
            </div>
          </div>

          {/* Stats + bar */}
          <div style={{ marginTop:10, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(15,28,77,0.62)" }}>
                Progress {chapter.progress}%
              </span>
              <span style={{ color:"rgba(15,28,77,0.24)" }}>|</span>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(15,28,77,0.62)" }}>
                Acc. {chapter.accuracy}%
              </span>
            </div>
            <div style={{ height:5, borderRadius:3, background:"rgba(91,33,182,0.13)", overflow:"hidden" }}>
              <motion.div
                style={{ height:"100%", borderRadius:3, background:PURPLE }}
                initial={{ width:0 }}
                animate={{ width:`${chapter.progress}%` }}
                transition={{ duration:1, delay:0.4 + index*0.08, ease:[0.16,1,0.3,1] }}
              />
            </div>
          </div>
        </div>

        {/* Right — book illustration */}
        <div style={{ flex:1, position:"relative", display:"flex",
          alignItems:"center", justifyContent:"center", overflow:"hidden",
          background:"linear-gradient(135deg,rgba(237,233,254,0.55),rgba(221,214,254,0.28))" }}>
          {/* left edge fade */}
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:20,
            background:"linear-gradient(to right,rgba(255,255,255,0.92),transparent)",
            pointerEvents:"none", zIndex:1 }} />
          <BookIllustration {...chapter.book} />
        </div>

        {chapter.locked && <LockMedallion />}
      </div>
    </motion.div>
  );
}

/* ─── Progress ring ─────────────────────────────────────────────────── */
function ProgressRing({ pct, color }: { pct:number; color:string }) {
  const r = 38; const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width:96, height:96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="8"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black leading-none" style={{ fontSize:20, color }}>
          {Math.round(pct * 100)}%
        </span>
        <span className="text-[10px] font-medium mt-0.5" style={{ color:"rgba(15,28,77,0.5)" }}>
          Completed
        </span>
      </div>
    </div>
  );
}

/* ─── Podium spot ───────────────────────────────────────────────────── */
function PodiumSpot({ entry, meta }: { entry:LeaderboardEntry; meta:typeof PODIUM_META[0] }) {
  const isMe   = entry.is_current_user;
  const accent = ARENA_ACCENTS[entry.active_arena] ?? PURPLE_MID;
  return (
    <motion.div className="flex flex-col items-center flex-1"
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4, delay:meta.rank===1?0:0.15 }}>
      <div style={{ fontSize:meta.rank===1?14:12, marginBottom:3 }}>{meta.label}</div>
      <div className="rounded-full flex items-center justify-center"
        style={{ width:meta.avatar, height:meta.avatar,
          background: isMe?"rgba(91,33,182,0.12)":"rgba(255,255,255,0.88)",
          border:`2.5px solid ${meta.ring}`,
          boxShadow:`0 0 10px ${meta.glow}`,
          fontSize: meta.avatar * 0.52 }}>
        {entry.avatar_emoji || "🧑‍💻"}
      </div>
      <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background:accent }} />
      <div className="font-black text-center truncate mt-0.5"
        style={{ fontSize:10, color:isMe?PURPLE_MID:"#1a1a2e", maxWidth:64 }}>
        {isMe ? "You" : entry.display_name.split(" ")[0]}
      </div>
      <div className="font-black" style={{ fontSize:10, color:PURPLE_MID, marginTop:1 }}>
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

/* ─── Leaderboard row ───────────────────────────────────────────────── */
function LeaderboardRow({ entry, index }: { entry:LeaderboardEntry; index:number }) {
  const isMe   = entry.is_current_user;
  const accent = ARENA_ACCENTS[entry.active_arena] ?? PURPLE_MID;
  return (
    <motion.div className="flex items-center gap-2 px-2.5 py-2 rounded-xl mb-0.5"
      initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
      transition={{ duration:0.3, delay:index*0.04 }}
      style={{ background: isMe?"rgba(91,33,182,0.08)":"rgba(0,0,0,0.02)",
        border: isMe?"1px solid rgba(91,33,182,0.15)":"1px solid transparent" }}>
      <span className="w-5 font-black text-center flex-shrink-0"
        style={{ fontSize:10, color:"#bbb" }}>{entry.rank}</span>
      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background:accent }} />
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background:isMe?"rgba(91,33,182,0.1)":"rgba(0,0,0,0.05)", fontSize:13 }}>
        {entry.avatar_emoji || "🧑‍💻"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate" style={{ fontSize:11, color:isMe?PURPLE_MID:"#1a1a2e", lineHeight:1 }}>
          {isMe ? "You" : entry.display_name.split(" ")[0]}
        </div>
        <div style={{ fontSize:9, color:"#bbb", lineHeight:1, marginTop:2 }}>Lv {entry.level}</div>
      </div>
      <div className="font-black flex-shrink-0" style={{ fontSize:11, color:isMe?PURPLE_MID:"#333" }}>
        {entry.xp.toLocaleString()}
      </div>
    </motion.div>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */
export function KannadaChapterMapPage({ onChapterSelect, onBack }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lbData,   setLbData]   = useState<{ top10: LeaderboardEntry[] } | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/classroom/chapters").then(r => r.json()),
      fetch("/api/leaderboard").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([chapData, lb]) => {
      const kannadaChaps = (chapData.chapters as Chapter[]).filter(
        c => c.subject === "Kannada" && c.chapter_number < 90
      );
      setChapters(kannadaChaps);
      setLbData(lb);
      setLoading(false);
    });
  }, []);

  const handleClick = (num: number, locked: boolean) => {
    if (locked) return;
    const ch = chapters.find(c => c.chapter_number === num);
    if (ch) onChapterSelect(ch);
  };

  const completedCount = chapters.filter(c => c.chapter_number <= 5).length;
  const progressPct    = completedCount / 5;

  const lbEntries = lbData?.top10 ?? [];
  const podium    = lbEntries.slice(0, 3);
  const ranked    = lbEntries.slice(3);

  return (
    <div className="relative overflow-hidden"
      style={{ height:"100dvh", fontFamily:"var(--font-dm-sans,'DM Sans',sans-serif)" }}>

      {/* Background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/classroom/kannada/bg.png" alt="" aria-hidden draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex:0 }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"rgba(215,200,255,0.18)", zIndex:1 }} />

      {/* Floating Kannada letters */}
      {[
        { ch:"ಅ", top:"6%",  left:"23%", size:64 }, { ch:"ಆ", top:"3%",  left:"37%", size:52 },
        { ch:"ಇ", top:"5%",  left:"52%", size:57 }, { ch:"ಕ", top:"7%",  left:"66%", size:50 },
        { ch:"ಪ", top:"26%", left:"16%", size:72 }, { ch:"ಮ", top:"48%", left:"12%", size:60 },
        { ch:"ಕ", top:"70%", left:"18%", size:57 }, { ch:"ಪ", top:"78%", left:"40%", size:53 },
        { ch:"ಮ", top:"72%", left:"62%", size:62 }, { ch:"ಅ", top:"26%", left:"70%", size:54 },
        { ch:"ಆ", top:"50%", left:"76%", size:66 }, { ch:"ಇ", top:"14%", left:"84%", size:48 },
      ].map((k, i) => (
        <span key={i} className="absolute pointer-events-none select-none"
          style={{ top:k.top, left:k.left, fontSize:k.size, fontWeight:900,
            color:"rgba(80,20,170,0.13)", lineHeight:1, zIndex:2 }}>
          {k.ch}
        </span>
      ))}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative flex items-center px-6 gap-4 flex-shrink-0"
        style={{ height:56, zIndex:20,
          background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,0.65)",
          boxShadow:"0 2px 18px rgba(15,28,77,0.08)" }}>

        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          style={{ color:"rgba(15,28,77,0.6)" }}>
          <ChevronLeft className="w-4 h-4" />
          Back to Subjects
        </button>

        <div className="flex-1 flex flex-col items-center leading-none">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <span className="font-black text-2xl tracking-tight" style={{ color:NAVY }}>
              KANNADA
            </span>
          </div>
          <span className="text-xs font-semibold mt-0.5" style={{ color:"rgba(15,28,77,0.45)" }}>
            CBSE Class 10
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background:"rgba(91,33,182,0.07)", border:"1px solid rgba(91,33,182,0.18)" }}>
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold" style={{ color:PURPLE_MID }}>Board: CBSE</span>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="relative" style={{ height:"calc(100dvh - 56px)", zIndex:10 }}>

        {/* Connector lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex:2 }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          {CONNECTORS.map(c => (
            <line key={c.id}
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke="rgba(255,255,255,0.70)" strokeWidth="0.28"
              strokeDasharray="1.4 1.2" strokeLinecap="round" />
          ))}
        </svg>

        {/* Center circle */}
        <motion.div className="absolute overflow-hidden"
          style={{ width:180, height:180, borderRadius:"50%", zIndex:6,
            top:"calc(50% - 90px)", left:"calc(50% - 110px)",
            boxShadow:"0 0 0 5px rgba(255,255,255,0.58), 0 10px 36px rgba(80,20,170,0.42)" }}
          initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
          transition={{ duration:0.5, delay:0.1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/classroom/kannada/mid_term_exam.png" alt="Integrated Exam Practice"
            className="w-full h-full object-cover select-none" draggable={false} />
          <div className="absolute inset-0 flex items-end justify-center" style={{ paddingBottom:11 }}>
            <div className="flex items-center justify-center rounded-full"
              style={{ width:33, height:33,
                background:"linear-gradient(180deg,#0d1e38,#060f20)",
                border:"1.5px solid rgba(125,211,252,0.68)",
                boxShadow:"0 0 16px rgba(0,212,255,0.58), inset 0 0 8px rgba(0,212,255,0.15)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#E0F4FF" strokeWidth="1.9"/>
                <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="#E0F4FF" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Chapter tiles */}
        {CHAPTERS_DATA.map((ch, i) => (
          <ChapterTile key={ch.key} chapter={ch} index={i}
            onClick={() => handleClick(ch.num, ch.locked)} />
        ))}

        {/* ── Progress card ── */}
        <motion.div className="absolute rounded-2xl p-4"
          style={{ top:18, left:18, width:260, zIndex:8,
            background:"rgba(255,255,255,0.93)", backdropFilter:"blur(22px)",
            border:"1px solid rgba(255,255,255,0.78)",
            boxShadow:"0 8px 32px rgba(15,28,77,0.10)" }}
          initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.45 }}>

          <p className="font-black text-sm mb-3" style={{ color:NAVY }}>Subject Progress</p>

          <div className="flex items-center gap-3.5">
            <ProgressRing pct={progressPct} color={PURPLE} />
            <div className="flex flex-col gap-2 flex-1">
              {[
                { label:"Chapters Completed", value:`${completedCount}/5` },
                { label:"Tests Attempted",    value:"—" },
                { label:"Avg. Accuracy",      value:"—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ fontSize:11, color:"rgba(15,28,77,0.50)" }}>{label}</span>
                  <span style={{ fontSize:11, fontWeight:900, color:NAVY }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Leaderboard ── */}
        <motion.div className="absolute flex flex-col overflow-hidden"
          style={{ top:18, right:18, width:298, maxHeight:"calc(100% - 36px)", zIndex:8,
            borderRadius:18,
            background:"rgba(255,255,255,0.91)", backdropFilter:"blur(22px)",
            border:"1px solid rgba(255,255,255,0.78)",
            boxShadow:"0 8px 36px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.82)" }}
          initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
          transition={{ duration:0.45 }}>

          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3"
            style={{ background:"linear-gradient(135deg,rgba(91,33,182,0.08),rgba(91,33,182,0.02))",
              borderBottom:"1px solid rgba(0,0,0,0.055)" }}>
            <span style={{ fontSize:17, lineHeight:1 }}>🏆</span>
            <span className="font-black flex-1" style={{ fontSize:14, color:"#1a1a2e" }}>Leaderboard</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color:PURPLE_MID }} />
            </div>
          ) : lbEntries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ fontSize:11, color:"#bbb" }}>No data yet</p>
            </div>
          ) : (
            <>
              {podium.length === 3 && (
                <div className="flex-shrink-0 flex items-end gap-1 px-2.5 pt-4 pb-1.5"
                  style={{ background:"linear-gradient(180deg,rgba(91,33,182,0.045),transparent)" }}>
                  {PODIUM_META.map(meta => {
                    const entry = podium.find(e => e.rank === meta.rank);
                    return entry ? <PodiumSpot key={meta.rank} entry={entry} meta={meta} /> : null;
                  })}
                </div>
              )}
              {ranked.length > 0 && (
                <>
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5">
                    <div className="flex-1 h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                    <span style={{ fontSize:9, color:"#ccc", fontWeight:700, letterSpacing:"0.09em" }}>
                      RANKING
                    </span>
                    <div className="flex-1 h-px" style={{ background:"rgba(0,0,0,0.06)" }} />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2"
                    style={{ scrollbarWidth:"none" }}>
                    {ranked.map((e, i) => <LeaderboardRow key={e.rank} entry={e} index={i} />)}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>

      </div>
    </div>
  );
}
