"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { CreationsRoom }     from "@/components/playground/CreationsRoom";
import { SaveCreationModal } from "@/components/playground/SaveCreationModal";
import { BadgeUnlockToast }  from "@/components/gamification/BadgeUnlockToast";
import { XPFlash }           from "@/components/gamification/XPFlash";
import { useChat }           from "@/components/playground/useChat";
import { useXP, type XPResult } from "@/lib/useXP";
import { getArena, type Badge } from "@/lib/arenas";
import type { Profile, PlaygroundMode, OutputType } from "@/types";

// ── helpers ────────────────────────────────────────────────────────────────

function mergeProfileFromXp(p: Profile, r: XPResult): Profile {
  const ids   = new Set((p.badges ?? []).map(b => b.id));
  const added = (r.new_badges ?? [])
    .filter(b => !ids.has(b.id))
    .map(b => ({ id: b.id, earned_at: b.earned_at }));
  return {
    ...p,
    xp:          r.total_xp,
    level:       r.level,
    streak_days: r.streak_days,
    badges:      [...(p.badges ?? []), ...added],
  };
}

function buildPreviousOutputContext(
  messages: Array<{ role: string; content: string; outputType?: string; isLoading?: boolean }>,
  outputType: string,
): string {
  const last = [...messages]
    .reverse()
    .find(m => m.role === "assistant" && m.outputType === outputType && !m.isLoading && m.content);
  if (!last) return "";
  if (outputType === "image") {
    if (/^https?:\/\//i.test(last.content.trim()))
      return `[Image titled "previous output": ${last.content.trim()}]\n\n`;
  }
  if (outputType === "audio") {
    try {
      const p = JSON.parse(last.content);
      const narrator  = p?.script?.narrator_text ?? "";
      const dialogues = (p?.script?.dialogues ?? [])
        .map((d: { character: string; text: string }) => `${d.character}: ${d.text}`)
        .join(" | ");
      return `[Audio titled "previous output": Narrator: ${narrator}. Dialogues: ${dialogues || "none"}]\n\n`;
    } catch { return ""; }
  }
  if (outputType === "slides") {
    try {
      const p = JSON.parse(last.content);
      const sections = (p?.sections ?? [])
        .map((s: { title: string; concepts: string[] }) => `${s.title}: ${s.concepts?.join(", ")}`)
        .join(" | ");
      return `[Slides titled "previous output": ${sections}]\n\n`;
    } catch { return ""; }
  }
  if (outputType === "json") {
    try {
      const parsed = JSON.parse(last.content);
      return `[JSON titled "previous output": ${JSON.stringify(parsed)}]\n\n`;
    } catch { return ""; }
  }
  return "";
}

// Arena accent is derived dynamically from profile.active_arena below

// ── page ───────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const router = useRouter();
  const [profile,        setProfile]        = useState<Profile | null>(null);
  const [mode]                               = useState<PlaygroundMode>("free");
  const [outputType,     setOutputType]      = useState<OutputType>("text");
  const [saveOpen,       setSaveOpen]        = useState(false);
  const [saveContent,    setSaveContent]     = useState("");
  const [saveOutputType, setSaveOutputType]  = useState<OutputType>("text");
  const [xpFlash,        setXpFlash]         = useState<{ amount: number; streak: boolean } | null>(null);
  const [badgeToast,     setBadgeToast]      = useState<(Badge & { earned_at: string }) | null>(null);
  const badgeQueueRef = useRef<(Badge & { earned_at: string })[]>([]);
  const didInit       = useRef(false);

  const {
    messages, isStreaming, sessionId,
    startSession, loadSession,
    sendMessage, sendImage, sendAudio, sendSlides, sendJSON,
    reset,
  } = useChat(profile, mode);

  const onBadgeUnlock = useCallback((b: Badge & { earned_at: string }) => {
    setBadgeToast(prev => {
      if (prev) { badgeQueueRef.current.push(b); return prev; }
      return b;
    });
  }, []);

  const dismissBadgeToast = useCallback(() => {
    setBadgeToast(() => badgeQueueRef.current.shift() ?? null);
  }, []);

  const { awardXP } = useXP(
    () => {}, // no level-up modal needed
    onBadgeUnlock,
  );

  const showXPFlash = (amount: number, streak = false) => {
    setXpFlash({ amount, streak });
    setTimeout(() => setXpFlash(null), 2500);
  };

  const handleXpResult = useCallback((r: XPResult | null) => {
    if (!r) return;
    setProfile(p => (p ? mergeProfileFromXp(p, r) : null));
    showXPFlash(r.xp_earned, r.streak_bonus > 0);
  }, []);

  // Load profile once
  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => {
        if (!profile) router.replace("/dashboard/profile");
        else setProfile(profile);
      });
  }, [router]);

  // Start session once profile is ready
  useEffect(() => {
    if (profile && !didInit.current) {
      didInit.current = true;
      startSession(mode);
    }
  }, [profile]); // eslint-disable-line

  const handleNewChat = useCallback(async () => {
    reset();
    await startSession(mode);
  }, [reset, startSession, mode]);

  const handleLoadSession = useCallback(async (s: Session) => {
    reset();
    setWelcomeShown(false);
    setInjectedCreations([]);
    setAttachments([]);
    await loadSession(s.id);
  }, [reset, loadSession]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setWelcomeShown(false);

    const atts      = [...attachments];
    const creations = [...injectedCreations];
    setAttachments([]);
    setInjectedCreations([]);

    let context = buildCreationContext(creations);
    if (!context && (outputType === "audio" || outputType === "slides" || outputType === "json")) {
      context = buildPreviousOutputContext(messages, outputType);
    }
    // For images, only auto-inject the previous image when the prompt is a modification request.
    // Otherwise every new image prompt would be forced into img2img mode.
    const IMAGE_MOD_KEYWORDS = [
      "make it", "make the", "change it", "change the", "same but", "similar but",
      "like that but", "keep the", "edit it", "edit the", "modify", "adjust",
      "darker", "lighter", "brighter", "different color", "different style",
      "add a", "add the", "remove the", "without the",
    ];
    if (!context && outputType === "image" && IMAGE_MOD_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
      context = buildPreviousOutputContext(messages, "image");
    }

    const context = buildPreviousOutputContext(messages, outType);
    const enrichedText = context ? context + text : text;
    const hasContext = !!context;

    if (outType === "image") {
      await sendImage(enrichedText, hasContext ? text : undefined, []);
      awardXP("generate_image").then(handleXpResult);
    } else if (outType === "audio") {
      await sendAudio(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, []);
      awardXP("generate_audio").then(handleXpResult);
    } else if (outType === "slides") {
      await sendSlides(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, []);
      awardXP("generate_slides").then(handleXpResult);
    } else if (outputType === "json") {
      await sendJSON(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, bubbleMeta);
      awardXP("generate_text").then(handleXpResult);
    } else {
      await sendMessage(enrichedText, outType, [], undefined, []);
      awardXP("generate_text").then(handleXpResult);
    }
  };

  const openSave = (content: string, type: OutputType) => {
    setSaveContent(content);
    setSaveOutputType(type);
    setSaveOpen(true);
  };

  const handleSave = async (title: string, outType: OutputType, tags: string[], projectId?: string) => {
    awardXP("save_creation").then(handleXpResult);
    await fetch("/api/creations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, type: "chat", output_type: outType,
        content: saveContent, tags,
        project_id: projectId,
        session_id: sessionId,
        prompt_used: messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "",
      }),
    });
  };

  // Derive arena theme from profile
  const activeArena     = getArena(profile?.active_arena ?? 1);
  const ARENA_ACCENT      = activeArena.accent;
  const ARENA_ACCENT_GLOW = activeArena.accentGlow;

  // Loading state
  if (!profile) return (
    <div className="flex items-center justify-center" style={{ height: "calc(100vh - 57px)", background: "#080814" }}>
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="dot w-3 h-3 rounded-full" style={{ background: ARENA_ACCENT, boxShadow: `0 0 12px ${ARENA_ACCENT_GLOW}` }}/>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

      {/* Creation Room — full screen */}
      <CreationsRoom
        profile={profile}
        sessionId={sessionId}
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
        onNewChat={handleNewChat}
        onSave={openSave}
        arenaId={activeArena.id}
        arenaAccent={ARENA_ACCENT}
        arenaAccentGlow={ARENA_ACCENT_GLOW}
      />

      {/* XP flash overlay */}
      {xpFlash && (
        <XPFlash amount={xpFlash.amount} visible streak={xpFlash.streak}/>
      )}

      {/* Badge toast */}
      <AnimatePresence mode="wait">
        {badgeToast && (
          <BadgeUnlockToast
            key={badgeToast.id}
            badge={badgeToast}
            accent={ARENA_ACCENT}
            accentGlow={ARENA_ACCENT_GLOW}
            onDismiss={dismissBadgeToast}
          />
        )}
      </AnimatePresence>

      {/* Save modal */}
      <SaveCreationModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSave}
        defaultOutputType={saveOutputType}
        suggestedTitle=""
      />
    </div>
  );
}