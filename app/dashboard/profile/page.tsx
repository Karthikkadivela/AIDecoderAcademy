"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn, INTEREST_OPTIONS } from "@/lib/utils";
import {
  getArena, getUnlockedArenas, getXPProgress, getXPForNextLevel,
  BADGES, XP_THRESHOLDS, ARENAS, type ArenaConfig,
} from "@/lib/arenas";
import { isGameSfxEnabled, setGameSfxEnabled } from "@/lib/gameAudio";
import type { AgeGroup, Profile } from "@/types";

// ─── Onboarding helpers ───────────────────────────────────────────────────────
const BOARDS = ["CBSE", "ICSE", "State Board"];
const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

function getDefaultAvatar(name: string): string {
  const initials: Record<string, string> = {
    a:"🦁",b:"🐻",c:"🐱",d:"🐶",e:"🦅",f:"🦊",g:"🦍",h:"🐹",i:"🦔",j:"🐯",
    k:"🦘",l:"🦁",m:"🐭",n:"🦎",o:"🦉",p:"🐼",q:"🦆",r:"🐰",s:"🐍",t:"🐯",
    u:"🦄",v:"🦅",w:"🐺",x:"🦖",y:"🦚",z:"🦓",
  };
  return initials[name?.charAt(0).toLowerCase() ?? "s"] ?? "🚀";
}

function gradeToAgeGroup(grade: string): AgeGroup {
  const g = parseInt(grade);
  if (g <= 5)  return "5-7";
  if (g <= 7)  return "8-10";
  if (g <= 10) return "11-13";
  return "14+";
}

function isProfileComplete(p: Record<string, unknown>): boolean {
  return !!(p.display_name && p.age_group);
}

// ─── Onboarding flow ──────────────────────────────────────────────────────────
function OnboardingFlow() {
  const router   = useRouter();
  const [saving,       setSaving]       = useState(false);
  const [step,         setStep]         = useState(0);
  const [board,        setBoard]        = useState("CBSE");
  const [grade,        setGrade]        = useState("8");
  const [interests,    setInterests]    = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);

  const [authName, setAuthName] = useState("Explorer");
  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => {
        if (profile?.display_name) setAuthName(profile.display_name);
      })
      .catch(() => {});
  }, []);
  const displayName = authName;
  const defaultAvatar = getDefaultAvatar(displayName);
  const displayPhoto = photoPreview ?? null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : prev.length < 8 ? [...prev, i] : prev);

  const handleSave = async () => {
    setSaving(true);
    let avatarUrl: string | null = null;
    if (photoFile) {
      const fd = new FormData();
      fd.append("file", photoFile);
      const r = await fetch("/api/profile/photo", { method: "POST", body: fd });
      if (r.ok) ({ url: avatarUrl } = await r.json());
    }
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName, avatar_emoji: defaultAvatar,
        avatar_url: avatarUrl ?? null,
        age_group: gradeToAgeGroup(grade), interests,
      }),
    });
    if (res.ok) {
      router.replace("/dashboard/playground");
    } else {
      setSaving(false);
    }
  };

  return (
    <div className="studio-bg min-h-full flex items-center justify-center p-8 text-white">
      <div className="w-full max-w-lg">
        <div className="flex gap-2 justify-center mb-8">
          {[0,1].map(i => (
            <div key={i} className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-[#C8FF00]" : i < step ? "w-2 bg-[#C8FF00]/40" : "w-2 bg-white/10"
            )}/>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: "rgba(15,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>

            <div className="px-8 pt-7 pb-5 border-b border-white/[0.07]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C8FF00]">
                Step {step + 1} of 2
              </span>
              <h1 className="text-2xl font-display font-black text-white mb-1 mt-3">
                {step === 0 ? `Welcome, ${displayName}! 👋` : "Your learning profile"}
              </h1>
              <p className="text-sm text-white/50">
                {step === 0 ? "Add a profile photo, or we'll pick one for you." : "Help us personalise your AI experience."}
              </p>
            </div>

            <div className="px-8 py-6">
              {step === 0 && (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
                      style={{ background: "rgba(200,255,0,0.1)", border: "3px solid rgba(200,255,0,0.3)" }}>
                      {displayPhoto
                        ? <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover"/>
                        : <span className="text-5xl">{defaultAvatar}</span>}
                    </div>
                    <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                      style={{ background: "#C8FF00" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8l5-5 5 5" stroke="#08080F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                    </label>
                  </div>
                  <p className="text-sm text-white/60 text-center">
                    {displayPhoto ? "Looking great! 🎉" : `We'll use ${defaultAvatar} for now`}
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Education Board</label>
                    <div className="flex gap-2 flex-wrap">
                      {BOARDS.map(b => (
                        <button key={b} onClick={() => setBoard(b)}
                          className={cn("px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                            board === b ? "text-[#08080F] border-transparent" : "border-white/10 text-white/50 hover:border-white/20")}
                          style={board === b ? { background: "#C8FF00", boxShadow: "0 0 20px rgba(200,255,0,0.3)" } : {}}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Grade / Class</label>
                    <div className="flex gap-2 flex-wrap">
                      {GRADES.map(g => (
                        <button key={g} onClick={() => setGrade(g)}
                          className={cn("w-12 h-12 rounded-xl text-sm font-bold border transition-all",
                            grade === g ? "text-[#08080F] border-transparent" : "border-white/10 text-white/50 hover:border-white/20")}
                          style={grade === g ? { background: "#C8FF00" } : {}}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">
                      Interests <span className="normal-case font-normal text-white/25">(pick up to 8)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map(interest => (
                        <button key={interest} onClick={() => toggleInterest(interest)}
                          className={cn("px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                            interests.includes(interest) ? "text-[#08080F] border-transparent" : "border-white/10 text-white/40 hover:border-white/20")}
                          style={interests.includes(interest) ? { background: "#C8FF00" } : {}}>
                          {interest}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 mt-2">{interests.length}/8 selected</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex-1 py-3.5 rounded-xl font-display font-bold text-sm border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all">
                    ← Back
                  </button>
                )}
                {step === 0 ? (
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl font-display font-black text-sm transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: "#C8FF00", color: "#08080F", boxShadow: "0 0 24px rgba(200,255,0,0.35)" }}>
                    Next →
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3.5 rounded-xl font-display font-black text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    style={{ background: "#C8FF00", color: "#08080F", boxShadow: "0 0 24px rgba(200,255,0,0.35)" }}>
                    {saving ? "Setting up…" : "Let's go! 🚀"}
                  </button>
                )}
              </div>
              {step === 0 && (
                <button onClick={() => setStep(1)} className="w-full text-center text-xs text-white/30 hover:text-white/50 mt-4 transition-colors">
                  Skip photo →
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Trophy Room (profile dashboard) ─────────────────────────────────────────
function TrophyRoom({ profile }: { profile: Profile }) {
  const [arenaSfx, setArenaSfx] = useState(false);
  const [creationCount, setCreationCount] = useState<number | null>(null);
  useEffect(() => {
    setArenaSfx(isGameSfxEnabled());
  }, []);
  useEffect(() => {
    fetch("/api/creations")
      .then(r => (r.ok ? r.json() : { creations: [] }))
      .then(({ creations }) => setCreationCount((creations ?? []).length))
      .catch(() => setCreationCount(null));
  }, []);

  const arena        = getArena(profile.active_arena ?? 1);
  const xp           = profile.xp ?? 0;
  const level        = profile.level ?? 1;
  const streak       = profile.streak_days ?? 0;
  const earnedBadges = new Set((profile.badges ?? []).map((b: { id: string }) => b.id));
  const unlockedArenas = getUnlockedArenas(level);
  const progress     = getXPProgress(xp, level);
  const currentXPThreshold = XP_THRESHOLDS[level - 1] ?? 0;
  const nextXPThreshold    = getXPForNextLevel(level);
  const isMaxLevel   = level >= 6;

  return (
    <div
      className="relative overflow-y-auto bg-transparent text-white"
      style={{ minHeight: "calc(100vh - 57px)" }}
    >
      <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-6 py-8">

        {/* ── Hero card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 border"
          style={{
            background:  `linear-gradient(135deg, ${arena.accentDim}, rgba(15,15,26,0.9))`,
            borderColor: arena.accent + "30",
            boxShadow:   `0 0 60px ${arena.accentGlow}`,
          }}>
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{ background: arena.accentDim, border: `2px solid ${arena.accent}40` }}>
                {profile.avatar_emoji}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-display font-black"
                style={{ background: arena.accent, color: "#08080F" }}>
                {level}
              </div>
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-black text-2xl text-white leading-tight">
                {profile.display_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{arena.emoji}</span>
                <span className="font-display font-bold text-sm" style={{ color: arena.accent }}>
                  {arena.role}
                </span>
                <span className="text-white/30 text-xs">{arena.weekLabel}</span>
              </div>

              {/* XP bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 font-mono">
                    {isMaxLevel ? "MAX LEVEL" : `Level ${level} → ${level + 1}`}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: arena.accent }}>
                    {xp} XP {!isMaxLevel && `/ ${nextXPThreshold}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${isMaxLevel ? 100 : progress}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{
                      background:  arena.accent,
                      boxShadow:   `0 0 10px ${arena.accentGlow}`,
                    }}
                  />
                </div>
                {!isMaxLevel && (
                  <p className="text-[10px] text-white/30">
                    {nextXPThreshold - xp} XP to unlock {ARENAS[level]?.name}
                  </p>
                )}
              </div>
            </div>

            {/* Streak */}
            <div className="flex-shrink-0 text-center px-4 py-3 rounded-2xl border border-white/10"
              style={{ background: "rgba(255,107,43,0.1)", borderColor: "rgba(255,107,43,0.2)" }}>
              <div className="text-3xl">{streak >= 3 ? "🔥" : "⚡"}</div>
              <div className="font-display font-black text-xl text-white">{streak}</div>
              <div className="text-[10px] text-white/40">day streak</div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total XP",      value: xp,     icon: "⚡", color: arena.accent },
            { label: "Level",         value: level,  icon: arena.emoji, color: arena.accent },
            { label: "Badges Earned", value: (profile.badges ?? []).length, icon: "🏅", color: "#FF6B2B" },
          ].map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-4 text-center border border-white/[0.07]"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="font-display font-black text-2xl text-white">{stat.value}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── P3: Goals / next achievements ── */}
        <div
          className="rounded-2xl border border-white/10 p-5"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <h2 className="font-display font-black text-lg text-white mb-4 flex items-center gap-2">
            <span>🎯</span> Next goals
          </h2>
          <div className="space-y-4">
            {!earnedBadges.has("streak_7") && (
              <div>
                <div className="flex justify-between text-[11px] font-display font-bold text-white/70 mb-1">
                  <span>Week Warrior streak</span>
                  <span className="font-mono text-white/40">{streak} / 7 days</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:      `${Math.min(100, Math.round((streak / 7) * 100))}%`,
                      background: arena.accent,
                      boxShadow:  `0 0 10px ${arena.accentGlow}`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-white/35 mt-1">Use the playground on consecutive days.</p>
              </div>
            )}
            {!earnedBadges.has("librarian") && creationCount != null && (
              <div>
                <div className="flex justify-between text-[11px] font-display font-bold text-white/70 mb-1">
                  <span>Librarian badge</span>
                  <span className="font-mono text-white/40">{creationCount} / 10 saves</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:      `${Math.min(100, Math.round((creationCount / 10) * 100))}%`,
                      background: "#FF6B2B",
                      boxShadow:  "0 0 10px rgba(255,107,43,0.35)",
                    }}
                  />
                </div>
              </div>
            )}
            {!earnedBadges.has("all_tools") && (
              <p className="text-[11px] text-white/40 leading-relaxed">
                Try every output format (text, JSON, image, audio, slides) to earn <span className="text-white/60 font-bold">Full Toolkit</span>.
              </p>
            )}
            {earnedBadges.has("streak_7") && earnedBadges.has("librarian") && earnedBadges.has("all_tools") && (
              <p className="text-sm text-white/45 font-display font-bold">
                You have cleared the starter goals — keep creating for fun and new arenas!
              </p>
            )}
          </div>
        </div>

        {/* ── Arenas unlocked ── */}
        <div>
          <h2 className="font-display font-black text-lg text-white mb-3 flex items-center gap-2">
            <span>🏟️</span> Your Arenas
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {ARENAS.map((a, i) => {
              const unlocked = a.unlockLevel <= level;
              const active   = a.id === (profile.active_arena ?? 1);
              return (
                <motion.div key={a.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn("rounded-2xl p-3 text-center border transition-all", !unlocked && "opacity-30")}
                  style={{
                    background:  unlocked ? a.accentDim : "rgba(255,255,255,0.02)",
                    borderColor: active ? a.accent : unlocked ? a.accent + "30" : "rgba(255,255,255,0.06)",
                    boxShadow:   active ? `0 0 16px ${a.accentGlow}` : "none",
                  }}>
                  <div className="text-2xl mb-1">{unlocked ? a.emoji : "🔒"}</div>
                  <div className="text-[9px] font-bold leading-tight" style={{ color: unlocked ? a.accent : "rgba(255,255,255,0.3)" }}>
                    {a.weekLabel}
                  </div>
                  {active && (
                    <div className="text-[8px] text-white/50 mt-0.5">active</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── XP Journey ── */}
        <div>
          <h2 className="font-display font-black text-lg text-white mb-3 flex items-center gap-2">
            <span>📈</span> XP Journey
          </h2>
          <div className="rounded-2xl p-5 border border-white/[0.07]"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-end gap-0 h-16 mb-3">
              {XP_THRESHOLDS.map((threshold, i) => {
                const nextThreshold = XP_THRESHOLDS[i + 1] ?? threshold + 500;
                const isCurrentLevel = i + 1 === level;
                const isPast = i + 1 < level;
                const pct = isPast ? 100 : isCurrentLevel ? progress : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full mx-0.5 rounded-t-lg overflow-hidden bg-white/5" style={{ height: "48px" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full rounded-t-lg"
                        style={{
                          background: isPast || isCurrentLevel ? ARENAS[i]?.accent : "transparent",
                          opacity:    isPast ? 0.5 : 1,
                          marginTop:  "auto",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex">
              {ARENAS.map((a, i) => (
                <div key={a.id} className="flex-1 text-center">
                  <div className="text-[8px] text-white/30 leading-tight">{a.weekLabel}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Badges ── */}
        <div>
          <h2 className="font-display font-black text-lg text-white mb-3 flex items-center gap-2">
            <span>🏅</span> Badges
            <span className="text-sm font-normal text-white/30">
              {earnedBadges.size} / {BADGES.length}
            </span>
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {BADGES.map((badge, i) => {
              const earned = earnedBadges.has(badge.id);
              return (
                <motion.div key={badge.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "rounded-2xl p-3 text-center border transition-all",
                    earned ? "border-white/10" : "border-white/[0.04] opacity-35"
                  )}
                  style={{
                    background: earned ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                    boxShadow:  earned ? "0 0 20px rgba(200,255,0,0.08)" : "none",
                  }}>
                  <div className={cn("text-2xl mb-1.5", !earned && "grayscale")}>
                    {badge.emoji}
                  </div>
                  <div className={cn("font-display font-bold text-[10px] leading-tight mb-0.5",
                    earned ? "text-white" : "text-white/30")}>
                    {badge.name}
                  </div>
                  <div className="text-[9px] text-white/25 leading-tight">
                    {badge.condition}
                  </div>
                  {earned && (
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full mx-auto"
                      style={{ background: "#C8FF00", boxShadow: "0 0 6px rgba(200,255,0,0.6)" }}/>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Interests ── */}
        {profile.interests?.length > 0 && (
          <div>
            <h2 className="font-display font-black text-lg text-white mb-3 flex items-center gap-2">
              <span>✨</span> Your Interests
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(interest => (
                <span key={interest}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border"
                  style={{
                    background:  arena.accentDim,
                    borderColor: arena.accent + "40",
                    color:       arena.accent,
                  }}>
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Game audio (arena + level up) ── */}
        <div
          className="rounded-2xl border border-white/10 p-4"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <h2 className="font-display font-black text-lg text-white mb-3 flex items-center gap-2">
            <span>🎛️</span> Sounds & celebrations
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-white">Arena & level-up audio</p>
              <p className="text-[10px] text-white/35 mt-0.5 leading-snug max-w-md">
                Arena stings, level-up fanfare, and badge unlock sounds. Off unless you enable it. No audio if your device uses reduced motion.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={arenaSfx}
              aria-label="Arena and level-up sounds"
              onClick={() => {
                const next = !arenaSfx;
                setGameSfxEnabled(next);
                setArenaSfx(next);
              }}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full border transition-colors",
                arenaSfx ? "border-white/25" : "border-white/10 bg-white/[0.06]",
              )}
              style={
                arenaSfx
                  ? { background: arena.accentDim, borderColor: `${arena.accent}55` }
                  : undefined
              }>
              <span
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
                  arenaSfx ? "translate-x-[1.75rem]" : "translate-x-1",
                )}
                style={arenaSfx ? { boxShadow: `0 0 12px ${arena.accentGlow}` } : undefined}
              />
            </button>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => {
        setProfile(profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="studio-bg flex items-center justify-center" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="dot w-3 h-3 rounded-full bg-[#C8FF00] shadow-[0_0_12px_rgba(200,255,0,0.45)]"/>
        ))}
      </div>
    </div>
  );

  // Not set up yet — show onboarding
  if (!profile || !isProfileComplete(profile as unknown as Record<string, unknown>)) {
    return <OnboardingFlow />;
  }

  // Set up — show trophy room
  return <TrophyRoom profile={profile} />;
}