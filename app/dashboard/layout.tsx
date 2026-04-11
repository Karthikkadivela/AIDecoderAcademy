"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { ArenaEnvironment } from "@/components/dashboard/ArenaEnvironment";
import { getArena, ACTIVE_ARENA_CHANGED_EVENT } from "@/lib/arenas";
import type { Profile } from "@/types";

const NAV = [
  { href: "/dashboard/playground", label: "Playground",    icon: "🎮" },
  { href: "/dashboard/progress",   label: "My Creations",  icon: "⭐" },
  { href: "/dashboard/profile",    label: "Profile",       icon: "🧒" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [arenaOverride, setArenaOverride] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => setProfile(profile))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onArena = (e: Event) => {
      const ce = e as CustomEvent<{ arenaId: number }>;
      if (typeof ce.detail?.arenaId === "number") setArenaOverride(ce.detail.arenaId);
    };
    window.addEventListener(ACTIVE_ARENA_CHANGED_EVENT, onArena);
    return () => window.removeEventListener(ACTIVE_ARENA_CHANGED_EVENT, onArena);
  }, []);

  useEffect(() => {
    if (arenaOverride != null && profile?.active_arena === arenaOverride) {
      setArenaOverride(null);
    }
  }, [profile?.active_arena, arenaOverride]);

  const effectiveArenaId = arenaOverride ?? profile?.active_arena ?? 1;
  const arena = getArena(effectiveArenaId);
  const xp    = profile?.xp    ?? 0;
  const level = profile?.level ?? 1;

  // XP progress within current level
  const currentThreshold = [0, 100, 300, 600, 1000, 1500][level - 1] ?? 0;
  const nextThreshold    = [100, 300, 600, 1000, 1500, 99999][level - 1] ?? 99999;
  const isMaxed          = level >= 6;
  const progress         = isMaxed ? 100
    : Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-[#08080F]"
      style={{ height: "100vh" }}
    >
      <ArenaEnvironment preset={arena.environmentPreset} gradient={arena.gradient} />

      {/* Top nav */}
      <header className="relative z-20 flex-shrink-0 border-b"
        style={{ background: "rgba(15,15,26,0.95)", borderColor: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between px-5 py-2.5 w-full gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: arena.accent }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" fill="#08080F"/>
              </svg>
            </div>
            <span className="font-display font-black text-white text-base tracking-tight hidden sm:block">
              AI<span style={{ color: arena.accent }}>Decoder</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-display font-bold text-sm transition-all duration-200",
                    active ? "text-[#08080F]" : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  )}
                  style={active ? {
                    background:  arena.accent,
                    boxShadow:   `0 0 20px ${arena.accentGlow}`,
                  } : {}}>
                  <span className="text-base">{item.icon}</span>
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right — XP + level + avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {profile && (
              <div className="hidden sm:flex items-center gap-2.5">
                {/* Level badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border"
                  style={{ background: arena.accentDim, borderColor: arena.accent + "40" }}>
                  <span className="text-sm">{arena.emoji}</span>
                  <span className="font-display font-black text-xs" style={{ color: arena.accent }}>
                    Lv {level}
                  </span>
                </div>

                {/* XP bar */}
                <div className="w-24 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[9px] text-white/30 font-mono">{xp} XP</span>
                    {!isMaxed && <span className="text-[9px] text-white/20 font-mono">{nextThreshold}</span>}
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width:      `${progress}%`,
                        background: arena.accent,
                        boxShadow:  `0 0 6px ${arena.accentGlow}`,
                      }}/>
                  </div>
                </div>

                {/* Streak */}
                {(profile.streak_days ?? 0) > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-500/20"
                    style={{ background: "rgba(255,107,43,0.1)" }}>
                    <span className="text-sm">🔥</span>
                    <span className="font-display font-black text-xs text-orange-400">
                      {profile.streak_days}
                    </span>
                  </div>
                )}
              </div>
            )}
            <UserButton afterSignOutUrl="/auth/sign-in"/>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {children}
      </main>
    </div>
  );
}