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

    // Prepend creation context if any were injected
    const context      = buildCreationContext(creations);
    const enrichedText = context ? context + text : text;

    if (outputType === "image") {
      await sendImage(enrichedText);
    } else if (outputType === "audio") {
      await sendAudio(enrichedText, profile?.age_group ?? "11-13");
    } else if (outputType === "slides") {
      await sendSlides(enrichedText, profile?.age_group ?? "11-13");
    } else {
      await sendMessage(enrichedText, outputType, atts);
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
    <div className="flex items-center justify-center bg-[#F5F6FF]" style={{ height: "calc(100vh - 57px)" }}>
      <div className="flex gap-2">
        {[0,1,2].map(i => <div key={i} className="dot w-3 h-3 rounded-full bg-[#6C47FF]"/>)}
      </div>
    </div>
  );

  const grouped = groupSessions(sessions);

  return (
    <div className="flex bg-[#F5F6FF]" style={{ height: "calc(100vh - 57px)" }}>

      {/* ── Left sidebar ── */}
      <aside className="w-56 bg-white border-r border-purple-100 flex flex-col py-4 flex-shrink-0">
        <div className="px-3 mb-4">
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-200">
            <Plus size={15}/> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {Object.entries(grouped).map(([group, items]) =>
            items.length === 0 ? null : (
              <div key={group}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                  {group}
                </p>
                {items.map(s => (
                  <button key={s.id} onClick={() => handleLoadSession(s)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs transition-all mb-1",
                      s.id === sessionId
                        ? "bg-[#EEF0FF] text-[#6C47FF]"
                        : "text-slate-600 hover:bg-slate-50"
                    )}>
                    <div className="truncate font-semibold">{s.title || "Chat"}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.message_count} messages</div>
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

        <div className="px-3 pt-3 border-t border-purple-100">
          <p className="text-[10px] text-slate-400 text-center">Last 10 chats saved</p>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Sub-header */}
        <div className="bg-white border-b border-purple-100 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
          <span className="text-lg">{profile.avatar_emoji}</span>
          <span className="font-bold text-[#1a1a2e] text-sm">Hey, {profile.display_name}! 👋</span>
          <div className="ml-auto">
            <button onClick={handleNewChat}
              className="p-2 rounded-xl text-slate-400 hover:bg-purple-50 hover:text-[#6C47FF] transition-all"
              title="New chat">
              <RefreshCw size={16}/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {welcomeShown && messages.length === 0 && (
            <div className="flex gap-3 message-in">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-1 bg-purple-100">
                🧠
              </div>
              <div className="max-w-[78%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed bg-white border border-purple-100 text-slate-800 rounded-tl-sm shadow-sm">
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
        <div className="bg-white border-t border-purple-100 px-4 py-3 flex-shrink-0">

          {/* Chips — file attachments + injected creations */}
          {(attachments.length > 0 || injectedCreations.length > 0) && (
            <div className="flex gap-2 flex-wrap mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[#EEF0FF] border border-purple-200 px-2.5 py-1 rounded-lg text-xs text-[#6C47FF] font-medium">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V4L7 1z" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  {att.name}
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                    <X size={10}/>
                  </button>
                </div>
              ))}
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
                  "p-2.5 rounded-xl border transition-all",
                  pickerOpen
                    ? "bg-[#6C47FF] border-[#6C47FF] text-white"
                    : "border-slate-200 text-slate-400 hover:border-[#6C47FF] hover:text-[#6C47FF]"
                )}
                title="Add from My Creations"
              >
                <Plus size={18}/>
              </button>
              {pickerOpen && (
                <CreationPicker
                  onSelect={handleCreationSelect}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileAttach}/>

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
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-[#6C47FF] focus:outline-none focus:ring-2 focus:ring-purple-100 text-sm resize-none min-h-[44px] max-h-32 transition-all placeholder:text-slate-300"
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="p-2.5 bg-[#6C47FF] hover:bg-[#5538ee] text-white rounded-xl transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-purple-200 flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9l14-7-7 14V10L2 9z" fill="white"/>
              </svg>
            </button>
          </div>

          {/* Output format selector */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Output:</span>
            <div className="flex gap-1.5 flex-wrap">
              {OUTPUT_FORMATS.map(fmt => (
                <button key={fmt.value}
                  onClick={() => !fmt.soon && setOutputType(fmt.value)}
                  disabled={!!fmt.soon}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                    fmt.soon
                      ? "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50"
                      : outputType === fmt.value
                        ? "bg-[#6C47FF] text-white border-[#6C47FF]"
                        : "border-slate-200 text-slate-500 hover:border-[#6C47FF] hover:text-[#6C47FF]"
                  )}>
                  <span className="font-mono text-[10px]">{fmt.icon}</span>
                  {fmt.label}
                  {fmt.soon && <span className="text-[9px] text-slate-300 ml-0.5">soon</span>}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-2">
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