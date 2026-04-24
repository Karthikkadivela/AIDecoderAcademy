"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/playground/MessageBubble";
import type { Message } from "@/components/playground/useChat";
import type { OutputType, Creation } from "@/types";

// ── Floor output-type objects ────────────────────────────────────────────────
const OBJECTS: {
  id:        OutputType;
  label:     string;
  src:       string;
  blend:     "screen" | "normal";
  glowColor: string;
  glowRgb:   string;
}[] = [
  { id:"slides", label:"Slides",  src:"/arena1/slide.png",        blend:"screen", glowColor:"#ffb400", glowRgb:"255,180,0"   },
  { id:"audio",  label:"Audio",   src:"/arena1/headphones.png",   blend:"screen", glowColor:"#00aaff", glowRgb:"0,170,255"   },
  { id:"image",  label:"Image",   src:"/arena1/camera.png",       blend:"screen", glowColor:"#ff4488", glowRgb:"255,68,136"  },
  { id:"video",  label:"Video",   src:"/arena1/clapperboard.png", blend:"screen", glowColor:"#ff7800", glowRgb:"255,120,0"   },
  { id:"text",   label:"Text",    src:"/arena1/book.png",         blend:"normal", glowColor:"#c8a0ff", glowRgb:"200,160,255" },
  { id:"json",   label:"JSON",    src:"/arena1/jscube.png",       blend:"screen", glowColor:"#00ff64", glowRgb:"0,255,100"   },
];

// ── Shelf definitions — top % matches the 4 shelf rows in the background ────
const SHELVES: {
  types:    OutputType[];
  emoji:    string;
  label:    string;
  color:    string;
  rgb:      string;
  top:      string;   // % from top of container
}[] = [
  { types: ["image"],        emoji: "🖼️",  label: "Images",  color: "#ff4488", rgb: "255,68,136",  top: "17%" },
  { types: ["audio"],        emoji: "🎙️", label: "Audio",   color: "#00aaff", rgb: "0,170,255",   top: "35%" },
  { types: ["slides"],       emoji: "📊",  label: "Slides",  color: "#ffb400", rgb: "255,180,0",   top: "53%" },
  { types: ["text","json"],  emoji: "📝",  label: "Notes",   color: "#c8a0ff", rgb: "200,160,255", top: "69%" },
];

// ── Context formatter — mirrors buildPreviousOutputContext in playground/page ─
function buildCreationContext(c: Creation): string {
  if (c.output_type === "image") {
    const url = c.file_url ?? c.content.trim();
    return `[Image titled "${c.title}": ${url}]\n\n`;
  }
  if (c.output_type === "audio") {
    try {
      const p = JSON.parse(c.content);
      const narrator  = p?.script?.narrator_text ?? "";
      const dialogues = (p?.script?.dialogues ?? [])
        .map((d: { character: string; text: string }) => `${d.character}: ${d.text}`)
        .join(" | ");
      return `[Audio titled "${c.title}": Narrator: ${narrator}. Dialogues: ${dialogues || "none"}]\n\n`;
    } catch { return ""; }
  }
  if (c.output_type === "slides") {
    try {
      const p = JSON.parse(c.content);
      const sections = (p?.sections ?? [])
        .map((s: { title: string; concepts?: string[] }) => `${s.title}: ${s.concepts?.join(", ")}`)
        .join(" | ");
      return `[Slides titled "${c.title}": ${sections}]\n\n`;
    } catch { return ""; }
  }
  return `[${c.output_type} titled "${c.title}": ${c.content.slice(0, 300)}]\n\n`;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  profile:          { display_name: string; avatar_emoji: string; age_group: string; interests: string[] };
  sessionId:        string | null;
  messages:         Message[];
  isStreaming:      boolean;
  onSend:           (text: string, outputType: OutputType) => void;
  onNewChat:        () => void;
  onSave?:          (content: string, type: OutputType) => void;
  arenaId?:         number;
  arenaAccent?:     string;
  arenaAccentGlow?: string;
}

export function CreationsRoom({
  profile, messages, isStreaming, onSend, onSave,
  arenaId = 1, arenaAccent = "#7C3AED", arenaAccentGlow = "rgba(124,58,237,0.35)",
}: Props) {
  const [selected,   setSelected]   = useState<OutputType>("text");
  const [input,      setInput]      = useState("");
  const [creations,  setCreations]  = useState<Creation[]>([]);
  const [injected,   setInjected]   = useState<Creation | null>(null);
  const [plusOpen,   setPlusOpen]   = useState(false);
  const [plusTab,    setPlusTab]    = useState<"creations" | "upload">("creations");
  const [typeFilter, setTypeFilter] = useState<OutputType | "all">("all");

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const active    = OBJECTS.find(o => o.id === selected)!;

  // Fetch saved creations once
  useEffect(() => {
    fetch("/api/creations")
      .then(r => r.ok ? r.json() : { creations: [] })
      .then(data => setCreations(data.creations ?? []))
      .catch(() => {});
  }, []);

  // Re-fetch after a save so shelves stay fresh
  useEffect(() => {
    if (messages.length > 0) {
      fetch("/api/creations")
        .then(r => r.ok ? r.json() : { creations: [] })
        .then(data => setCreations(data.creations ?? []))
        .catch(() => {});
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [messages]);

  const send = () => {
    const t = input.trim();
    if (!t || isStreaming) return;
    const ctx     = injected ? buildCreationContext(injected) : "";
    const outType = injected ? injected.output_type : selected;
    onSend(ctx + t, outType);
    setInput("");
    setInjected(null);
    setPlusOpen(false);
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.focus({ preventScroll: true });
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canSend = input.trim().length > 0 && !isStreaming;

  const injectCreation = (c: Creation) => {
    setInjected(c);
    setSelected(c.output_type === "json" ? "json" : c.output_type as OutputType);
    setPlusOpen(false);
    taRef.current?.focus({ preventScroll: true });
  };

  // Handle local file upload — image files become data-URL context
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        // Synthesise a fake Creation object so injection works
        const fake: Creation = {
          id: "local-upload",
          profile_id: "",
          title: file.name.replace(/\.[^.]+$/, ""),
          type: "chat",
          output_type: "image",
          content: dataUrl,
          tags: [],
          is_favourite: false,
          created_at: "",
          updated_at: "",
        };
        injectCreation(fake);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Shared: message list ──────────────────────────────────────────────────
  const renderMessageList = () => (
    <div className="select-text" style={{
      flex: 1, overflowY: "auto", padding: "12px 14px 8px",
      display: "flex", flexDirection: "column", gap: 8,
      scrollbarWidth: "none", minHeight: 0,
    }}>
      {messages.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.5, pointerEvents: "none" }}>
          <span style={{ fontSize: 28 }}>✏️</span>
          <p style={{ fontSize: 11, color: arenaAccent, fontWeight: 600, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
            Click a shelf item or floor object<br/>to pick a creation, then write below
          </p>
        </div>
      )}
      {messages.map(msg => (
        <MessageBubble
          key={msg.id} message={msg} avatarEmoji={profile.avatar_emoji}
          isStreaming={isStreaming && msg === messages[messages.length - 1]}
          arenaAccent={arenaAccent} arenaAccentGlow={arenaAccentGlow} arenaId={arenaId}
          onSave={onSave}
        />
      ))}
      {isStreaming && (
        <div style={{ display: "flex", gap: 4, padding: "2px 0 2px 28px" }}>
          {[0,1,2].map(i => (
            <span key={i} className="dot" style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: arenaAccent, opacity: 0.7, animationDelay: `${i*0.15}s` }}/>
          ))}
        </div>
      )}
      <div ref={bottomRef}/>
    </div>
  );

  // ── Shared: input row ────────────────────────────────────────────────────
  const renderInputRow = (mobile = false) => (
    <div style={{ flexShrink: 0 }}>

      {/* Injected creation chip */}
      {injected && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "0 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px 4px 8px", borderRadius: 20,
            background: `rgba(${SHELVES.find(s => s.types.includes(injected.output_type))?.rgb ?? "200,160,255"},0.2)`,
            border: `1px solid rgba(${SHELVES.find(s => s.types.includes(injected.output_type))?.rgb ?? "200,160,255"},0.5)`,
            fontSize: 11, fontWeight: 600,
            color: SHELVES.find(s => s.types.includes(injected.output_type))?.color ?? "#c8a0ff",
            maxWidth: "70%",
          }}>
            <span>{SHELVES.find(s => s.types.includes(injected.output_type))?.emoji}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {injected.title}
            </span>
          </div>
          <button onClick={() => setInjected(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>
            ×
          </button>
        </div>
      )}

      <div style={{ position: "relative" }}>
        {/* Plus panel popup */}
        {plusOpen && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
            background: "rgba(10,6,28,0.97)", border: `1px solid ${arenaAccent}40`,
            borderRadius: 16, padding: 14,
            boxShadow: `0 -8px 40px rgba(0,0,0,0.5), 0 0 30px ${arenaAccent}18`,
            backdropFilter: "blur(20px)", zIndex: 50,
            maxHeight: 320, display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {(["creations","upload"] as const).map(tab => (
                <button key={tab} onClick={() => setPlusTab(tab)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    border: `1.5px solid ${plusTab === tab ? arenaAccent : "rgba(255,255,255,0.12)"}`,
                    background: plusTab === tab ? `${arenaAccent}25` : "transparent",
                    color: plusTab === tab ? arenaAccent : "rgba(255,255,255,0.4)",
                    cursor: "pointer", textTransform: "uppercase", transition: "all 0.15s",
                  }}>
                  {tab === "creations" ? "📚 My Creations" : "⬆️ Upload"}
                </button>
              ))}
              <button onClick={() => setPlusOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}>
                ×
              </button>
            </div>

            {plusTab === "creations" && (
              <>
                {/* Type filter pills */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
                  {(["all","image","audio","slides","text","json"] as const).map(f => (
                    <button key={f} onClick={() => setTypeFilter(f as OutputType | "all")}
                      style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer",
                        border: `1px solid ${typeFilter === f ? arenaAccent : "rgba(255,255,255,0.12)"}`,
                        background: typeFilter === f ? `${arenaAccent}25` : "transparent",
                        color: typeFilter === f ? arenaAccent : "rgba(255,255,255,0.35)",
                        textTransform: "uppercase", transition: "all 0.15s",
                      }}>
                      {f}
                    </button>
                  ))}
                </div>

                {/* Creations grid */}
                <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
                  {creations.filter(c => typeFilter === "all" || c.output_type === typeFilter).length === 0 ? (
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", margin: "16px 0" }}>
                      No saved creations yet
                    </p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {creations
                        .filter(c => typeFilter === "all" || c.output_type === typeFilter)
                        .slice(0, 20)
                        .map(c => {
                          const shelf = SHELVES.find(s => s.types.includes(c.output_type));
                          return (
                            <button key={c.id} onClick={() => injectCreation(c)}
                              style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                                background: `rgba(${shelf?.rgb ?? "200,160,255"},0.08)`,
                                border: `1px solid rgba(${shelf?.rgb ?? "200,160,255"},0.2)`,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = `rgba(${shelf?.rgb ?? "200,160,255"},0.2)`)}
                              onMouseLeave={e => (e.currentTarget.style.background = `rgba(${shelf?.rgb ?? "200,160,255"},0.08)`)}
                            >
                              {/* Thumbnail / icon */}
                              <div style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(${shelf?.rgb ?? "200,160,255"},0.15)` }}>
                                {c.output_type === "image" && (c.file_url || /^https?:/.test(c.content)) ? (
                                  <img src={c.file_url ?? c.content.trim()} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                                ) : (
                                  <span style={{ fontSize: 16 }}>{shelf?.emoji}</span>
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.title}
                                </p>
                                <p style={{ fontSize: 9, color: shelf?.color ?? "#c8a0ff", margin: 0, textTransform: "uppercase", fontWeight: 700, marginTop: 1 }}>
                                  {c.output_type}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </>
            )}

            {plusTab === "upload" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload}/>
                <button onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%", padding: "20px 0", borderRadius: 12, cursor: "pointer",
                    border: `2px dashed ${arenaAccent}60`,
                    background: `${arenaAccent}0a`, color: "rgba(255,255,255,0.6)",
                    fontSize: 13, fontWeight: 600, transition: "all 0.2s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${arenaAccent}18`; (e.currentTarget as HTMLElement).style.borderColor = arenaAccent; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${arenaAccent}0a`; (e.currentTarget as HTMLElement).style.borderColor = `${arenaAccent}60`; }}
                >
                  <span style={{ fontSize: 28 }}>📁</span>
                  <span>Click to upload an image</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>PNG, JPG, WEBP supported</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(10,5,50,0.65)",
          border: `2px solid rgba(${active.glowRgb},0.8)`,
          borderRadius: 40,
          padding: mobile ? "6px 8px 6px 10px" : "7px 8px 7px 12px",
          boxShadow: `0 0 24px rgba(${active.glowRgb},0.45)`,
          backdropFilter: "blur(16px)",
        }}>
          {/* + button */}
          <button
            onClick={() => setPlusOpen(v => !v)}
            title="Add context or upload"
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: plusOpen ? `${arenaAccent}40` : "rgba(255,255,255,0.08)",
              border: `1.5px solid ${plusOpen ? arenaAccent : "rgba(255,255,255,0.15)"}`,
              color: plusOpen ? arenaAccent : "rgba(255,255,255,0.5)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, lineHeight: 1, transition: "all 0.2s",
            }}
          >
            {plusOpen ? "×" : "+"}
          </button>

          <textarea
            ref={taRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              const t = e.target;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 80) + "px";
            }}
            onKeyDown={onKey}
            placeholder="What do you want to create today?"
            rows={1}
            style={{
              flex: 1, resize: "none", border: "none", outline: "none",
              background: "transparent",
              fontSize: mobile ? 14 : 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              fontFamily: "inherit",
              lineHeight: 1.5,
              overflowY: "hidden",
              caretColor: active.glowColor,
              userSelect: "text",
            }}
          />

          {/* Send button */}
          <button onClick={send} disabled={!canSend}
            style={{
              width: mobile ? 38 : 36, height: mobile ? 38 : 36,
              borderRadius: "50%", flexShrink: 0,
              background: canSend ? `rgba(${active.glowRgb},0.9)` : "rgba(255,255,255,0.1)",
              border: "none", cursor: canSend ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: canSend ? `0 0 18px rgba(${active.glowRgb},0.7)` : "none",
            }}>
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M9 2l7 7-7 7"
                stroke={canSend ? "#fff" : "rgba(255,255,255,0.25)"}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#080814" }}>

      {/* Background */}
      <img src="/arena1/empty_room.png" alt="" aria-hidden draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", pointerEvents: "none" }}
      />

      {/* ── Shelf items (large screens only) ──────────────────────────── */}
      {SHELVES.map(shelf => {
        const items = creations.filter(c => shelf.types.includes(c.output_type)).slice(0, 4);
        return (
          <div key={shelf.label}
            className="hidden lg:flex"
            style={{
              position: "absolute",
              left: "3%", top: shelf.top,
              width: "20%",
              alignItems: "flex-end",
              gap: "3%",
              zIndex: 12,
              padding: "0 2%",
            }}
          >
            {items.length === 0 ? (
              /* Empty shelf hint */
              <div style={{
                fontSize: 10, color: "rgba(255,255,255,0.18)", fontWeight: 600,
                letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "2px 6px",
              }}>
                {shelf.emoji} {shelf.label}
              </div>
            ) : (
              items.map(c => (
                <button key={c.id}
                  onClick={() => injectCreation(c)}
                  title={`Use "${c.title}"`}
                  style={{
                    flex: "0 0 auto",
                    width: "22%", minWidth: 36, maxWidth: 52,
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12) translateY(-4px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {/* Item card */}
                  <div style={{
                    width: "100%", aspectRatio: "1",
                    borderRadius: 6, overflow: "hidden",
                    background: `rgba(${shelf.rgb},0.15)`,
                    border: `1.5px solid rgba(${shelf.rgb},0.45)`,
                    boxShadow: `0 0 10px rgba(${shelf.rgb},0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {c.output_type === "image" && (c.file_url || /^https?:/.test(c.content)) ? (
                      <img src={c.file_url ?? c.content.trim()} alt={c.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    ) : (
                      <span style={{ fontSize: 18 }}>{shelf.emoji}</span>
                    )}
                  </div>
                  {/* Title */}
                  <p style={{
                    fontSize: 8, fontWeight: 700, color: shelf.color,
                    margin: 0, maxWidth: "100%",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    textShadow: `0 0 8px rgba(${shelf.rgb},0.8)`,
                  }}>
                    {c.title.slice(0, 10)}
                  </p>
                </button>
              ))
            )}
          </div>
        );
      })}

      {/* ── Sitting avatar ─────────────────────────────────────────────── */}
      <img src="/arena1/avatar.png" alt="" aria-hidden draggable={false}
        className="hidden lg:block"
        style={{
          position: "absolute", left: 0, bottom: "-8%",
          width: "50%", height: "auto",
          objectFit: "contain", objectPosition: "bottom left",
          zIndex: 15, pointerEvents: "none",
        }}
      />

      {/* ── Floor objects ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex"
        style={{
          position: "absolute", bottom: "1%", left: "28%", right: "3%",
          height: "20%", alignItems: "flex-end", justifyContent: "space-evenly",
          zIndex: 10, paddingBottom: "0.5%",
        }}
      >
        {OBJECTS.map(obj => {
          const isActive = selected === obj.id;
          return (
            <button key={obj.id} onClick={() => setSelected(obj.id)} title={obj.label}
              style={{
                flex: "0 0 auto", width: "12%", maxWidth: 90,
                background: "none", border: "none", padding: 0, cursor: "pointer",
                transition: "transform 0.25s ease",
                transform: isActive ? "scale(1.14) translateY(-5%)" : "scale(1)",
              }}>
              <img src={obj.src} alt={obj.label} draggable={false}
                style={{
                  width: "100%", height: "auto", objectFit: "contain",
                  mixBlendMode: obj.blend, display: "block",
                  filter: isActive
                    ? `brightness(1.5) drop-shadow(0 0 10px rgba(${obj.glowRgb},0.9)) drop-shadow(0 0 24px rgba(${obj.glowRgb},0.6))`
                    : "brightness(0.7) saturate(0.8)",
                  transition: "filter 0.3s ease",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Desktop chat panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col"
        style={{
          position: "absolute",
          left: "32%", top: "5%", right: "3%", bottom: "18%",
          zIndex: 20,
          background: `linear-gradient(180deg, ${arenaAccent}08 0%, transparent 40%)`,
          borderTop: `2px solid ${arenaAccent}30`,
          borderRadius: "4px 4px 0 0",
        }}
      >
        <div style={{ height: 2, flexShrink: 0, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${arenaAccent}80, ${arenaAccent}, ${arenaAccent}80, transparent)` }}/>
        {renderMessageList()}
        <div style={{ padding: "8px 12px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 6 }}>
            {OBJECTS.map(o => (
              <button key={o.id} onClick={() => setSelected(o.id)} title={o.label}
                style={{ width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer", background: selected === o.id ? o.glowColor : "rgba(0,0,0,0.15)", transition: "all 0.2s", boxShadow: selected === o.id ? `0 0 6px ${o.glowColor}` : "none" }}
              />
            ))}
          </div>
          {renderInputRow()}
        </div>
      </div>

      {/* ── Mobile + tablet overlay ────────────────────────────────────── */}
      <div className="lg:hidden absolute inset-0 z-30 flex flex-col"
        style={{ background: "rgba(8,8,20,0.97)", padding: "16px 14px 14px", gap: 10 }}>
        <div style={{ height: 2, flexShrink: 0, borderRadius: 2, marginBottom: 2, background: `linear-gradient(90deg, transparent, ${arenaAccent}80, ${arenaAccent}, ${arenaAccent}80, transparent)` }}/>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {OBJECTS.map(o => (
            <button key={o.id} onClick={() => setSelected(o.id)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${selected === o.id ? o.glowColor : "rgba(255,255,255,0.15)"}`,
                background: selected === o.id ? `rgba(${o.glowRgb},0.25)` : "transparent",
                color: selected === o.id ? o.glowColor : "rgba(255,255,255,0.4)",
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
              }}>
              {o.label}
            </button>
          ))}
        </div>
        {renderMessageList()}
        {renderInputRow(true)}
      </div>

    </div>
  );
}
