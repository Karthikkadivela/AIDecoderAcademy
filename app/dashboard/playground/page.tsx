"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, X } from "lucide-react";
import { MessageBubble } from "@/components/playground/MessageBubble";
import { SaveCreationModal } from "@/components/playground/SaveCreationModal";
import { CreationPicker } from "@/components/playground/CreationPicker";
import { PlaygroundWorld } from "@/components/playground/PlaygroundWorld";
import { CinemaWorld }       from "@/components/playground/CinemaWorld";
import { PromptLabWorld }    from "@/components/playground/PromptLabWorld";
import { VisualStudioWorld } from "@/components/playground/VisualStudioWorld";
import { SoundBoothWorld }   from "@/components/playground/SoundBoothWorld";
import { ArenaCanvas } from "@/components/playground/ArenaCanvas";
import { PlaygroundFlyers } from "@/components/playground/PlaygroundFlyers";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { ArenaSelector } from "@/components/gamification/ArenaSelector";
import { BadgeUnlockToast } from "@/components/gamification/BadgeUnlockToast";
import { StreakMeter } from "@/components/gamification/StreakMeter";
import { XPFlash } from "@/components/gamification/XPFlash";
import { XPBar } from "@/components/gamification/XPBar";
import { useChat, type Attachment } from "@/components/playground/useChat";
import { useXP, type XPResult } from "@/lib/useXP";
import { getArena, dispatchActiveArenaChanged, type Badge } from "@/lib/arenas";
import { cn } from "@/lib/utils";
import type { Profile, PlaygroundMode, OutputType, Session, Creation } from "@/types";

const OUTPUT_FORMATS: { value: OutputType; label: string; icon: string; soon?: boolean }[] = [
  { value: "text",   label: "Text",   icon: "T"   },
  { value: "json",   label: "JSON",   icon: "{}"  },
  { value: "image",  label: "Image",  icon: "Img" },
  { value: "audio",  label: "Audio",  icon: "♪"   },
  { value: "slides", label: "Slides", icon: "▦"   },
  { value: "video",  label: "Video",  icon: "▶",   soon: true },
];

function groupSessions(sessions: Session[]) {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: Record<string, Session[]> = { Today: [], Yesterday: [], Earlier: [] };
  sessions.forEach(s => {
    const d = new Date(s.started_at);
    if (d >= today)          groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else                     groups.Earlier.push(s);
  });
  return groups;
}

function mergeProfileFromXp(p: Profile, r: XPResult): Profile {
  const ids = new Set((p.badges ?? []).map(b => b.id));
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
  return "";
}

function buildCreationContext(creations: Creation[]): string {
  if (creations.length === 0) return "";
  const parts = creations.map(c => {
    if (c.output_type === "image") return `[Image titled "${c.title}": ${c.content}]`;
    if (c.output_type === "audio") {
      try {
        const p = JSON.parse(c.content);
        const narrator  = p?.script?.narrator_text ?? "";
        const dialogues = (p?.script?.dialogues ?? [])
          .map((d: { character: string; text: string }) => `${d.character}: ${d.text}`)
          .join(" | ");
        return `[Audio titled "${c.title}": Narrator: ${narrator}. Dialogues: ${dialogues}]`;
      } catch { return `[Audio titled "${c.title}"]`; }
    }
    if (c.output_type === "slides") {
      try {
        const p = JSON.parse(c.content);
        const sections = (p?.sections ?? [])
          .map((s: { title: string; concepts: string[] }) => `${s.title}: ${s.concepts?.join(", ")}`)
          .join(" | ");
        return `[Slides titled "${c.title}": ${sections}]`;
      } catch { return `[Slides titled "${c.title}"]`; }
    }
    return `[${c.output_type} titled "${c.title}": ${c.content.slice(0, 300)}]`;
  });
  return `The student is referring to these saved creations:\n${parts.join("\n")}\n\n`;
}

export default function PlaygroundPage() {
  const router = useRouter();
  const [profile,           setProfile]           = useState<Profile | null>(null);
  const [mode]                                     = useState<PlaygroundMode>("free");
  const [input,             setInput]              = useState("");
  const [outputType,        setOutputType]         = useState<OutputType>("text");
  const [attachments,       setAttachments]        = useState<Attachment[]>([]);
  const [injectedCreations, setInjectedCreations]  = useState<Creation[]>([]);
  const [pickerOpen,        setPickerOpen]         = useState(false);
  const [saveOpen,          setSaveOpen]           = useState(false);
  const [saveContent,       setSaveContent]        = useState("");
  const [saveOutputType,    setSaveOutputType]     = useState<OutputType>("text");
  const [sessions,          setSessions]           = useState<Session[]>([]);
  const [welcomeShown,      setWelcomeShown]       = useState(false);
  // ── Gamification state ──────────────────────────────────────────────────
  const [levelUpResult,     setLevelUpResult]      = useState<XPResult | null>(null);
  const [arenaSelectorOpen, setArenaSelectorOpen]  = useState(false);
  const [xpFlash,           setXpFlash]            = useState<{ amount: number; streak: boolean } | null>(null);
  const [activeArenaId,     setActiveArenaId]      = useState(1);
  const [reducedMotion,     setReducedMotion]      = useState(false);
  const [badgeToast,        setBadgeToast]         = useState<(Badge & { earned_at: string }) | null>(null);
  const badgeQueueRef      = useRef<(Badge & { earned_at: string })[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const didInit   = useRef(false);

  const {
    messages, isStreaming, sessionId,
    startSession, loadSession,
    sendMessage, sendImage, sendAudio, sendSlides,
    reset,
  } = useChat(profile, mode);

  // ── XP / gamification (P3: live profile sync + badge toasts) ──────────
  const onBadgeUnlock = useCallback((b: Badge & { earned_at: string }) => {
    setBadgeToast(prev => {
      if (prev) {
        badgeQueueRef.current.push(b);
        return prev;
      }
      return b;
    });
  }, []);

  const dismissBadgeToast = useCallback(() => {
    setBadgeToast(() => badgeQueueRef.current.shift() ?? null);
  }, []);

  const { awardXP } = useXP(
    (result) => setLevelUpResult(result),
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

  const handleSwitchArena = async (arenaId: number) => {
    await fetch("/api/arena", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ arena_id: arenaId }),
    });
    setActiveArenaId(arenaId);
    setArenaSelectorOpen(false);
    dispatchActiveArenaChanged(arenaId);
  };

  const refreshSessions = useCallback(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(({ sessions }) =>
        setSessions((sessions ?? []).filter((s: Session) => s.message_count > 0))
      );
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => {
        if (!profile) router.replace("/dashboard/profile");
        else {
          setProfile(profile);
          setActiveArenaId(profile.active_arena ?? 1);
        }
      });
    refreshSessions();
  }, [router, refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (profile && !didInit.current) {
      didInit.current = true;
      setWelcomeShown(true);
    }
  }, [profile]); // eslint-disable-line

  const handleNewChat = useCallback(async () => {
    reset();
    setWelcomeShown(true);
    setInjectedCreations([]);
    setAttachments([]);
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
    if (!context && (outputType === "image" || outputType === "audio" || outputType === "slides")) {
      context = buildPreviousOutputContext(messages, outputType);
    }

    const enrichedText = context ? context + text : text;
    const hasContext   = !!context;

    const creationMeta = creations.map(c => c.title);
    const attFileMeta  = atts.map(a =>
      a.mimeType.startsWith("image/") ? "image"
      : a.mimeType.startsWith("audio/") ? "audio"
      : a.mimeType.startsWith("application/pdf") ? "pdf" : "file"
    );
    const bubbleMeta = [...new Set([...attFileMeta, ...creationMeta])];

    if (outputType === "image") {
      await sendImage(enrichedText, hasContext ? text : undefined, bubbleMeta);
      awardXP("generate_image").then(handleXpResult);
    } else if (outputType === "audio") {
      await sendAudio(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, bubbleMeta);
      awardXP("generate_audio").then(handleXpResult);
    } else if (outputType === "slides") {
      await sendSlides(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, bubbleMeta);
      awardXP("generate_slides").then(handleXpResult);
    } else {
      await sendMessage(enrichedText, outputType, atts, undefined, bubbleMeta);
      awardXP("generate_text").then(handleXpResult);
    }
    setTimeout(refreshSessions, 2000);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10MB)"); continue; }
      const data = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      setAttachments(prev => [...prev, { name: file.name, mimeType: file.type, data, size: file.size }]);
    }
    e.target.value = "";
  };

  const handleCreationSelect = (creation: Creation) => {
    if (injectedCreations.find(c => c.id === creation.id)) return;
    setInjectedCreations(prev => [...prev, creation]);
    const typeMap: Record<string, OutputType> = {
      image: "image", audio: "audio", slides: "slides", text: "text", json: "json",
    };
    const matched = typeMap[creation.output_type];
    if (matched) setOutputType(matched);
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

  const getWelcomeText = () => {
    if (!profile) return "";
    const g: Record<string, string> = {
      story: `Hey ${profile.display_name}! 📖 Welcome to Story Builder! What kind of story do you want to write today?`,
      code:  `Hey ${profile.display_name}! 💻 Welcome to Code Lab! What would you like to build today?`,
      art:   `Hey ${profile.display_name}! 🎨 Welcome to Art Studio! What are you imagining today?`,
      quiz:  `Hey ${profile.display_name}! 🧠 Welcome to Quiz Zone! What topic shall we explore?`,
      free:  `Hey ${profile.display_name}! 🚀 Welcome to your AI playground! What are you curious about today?`,
    };
    return g[mode] ?? g.free;
  };

  if (!profile) return (
    <div className="studio-bg flex items-center justify-center" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="dot w-3 h-3 rounded-full bg-[#C8FF00] shadow-[0_0_12px_rgba(200,255,0,0.45)]"/>
        ))}
      </div>
    </div>
  );

  const grouped = groupSessions(sessions);
  const arena   = getArena(activeArenaId);

  return (
    <div
      className="relative flex min-h-0 flex-1 overflow-hidden bg-transparent text-white"
      style={{ height: "calc(100vh - 57px)" }}
    >
      {/* ── Left sidebar ── */}
      <aside className="relative z-10 w-56 border-r border-white/[0.07] flex flex-col py-4 flex-shrink-0"
        style={{ background: "#0F0F1A" }}>
        <div className="px-3 mb-4">
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 font-display font-extrabold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97]"
            style={{
              background: arena.accent,
              color: "#08080F",
              boxShadow: `0 0 20px ${arena.accentGlow}`,
            }}>
            <Plus size={15} strokeWidth={2.5}/> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1.5 px-1">
                  {group}
                </p>
                {items.map(s => (
                  <button key={s.id} onClick={() => handleLoadSession(s)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs transition-all mb-1 border-l-[3px]",
                      s.id === sessionId
                        ? "text-white"
                        : "border-l-transparent text-white/70 hover:bg-white/[0.04]"
                    )}
                    style={s.id === sessionId ? {
                      borderLeftColor: arena.accent,
                      background: arena.accentDim,
                    } : {}}>
                    <div className="truncate font-semibold">{s.title || "Chat"}</div>
                    <div className="text-[10px] text-white/35 mt-0.5">{s.message_count} messages</div>
                  </button>
                ))}
              </div>
            )
          )}
          {sessions.length === 0 && (
            <p className="text-xs text-white/35 text-center px-2 pt-4">
              No chats yet — start a conversation!
            </p>
          )}
        </div>

        <div className="px-3 pb-2 flex-shrink-0">
          <StreakMeter
            streakDays={profile.streak_days ?? 0}
            accent={arena.accent}
            accentDim={arena.accentDim}
            accentGlow={arena.accentGlow}
          />
        </div>

        <div className="px-3 pt-3 border-t border-white/[0.07]">
          <p className="text-[10px] text-white/30 text-center">Last 10 chats saved</p>
        </div>
      </aside>

      {/* ── Main chat area (scrollable world + transcript) ── */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        {/* Sub-header — arena switcher + XP bar */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b px-4 py-2.5 backdrop-blur-xl"
          style={{ background: "rgba(15,15,26,0.9)", borderColor: "rgba(255,255,255,0.07)" }}>

          {/* Arena switcher */}
          <button
            onClick={() => setArenaSelectorOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95"
            style={{
              background:  arena.accentDim,
              borderColor: arena.accent + "40",
              color:       arena.accent,
            }}
          >
            <span className="text-base">{arena.emoji}</span>
            <span className="font-display font-black text-xs hidden sm:block">{arena.name}</span>
          </button>

          {/* XP bar */}
          <div className="flex-1 max-w-48 hidden md:block">
            <XPBar xp={profile.xp ?? 0} level={profile.level ?? 1} compact />
          </div>

          <span className="text-sm text-white/50 hidden sm:block">
            Hey, {profile.display_name}! 👋
          </span>

          <div className="ml-auto">
            <button onClick={handleNewChat}
              className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] hover:text-[#C8FF00] transition-all"
              title="New chat">
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          {activeArenaId === 6 ? (
            <CinemaWorld reducedMotion={reducedMotion} />
          ) : activeArenaId === 2 ? (
            <PromptLabWorld reducedMotion={reducedMotion} />
          ) : activeArenaId === 4 ? (
            <VisualStudioWorld reducedMotion={reducedMotion} />
          ) : activeArenaId === 5 ? (
            <SoundBoothWorld reducedMotion={reducedMotion} />
          ) : (
            <>
              <PlaygroundWorld arenaId={activeArenaId} />
              <ArenaCanvas
                arenaId={activeArenaId}
                accent={arena.accent}
                accentGlow={arena.accentGlow}
                reducedMotion={reducedMotion}
              />
              <PlaygroundFlyers arenaId={activeArenaId} />
            </>
          )}
          {/* Messages — above parallax world; bubbles stay readable with glass panels */}
          <div className="relative z-10 h-full min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {welcomeShown && messages.length === 0 && (
            <div className="flex gap-3 message-in">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-1 bg-white/[0.06] border border-white/[0.08] backdrop-blur-md">
                🧠
              </div>
              <div className="max-w-[78%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed bg-white/[0.05] border border-white/[0.09] text-white rounded-tl-sm backdrop-blur-xl">
                {getWelcomeText()}
              </div>
            </div>
          )}

          {messages.length === 0 && !welcomeShown && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-40">
              <span className="text-5xl animate-float">🧠</span>
              <p className="font-bold text-white/50 text-sm">Select a chat or start a new one</p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              avatarEmoji={profile.avatar_emoji}
              isStreaming={isStreaming && msg === messages[messages.length - 1]}
              onSave={msg.role === "assistant" ? openSave : undefined}
              arenaAccent={arena.accent}
              arenaAccentGlow={arena.accentGlow}
              arenaId={activeArenaId}
            />
          ))}
          <div ref={bottomRef}/>
          </div>
        </div>

        {/* ── Input area ── */}
        <div className="bg-[#0F0F1A] border-t border-white/[0.07] px-4 py-3 flex-shrink-0">

          {/* Chips — file attachments + injected creations */}
          {(attachments.length > 0 || injectedCreations.length > 0) && (
            <div className="flex gap-2 flex-wrap mb-2">
              {attachments.map((att, i) => {
                const isAudio = att.mimeType.startsWith("audio/");
                const isImage = att.mimeType.startsWith("image/");
                return (
                  <div key={i} className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                    isAudio
                      ? "bg-[#FF2D78]/10 border-[#FF2D78]/30 text-[#FF2D78]"
                      : "bg-white/[0.06] border-white/[0.12] text-white/70"
                  )}>
                    {isAudio ? (
                      <div className="flex items-end gap-[2px] h-3">
                        {[2,4,3,5,2,4,3].map((h, j) => (
                          <div key={j} className="w-[2px] rounded-full bg-[#FF2D78]"
                            style={{ height: `${h}px` }}/>
                        ))}
                      </div>
                    ) : isImage ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="4" cy="4" r="1" fill="currentColor"/>
                        <path d="M1 8l3-3 2 2 2-2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1z" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    )}
                    <span className="max-w-[120px] truncate">{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="opacity-60 hover:opacity-100 transition-opacity">
                      <X size={10}/>
                    </button>
                  </div>
                );
              })}
              {injectedCreations.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white font-medium border"
                  style={{ background: arena.accentDim, borderColor: arena.accent + "40", color: arena.accent }}>
                  <span>
                    {c.output_type === "image" ? "🖼" : c.output_type === "audio" ? "🎙️" : c.output_type === "slides" ? "▦" : "T"}
                  </span>
                  {c.title}
                  <button onClick={() => setInjectedCreations(prev => prev.filter(x => x.id !== c.id))}
                    className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* + button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setPickerOpen(prev => !prev)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95",
                  pickerOpen
                    ? "text-[#08080F]"
                    : "bg-white/[0.06] border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/80 hover:border-white/20"
                )}
                style={pickerOpen ? {
                  background:  arena.accent,
                  borderColor: arena.accent,
                  boxShadow:   `0 0 20px ${arena.accentGlow}`,
                } : {}}
                title="Add from My Creations"
              >
                <Plus size={18} strokeWidth={2.2}/>
              </button>
              {pickerOpen && (
                <CreationPicker
                  onSelect={handleCreationSelect}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,audio/*" className="hidden" onChange={handleFileAttach}/>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                injectedCreations.length > 0
                  ? `Ask something about your ${injectedCreations.length > 1 ? "creations" : `"${injectedCreations[0].title}"`}...`
                  : "Ask the Academy AI to create something magical..."
              }
              disabled={isStreaming}
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-[#1E1E30] text-sm text-white resize-none min-h-[44px] max-h-32 transition-all placeholder:text-white/25 focus:outline-none focus:border-[rgba(200,255,0,0.5)] focus:shadow-[0_0_0_3px_rgba(200,255,0,0.1)] disabled:opacity-50"
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="p-2.5 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 disabled:opacity-40 hover:scale-[1.02] disabled:hover:scale-100 flex-shrink-0"
              style={{ background: arena.accent, color: "#08080F", boxShadow: `0 0 20px ${arena.accentGlow}` }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9l14-7-7 14V10L2 9z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* Output format selector */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[10px] font-bold text-white/35 uppercase tracking-wider flex-shrink-0">Output:</span>
            <div className="flex gap-1.5 flex-wrap">
              {OUTPUT_FORMATS.map(fmt => (
                <button key={fmt.value}
                  onClick={() => !fmt.soon && setOutputType(fmt.value)}
                  disabled={!!fmt.soon}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95",
                    fmt.soon
                      ? "border-white/[0.06] text-white/25 cursor-not-allowed bg-white/[0.03]"
                      : outputType === fmt.value
                        ? "font-display font-extrabold"
                        : "border-white/[0.1] bg-white/[0.04] text-white/45 hover:border-white/20 hover:text-white/80"
                  )}
                  style={!fmt.soon && outputType === fmt.value ? {
                    background:  arena.accent,
                    color:       "#08080F",
                    borderColor: arena.accent,
                    boxShadow:   `0 0 14px ${arena.accentGlow}`,
                  } : {}}>
                  <span className="font-mono text-[10px]">{fmt.icon}</span>
                  {fmt.label}
                  {fmt.soon && <span className="text-[9px] text-white/25 ml-0.5">soon</span>}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-white/30 text-center mt-2">
            AI can make mistakes. Always check your work with a teacher!
          </p>
        </div>
      </div>

      {/* ── Gamification overlays ── */}
      {xpFlash && <XPFlash amount={xpFlash.amount} visible streak={xpFlash.streak}/>}

      <AnimatePresence mode="wait">
        {badgeToast && (
          <BadgeUnlockToast
            key={badgeToast.id}
            badge={badgeToast}
            accent={arena.accent}
            accentGlow={arena.accentGlow}
            onDismiss={dismissBadgeToast}
          />
        )}
      </AnimatePresence>

      {levelUpResult?.leveled_up && (
        <LevelUpModal
          result={levelUpResult}
          onClose={() => setLevelUpResult(null)}
          onSwitchArena={handleSwitchArena}
        />
      )}

      {arenaSelectorOpen && (
        <ArenaSelector
          currentLevel={profile.level ?? 1}
          activeArenaId={activeArenaId}
          onSelect={handleSwitchArena}
          onClose={() => setArenaSelectorOpen(false)}
        />
      )}

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