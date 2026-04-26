"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/playground/MessageBubble";
import type { Message } from "@/components/playground/useChat";
import type { OutputType, Creation } from "@/types";

// ── Output-type colour registry ──────────────────────────────────────────────
const OUTPUT_META: Record<string, { glowColor: string; glowRgb: string }> = {
  slides: { glowColor: "#ffb400", glowRgb: "255,180,0"   },
  audio:  { glowColor: "#00aaff", glowRgb: "0,170,255"   },
  image:  { glowColor: "#ff4488", glowRgb: "255,68,136"  },
  video:  { glowColor: "#ff7800", glowRgb: "255,120,0"   },
  text:   { glowColor: "#c8a0ff", glowRgb: "200,160,255" },
  json:   { glowColor: "#00ff64", glowRgb: "0,255,100"   },
};

// ── Left-shelf hotspot zones — transparent click areas over the type labels ──
// Positioned to match the AUDIO/IMAGE/VIDEO/SCRIPT/TEXT/SLIDE lit zones
// in empty_room.png (left bookcase, 2 cols × 3 rows)
const SHELF_HOTSPOTS: {
  id: OutputType; label: string;
  glowColor: string; glowRgb: string;
  top: string; height: string; left: string; width: string;
}[] = [
  { id:"audio",  label:"AUDIO",  glowColor:"#00aaff", glowRgb:"0,170,255",   top:"7%",  height:"18%", left:"0.5%", width:"9.5%" },
  { id:"image",  label:"IMAGE",  glowColor:"#ff4488", glowRgb:"255,68,136",  top:"7%",  height:"18%", left:"11%",  width:"9.5%" },
  { id:"video",  label:"VIDEO",  glowColor:"#ff7800", glowRgb:"255,120,0",   top:"28%", height:"17%", left:"0.5%", width:"9.5%" },
  { id:"json",   label:"SCRIPT", glowColor:"#00ff64", glowRgb:"0,255,100",   top:"28%", height:"17%", left:"11%",  width:"9.5%" },
  { id:"text",   label:"TEXT",   glowColor:"#c8a0ff", glowRgb:"200,160,255", top:"48%", height:"17%", left:"0.5%", width:"9.5%" },
  { id:"slides", label:"SLIDE",  glowColor:"#ffb400", glowRgb:"255,180,0",   top:"48%", height:"17%", left:"11%",  width:"9.5%" },
];

// ── Center shelf rows — empty shelves in the right column of the bookcase ────
// Creations from the selected hotspot type are displayed here (2 per row × 6 rows = 12 slots)
const CENTER_SHELF_ROWS: { top: string; height: string }[] = [
  { top: "8%",  height: "13%" },
  { top: "20%", height: "13%" },
  { top: "32%", height: "13%" },
  { top: "44%", height: "13%" },
  { top: "56%", height: "13%" },
  { top: "68%", height: "13%" },
];

// ── Floor objects (left → right across the floor) ────────────────────────────
// Note: spilled_paint is decorative only (rendered alongside brush_stand, not here)
// `vw` — viewport-relative width for the floor button (no px caps, fully responsive)
const FLOOR_OBJECTS: {
  key: string; id: OutputType; label: string; src: string;
  blend: "screen" | "normal"; glowColor: string; glowRgb: string;
  vw: string; // responsive width, e.g. "9vw"
}[] = [
  { key:"phones", id:"audio",  label:"Audio",  src:"/arena1/headphones.png",   blend:"screen", glowColor:"#00aaff", glowRgb:"0,170,255",   vw:"10vw"  },
  { key:"slide",  id:"slides", label:"Slides", src:"/arena1/slide.png",         blend:"normal", glowColor:"#ffb400", glowRgb:"255,180,0",   vw:"15vw" },
  { key:"book",   id:"text",   label:"Text",   src:"/arena1/book.png",          blend:"normal", glowColor:"#c8a0ff", glowRgb:"200,160,255", vw:"8vw" },
  { key:"camera", id:"image",  label:"Image",  src:"/arena1/camera.png",        blend:"screen", glowColor:"#ff4488", glowRgb:"255,68,136",  vw:"8vw" },
  { key:"clap",   id:"video",  label:"Video",  src:"/arena1/clapperboard.png",  blend:"screen", glowColor:"#ff7800", glowRgb:"255,120,0",   vw:"10vw" },
  { key:"js",     id:"json",   label:"JSON",   src:"/arena1/jscube.png",        blend:"screen", glowColor:"#00ff64", glowRgb:"0,255,100",   vw:"10vw" },
];

// Simple list used for the output-type dot row and mobile pill selectors
const OUTPUT_TYPES: { id: OutputType; label: string }[] = [
  { id: "image",  label: "Image"  },
  { id: "audio",  label: "Audio"  },
  { id: "slides", label: "Slides" },
  { id: "text",   label: "Text"   },
  { id: "video",  label: "Video"  },
  { id: "json",   label: "JSON"   },
];

// ── Context formatter ────────────────────────────────────────────────────────
function buildCreationContext(c: Creation): string {
  if (c.output_type === "image") {
    return `[Image titled "${c.title}": ${c.file_url ?? c.content.trim()}]\n\n`;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId: _sessionId, onNewChat: _onNewChat,
}: Props) {
  const [selected,         setSelected]         = useState<OutputType>("text");
  const [selectedShelfType, setSelectedShelfType] = useState<OutputType | null>(null);
  const [input,            setInput]            = useState("");
  const [creations,        setCreations]        = useState<Creation[]>([]);
  const [injected,         setInjected]         = useState<Creation | null>(null);
  const [plusOpen,         setPlusOpen]         = useState(false);

  const scrollRefDesktop = useRef<HTMLDivElement>(null);   // desktop message list
  const scrollRefMobile  = useRef<HTMLDivElement>(null);   // mobile message list
  const taRef     = useRef<HTMLTextAreaElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const activeMeta = OUTPUT_META[selected] ?? OUTPUT_META.text;

  useEffect(() => {
    fetch("/api/creations")
      .then(r => r.ok ? r.json() : { creations: [] })
      .then(data => setCreations(data.creations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      fetch("/api/creations")
        .then(r => r.ok ? r.json() : { creations: [] })
        .then(data => setCreations(data.creations ?? []))
        .catch(() => {});
    }
  }, [messages.length]);

  // Scroll both message containers (desktop + mobile) to the bottom after every update.
  // renderMessageList() is called twice in the JSX, so we need two separate refs.
  // requestAnimationFrame ensures the DOM has painted before we measure scrollHeight.
  useEffect(() => {
    requestAnimationFrame(() => {
      [scrollRefDesktop, scrollRefMobile].forEach(ref => {
        if (ref.current) {
          ref.current.scrollTop = ref.current.scrollHeight;
        }
      });
    });
  }, [messages, isStreaming]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => {
        const fake: Creation = {
          id: "local-upload", profile_id: "",
          title: file.name.replace(/\.[^.]+$/, ""),
          type: "chat", output_type: "image",
          content: ev.target?.result as string,
          tags: [], is_favourite: false, created_at: "", updated_at: "",
        };
        injectCreation(fake);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // ── Message list ─────────────────────────────────────────────────────────
  const renderMessageList = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div ref={ref} className="select-text" style={{
      flex: 1, overflowY: "auto", padding: "12px 14px 8px",
      display: "flex", flexDirection: "column", gap: 8,
      scrollbarWidth: "none", minHeight: 0,
    }}>
      {messages.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.5, pointerEvents: "none" }}>
          <span style={{ fontSize: 28 }}>✏️</span>
          <p style={{ fontSize: 11, color: arenaAccent, fontWeight: 600, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
            Click a shelf type or floor object,<br/>then write below
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
    </div>
  );

  // ── Input row ─────────────────────────────────────────────────────────────
  const renderInputRow = (mobile = false) => (
    <div style={{ flexShrink: 0 }}>
      {injected && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "0 4px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px 4px 8px", borderRadius: 20,
            background: `rgba(${OUTPUT_META[injected.output_type]?.glowRgb ?? "200,160,255"},0.2)`,
            border: `1px solid rgba(${OUTPUT_META[injected.output_type]?.glowRgb ?? "200,160,255"},0.5)`,
            fontSize: 11, fontWeight: 600,
            color: OUTPUT_META[injected.output_type]?.glowColor ?? "#c8a0ff",
            maxWidth: "70%",
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{injected.title}</span>
          </div>
          <button onClick={() => setInjected(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>
            ×
          </button>
        </div>
      )}

      <div style={{ position: "relative" }}>
        {plusOpen && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
            background: "rgba(10,6,28,0.97)", border: `1px solid ${arenaAccent}40`,
            borderRadius: 16, padding: 14,
            boxShadow: `0 -8px 40px rgba(0,0,0,0.5), 0 0 30px ${arenaAccent}18`,
            backdropFilter: "blur(20px)", zIndex: 50,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upload Image</span>
              <button onClick={() => setPlusOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1 }}>
                ×
              </button>
            </div>
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

        {/* Input bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(10,5,50,0.65)",
          border: `2px solid rgba(${activeMeta.glowRgb},0.8)`,
          borderRadius: 40,
          padding: mobile ? "6px 8px 6px 10px" : "7px 8px 7px 12px",
          boxShadow: `0 0 24px rgba(${activeMeta.glowRgb},0.45)`,
          backdropFilter: "blur(16px)",
        }}>
          <button onClick={() => setPlusOpen(v => !v)} title="Add context or upload"
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: plusOpen ? `${arenaAccent}40` : "rgba(255,255,255,0.08)",
              border: `1.5px solid ${plusOpen ? arenaAccent : "rgba(255,255,255,0.15)"}`,
              color: plusOpen ? arenaAccent : "rgba(255,255,255,0.5)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, lineHeight: 1, transition: "all 0.2s",
            }}>
            {plusOpen ? "×" : "+"}
          </button>

          <textarea ref={taRef} value={input}
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
              background: "transparent", fontSize: mobile ? 14 : 13, fontWeight: 500,
              color: "rgba(255,255,255,0.92)", fontFamily: "inherit",
              lineHeight: 1.5, overflowY: "hidden",
              caretColor: activeMeta.glowColor, userSelect: "text",
            }}
          />

          <button onClick={send} disabled={!canSend}
            style={{
              width: mobile ? 38 : 36, height: mobile ? 38 : 36,
              borderRadius: "50%", flexShrink: 0,
              background: canSend ? `rgba(${activeMeta.glowRgb},0.9)` : "rgba(255,255,255,0.1)",
              border: "none", cursor: canSend ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: canSend ? `0 0 18px rgba(${activeMeta.glowRgb},0.7)` : "none",
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

      {/* Background room */}
      <img src="/arena1/empty_room.png" alt="" aria-hidden draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }}
      />

      {/* ── Left shelf hotspot zones (desktop only) ──────────────────────── */}
      {/*   Transparent buttons overlaid on the AUDIO/IMAGE/VIDEO/SCRIPT/    */}
      {/*   TEXT/SLIDE lit areas in the bookcase background                   */}
      <div className="hidden lg:block" style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none" }}>
        {SHELF_HOTSPOTS.map(hz => (
          <button
            key={hz.id}
            onClick={() => setSelectedShelfType(prev => prev === hz.id ? null : hz.id)}
            title={`Browse ${hz.label}`}
            style={{
              position: "absolute",
              top: hz.top, left: hz.left, width: hz.width, height: hz.height,
              background: "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          />
        ))}
      </div>

      {/* ── Center shelf creations (desktop only) ────────────────────────── */}
      {/*   Shows 2 creations per shelf row for the selected hotspot type.   */}
      {/*   Positioned on the empty-shelf column of the bookcase (~22-37%).  */}
      {selectedShelfType && (() => {
        const meta = OUTPUT_META[selectedShelfType];
        const filtered = creations.filter(c => c.output_type === selectedShelfType);
        return (
          <div
            className="hidden lg:block"
            style={{ position: "absolute", left: "22%", top: 0, width: "16%", height: "92%", zIndex: 13 }}
          >
            {CENTER_SHELF_ROWS.map((row, rowIdx) => {
              const pair = filtered.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <div key={rowIdx} style={{
                  position: "absolute",
                  top: row.top, height: row.height, left: "5%", right: "5%",
                  display: "flex", alignItems: "center", gap: "6%",
                }}>
                  {[0, 1].map(slot => {
                    const c = pair[slot];
                    if (!c) {
                      // Empty slot — subtle placeholder
                      return (
                        <div key={slot} style={{
                          flex: 1, height: "75%",
                          borderRadius: 6,
                          border: `1px dashed rgba(${meta.glowRgb},0.18)`,
                        }} />
                      );
                    }
                    return (
                      <button
                        key={c.id}
                        onClick={() => injectCreation(c)}
                        title={`Use "${c.title}"`}
                        style={{
                          flex: 1, height: "75%",
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                          transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1) translateY(-4px)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        {/* Thumbnail card */}
                        <div style={{
                          width: "100%", flex: 1,
                          borderRadius: 6, overflow: "hidden",
                          background: `rgba(${meta.glowRgb},0.15)`,
                          border: `1.5px solid rgba(${meta.glowRgb},0.5)`,
                          boxShadow: `0 0 10px rgba(${meta.glowRgb},0.3)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {c.output_type === "image" && (c.file_url || /^https?:/.test(c.content)) ? (
                            <img
                              src={c.file_url ?? c.content.trim()} alt={c.title}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 18 }}>
                              {c.output_type === "audio" ? "🎙️" : c.output_type === "slides" ? "📊" : c.output_type === "image" ? "🖼️" : "📝"}
                            </span>
                          )}
                        </div>
                        {/* Title */}
                        <p style={{
                          fontSize: 7, fontWeight: 700, margin: 0,
                          color: meta.glowColor, maxWidth: "100%",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          textShadow: `0 0 8px rgba(${meta.glowRgb},0.8)`,
                        }}>
                          {c.title.slice(0, 10)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Brush stand — absolutely pinned to visible floor gap (left of whiteboard) ── */}
      <div className="hidden lg:block" style={{
        position: "absolute", bottom: "5%", left: "20%",
        width: "25vw", zIndex: 10, pointerEvents: "none",
      }}>
        <img src="/shelf/brush_stand.png" alt="" aria-hidden draggable={false}
          style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", filter: "brightness(0.85)" }}
        />
      </div>

      {/* ── Spilled paint — absolutely pinned next to brush stand ── */}
      <div className="hidden lg:block" style={{
        position: "absolute", bottom: "7%", left: "15%",
        width: "30vw", zIndex: 10, pointerEvents: "none",
      }}>
        <img src="/shelf/spilled_paint.png" alt="" aria-hidden draggable={false}
          style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", filter: "brightness(0.85)" }}
        />
      </div>

      {/* ── Interactive floor objects — flex row below the whiteboard ── */}
      <div className="hidden lg:flex"
        style={{
          position: "absolute", bottom: "7%", left: "35%", right: "2%",
          height: "30%", alignItems: "flex-end", justifyContent: "space-evenly",
          zIndex: 10, paddingBottom: "0.5%",
        }}
      >
        {FLOOR_OBJECTS.map(obj => {
          const isActive = selected === obj.id;
          // Slides monitor sits slightly high due to image padding — nudge it down
          const baseTransform = obj.key === "slide" ? "translateY(30%)" : "scale(1)";
          return (
            <button key={obj.key} onClick={() => setSelected(obj.id)} title={obj.label}
              style={{
                flex: "0 0 auto", width: obj.vw,
                background: "none", border: "none", padding: 0, cursor: "pointer",
                transition: "transform 0.25s ease",
                transform: isActive ? `scale(1.14) translateY(-5%)` : baseTransform,
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

      {/* ── Desktop chat panel — overlaid on the whiteboard ─────────────── */}
      <div className="hidden lg:flex flex-col"
        style={{
          position: "absolute",
          left: "42%", top: "10%", right: "2%", bottom: "24%",
          zIndex: 20,
          background: "transparent",
        }}
      >
        {renderMessageList(scrollRefDesktop)}
        <div style={{ padding: "8px 12px 12px", flexShrink: 0 }}>
          {/* Output-type dot row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 6 }}>
            {OUTPUT_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelected(t.id)} title={t.label}
                style={{
                  width: 8, height: 8, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                  background: selected === t.id ? (OUTPUT_META[t.id]?.glowColor ?? "#fff") : "rgba(0,0,0,0.2)",
                  transition: "all 0.2s",
                  boxShadow: selected === t.id ? `0 0 6px ${OUTPUT_META[t.id]?.glowColor}` : "none",
                }}
              />
            ))}
          </div>
          {renderInputRow()}
        </div>
      </div>

      {/* ── Mobile + tablet overlay ──────────────────────────────────────── */}
      <div className="lg:hidden absolute inset-0 z-30 flex flex-col"
        style={{ background: "rgba(8,8,20,0.97)", padding: "16px 14px 14px", gap: 10 }}>
        <div style={{ height: 2, flexShrink: 0, borderRadius: 2, marginBottom: 2, background: `linear-gradient(90deg, transparent, ${arenaAccent}80, ${arenaAccent}, ${arenaAccent}80, transparent)` }}/>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {OUTPUT_TYPES.map(t => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${selected === t.id ? (OUTPUT_META[t.id]?.glowColor ?? "#fff") : "rgba(255,255,255,0.15)"}`,
                background: selected === t.id ? `rgba(${OUTPUT_META[t.id]?.glowRgb ?? "200,160,255"},0.25)` : "transparent",
                color: selected === t.id ? (OUTPUT_META[t.id]?.glowColor ?? "#fff") : "rgba(255,255,255,0.4)",
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {renderMessageList(scrollRefMobile)}
        {renderInputRow(true)}
      </div>

    </div>
  );
}
