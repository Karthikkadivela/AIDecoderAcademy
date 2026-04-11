"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, X } from "lucide-react";
import { MessageBubble } from "@/components/playground/MessageBubble";
import { SaveCreationModal } from "@/components/playground/SaveCreationModal";
import { CreationPicker } from "@/components/playground/CreationPicker";
import { useChat, type Attachment } from "@/components/playground/useChat";
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
    if (d >= today)         groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else                     groups.Earlier.push(s);
  });
  return groups;
}

// Build LLM context string from injected creations
// Build context from the last assistant message of matching output type
function buildPreviousOutputContext(
  messages: Array<{ role: string; content: string; outputType?: string; isLoading?: boolean }>,
  outputType: string,
): string {
  // Find the most recent assistant message of this output type that isn't loading
  const last = [...messages]
    .reverse()
    .find(m => m.role === "assistant" && m.outputType === outputType && !m.isLoading && m.content);

  if (!last) return "";

  if (outputType === "image") {
    // Only inject if it looks like a real URL
    if (/^https?:\/\//i.test(last.content.trim())) {
      return `[Image titled "previous output": ${last.content.trim()}]

`;
    }
  }
  if (outputType === "audio") {
    try {
      const p = JSON.parse(last.content);
      const narrator  = p?.script?.narrator_text ?? "";
      const dialogues = (p?.script?.dialogues ?? [])
        .map((d: { character: string; text: string }) => `${d.character}: ${d.text}`)
        .join(" | ");
      return `[Audio titled "previous output": Narrator: ${narrator}. Dialogues: ${dialogues || "none"}]

`;
    } catch { return ""; }
  }
  if (outputType === "slides") {
    try {
      const p = JSON.parse(last.content);
      const sections = (p?.sections ?? [])
        .map((s: { title: string; concepts: string[] }) => `${s.title}: ${s.concepts?.join(", ")}`)
        .join(" | ");
      return `[Slides titled "previous output": ${sections}]

`;
    } catch { return ""; }
  }
  return "";
}

function buildCreationContext(creations: Creation[]): string {
  if (creations.length === 0) return "";
  const parts = creations.map(c => {
    if (c.output_type === "image") {
      return `[Image titled "${c.title}": ${c.content}]`;
    }
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
  const [profile,            setProfile]            = useState<Profile | null>(null);
  const [mode]                                       = useState<PlaygroundMode>("free");
  const [input,              setInput]               = useState("");
  const [outputType,         setOutputType]          = useState<OutputType>("text");
  const [attachments,        setAttachments]         = useState<Attachment[]>([]);
  const [injectedCreations,  setInjectedCreations]   = useState<Creation[]>([]);
  const [pickerOpen,         setPickerOpen]          = useState(false);
  const [saveOpen,           setSaveOpen]            = useState(false);
  const [saveContent,        setSaveContent]         = useState("");
  const [saveOutputType,     setSaveOutputType]      = useState<OutputType>("text");
  const [sessions,           setSessions]            = useState<Session[]>([]);
  const [welcomeShown,       setWelcomeShown]        = useState(false);
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
        else setProfile(profile);
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

    // Capture and clear state before async ops
    const atts     = [...attachments];
    const creations = [...injectedCreations];
    setAttachments([]);
    setInjectedCreations([]);

    // Build enriched prompt with creation context for the API
    // but keep original text for display in the message bubble
    let context = buildCreationContext(creations);

    // If no manual creation injected, auto-inject the previous output of the same type
    // so the student can say "make it darker" / "add more detail" naturally
    if (!context && (outputType === "image" || outputType === "audio" || outputType === "slides")) {
      context = buildPreviousOutputContext(messages, outputType);
    }

    const enrichedText  = context ? context + text : text;
    const hasContext    = !!context;
    // Build attachmentMeta: file types + injected creation titles
    const creationMeta  = creations.map(c => c.title);
    const attFileMeta   = atts.map(a =>
      a.mimeType.startsWith("image/") ? "image"
      : a.mimeType.startsWith("audio/") ? "audio"
      : a.mimeType.startsWith("application/pdf") ? "pdf" : "file"
    );
    // Combined meta for the bubble badge
    const bubbleMeta = [...new Set([...attFileMeta, ...creationMeta])];

    if (outputType === "image") {
      await sendImage(enrichedText, hasContext ? text : undefined, bubbleMeta);
    } else if (outputType === "audio") {
      await sendAudio(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, bubbleMeta);
    } else if (outputType === "slides") {
      await sendSlides(enrichedText, profile?.age_group ?? "11-13", hasContext ? text : undefined, bubbleMeta);
    } else {
      await sendMessage(enrichedText, outputType, atts, undefined, bubbleMeta);
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
    // Auto-switch output type to match the injected creation
    const typeMap: Record<string, OutputType> = {
      image:  "image",
      audio:  "audio",
      slides: "slides",
      text:   "text",
      json:   "json",
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
    await fetch("/api/creations", {
      method: "POST",
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

  return (
    <div className="studio-bg flex text-white" style={{ height: "calc(100vh - 57px)" }}>

      {/* ── Left sidebar ── */}
      <aside className="w-56 bg-[#0F0F1A] border-r border-white/[0.07] flex flex-col py-4 flex-shrink-0">
        <div className="px-3 mb-4">
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#C8FF00] text-[#08080F] font-display font-extrabold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(200,255,0,0.35)] active:scale-[0.97]">
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
                        ? "border-l-[#7C3AED] bg-[#7C3AED]/10 text-white"
                        : "border-l-transparent text-white/70 hover:bg-white/[0.04]"
                    )}>
                    <div className="truncate font-semibold">{s.title || "Chat"}</div>
                    <div className="text-[10px] text-white/35 mt-0.5">{s.message_count} messages</div>
                  </button>
                ))}
              </div>
            )
          )}
          {sessions.length === 0 && (
            <p className="text-xs text-slate-400 text-center px-2 pt-4">
              No chats yet — start a conversation!
            </p>
          )}
        </div>

        <div className="px-3 pt-3 border-t border-white/[0.07]">
          <p className="text-[10px] text-white/30 text-center">Last 10 chats saved</p>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Sub-header */}
        <div className="bg-[#0F0F1A]/80 border-b border-white/[0.07] px-6 py-2.5 flex items-center gap-3 flex-shrink-0 backdrop-blur-xl">
          <span className="text-lg">{profile.avatar_emoji}</span>
          <span className="font-display font-extrabold tracking-tight text-sm text-white">Hey, {profile.display_name}! 👋</span>
          <div className="ml-auto">
            <button onClick={handleNewChat}
              className="p-2 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-[#C8FF00] transition-all"
              title="New chat">
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
              <p className="font-bold text-slate-500 text-sm">Select a chat or start a new one</p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              avatarEmoji={profile.avatar_emoji}
              isStreaming={isStreaming && msg === messages[messages.length - 1]}
              onSave={msg.role === "assistant" ? openSave : undefined}
            />
          ))}
          <div ref={bottomRef}/>
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
                      ? "bg-pink-50 border-pink-200 text-pink-700"
                      : "bg-[#EEF0FF] border-purple-200 text-[#6C47FF]"
                  )}>
                    {isAudio ? (
                      <div className="flex items-center gap-1">
                        {/* Mini waveform icon */}
                        <div className="flex items-end gap-[2px] h-3">
                          {[2,4,3,5,2,4,3].map((h, j) => (
                            <div key={j} className="w-[2px] rounded-full bg-pink-400"
                              style={{ height: `${h}px` }}/>
                          ))}
                        </div>
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
                <div key={c.id} className="flex items-center gap-1.5 bg-purple-600 border border-purple-700 px-2.5 py-1 rounded-lg text-xs text-white font-medium">
                  <span className="text-purple-200">
                    {c.output_type === "image" ? "🖼" : c.output_type === "audio" ? "🎙️" : c.output_type === "slides" ? "▦" : "T"}
                  </span>
                  {c.title}
                  <button onClick={() => setInjectedCreations(prev => prev.filter(x => x.id !== c.id))}
                    className="text-purple-200 hover:text-white transition-colors">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* + button with CreationPicker popover */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setPickerOpen(prev => !prev)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95",
                  pickerOpen
                    ? "bg-[#C8FF00] border-[#C8FF00]/60 text-[#08080F] shadow-[0_0_24px_rgba(200,255,0,0.35)]"
                    : "bg-white/[0.06] border-white/[0.12] text-white/50 hover:bg-white/[0.1] hover:text-white/80 hover:border-white/20"
                )}
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
              className="p-2.5 bg-[#C8FF00] text-[#08080F] rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95 disabled:opacity-40 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(200,255,0,0.4)] disabled:hover:scale-100 disabled:hover:shadow-none flex-shrink-0"
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
                        ? "bg-[#C8FF00] text-[#08080F] border-[#C8FF00]/80 font-display font-extrabold shadow-[0_0_18px_rgba(200,255,0,0.25)]"
                        : "border-white/[0.1] bg-white/[0.04] text-white/45 hover:border-[#7C3AED]/40 hover:text-white/80"
                  )}>
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