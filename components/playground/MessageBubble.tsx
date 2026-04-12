"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { AudioPlayer, type AudioData } from "./AudioPlayer";
import { SlideCarousel, type SlideData } from "./SlideCarousel";
import type { Message } from "./useChat";
import type { OutputType } from "@/types";

interface Props {
  message:      Message;
  avatarEmoji:  string;
  isStreaming?: boolean;
  onSave?:      (content: string, type: OutputType) => void;
  // Arena theme
  arenaAccent?:     string;  // e.g. "#7C3AED"
  arenaAccentGlow?: string;  // e.g. "rgba(124,58,237,0.3)"
  arenaId?:         number;
}

// Per output-type loading colours (unchanged)
const COLOR_MAP: Record<string, { ring: string; bg: string; bar: string; text: string }> = {
  cyan:   { ring: "border-[#00D4FF]/35", bg: "bg-white/[0.04]", bar: "bg-[#00D4FF] shadow-[0_0_14px_rgba(0,212,255,0.45)]",  text: "text-[#7AEFFF]"  },
  pink:   { ring: "border-[#FF2D78]/35", bg: "bg-white/[0.04]", bar: "bg-[#FF2D78] shadow-[0_0_14px_rgba(255,45,120,0.45)]", text: "text-[#FF8FB8]"  },
  purple: { ring: "border-[#7C3AED]/40", bg: "bg-white/[0.04]", bar: "bg-[#9F67FF] shadow-[0_0_14px_rgba(159,103,255,0.45)]",text: "text-[#C4B5FD]"  },
  amber:  { ring: "border-[#FF6B2B]/35", bg: "bg-white/[0.04]", bar: "bg-[#FF6B2B] shadow-[0_0_14px_rgba(255,107,43,0.4)]",  text: "text-[#FFB38A]"  },
  volt:   { ring: "border-[#C8FF00]/35", bg: "bg-white/[0.04]", bar: "bg-[#C8FF00] shadow-[0_0_14px_rgba(200,255,0,0.4)]",   text: "text-[#DEFF70]"  },
  green:  { ring: "border-[#00FF94]/35", bg: "bg-white/[0.04]", bar: "bg-[#00FF94] shadow-[0_0_14px_rgba(0,255,148,0.4)]",   text: "text-[#7BFFC4]"  },
};

// Map arena id to loading bubble color key
const ARENA_COLOR: Record<number, string> = {
  1: "purple",
  2: "cyan",
  3: "amber",
  4: "green",
  5: "pink",
  6: "volt",
};

function LoadingBubble({ outputType, arenaId }: { outputType?: string; arenaId?: number }) {
  const [tick,     setTick]     = useState(0);
  const [barWidth, setBarWidth] = useState(8);

  const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    image:  { icon: "🎨", label: "Generating your image",     color: ARENA_COLOR[arenaId ?? 1] ?? "cyan"   },
    audio:  { icon: "🎙️", label: "Creating your audio scene", color: ARENA_COLOR[arenaId ?? 1] ?? "pink"   },
    slides: { icon: "📊", label: "Building your slides",       color: ARENA_COLOR[arenaId ?? 1] ?? "purple" },
  };

  const meta   = TYPE_META[outputType ?? ""] ?? { icon: "⚡", label: "Working on it", color: ARENA_COLOR[arenaId ?? 1] ?? "amber" };
  const colors = COLOR_MAP[meta.color] ?? COLOR_MAP.purple;

  useEffect(() => {
    const iv = setInterval(() => {
      setBarWidth(w => { if (w >= 85) return 85; return Math.min(85, w + (w < 40 ? 2.5 : w < 65 ? 1.2 : 0.4)); });
    }, 600);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  const dots = ".".repeat((tick % 3) + 1).padEnd(3, "\u00a0");

  return (
    <div className={cn("w-72 rounded-2xl border p-4 space-y-3 backdrop-blur-xl", colors.ring, colors.bg)}>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl animate-bounce" style={{ animationDuration: "1.2s" }}>{meta.icon}</span>
        <div>
          <p className={cn("text-sm font-display font-extrabold leading-tight tracking-tight", colors.text)}>
            {meta.label}{dots}
          </p>
          <p className="text-xs text-white/35 mt-0.5">This takes 20–30 seconds</p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-[#1E1E30] rounded-full overflow-hidden border border-white/10">
        <div className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${barWidth}%`, transitionDuration: "600ms", transitionTimingFunction: "ease-out" }}/>
      </div>
      <div className="space-y-1.5">
        {[null, "w-4/5", "w-2/3"].map((w, i) => (
          <div key={i} className={cn("h-2.5 rounded-full bg-white/[0.06] overflow-hidden", w)}>
            <div className="h-full w-full animate-shimmer" style={{ animationDelay: `${i * 0.2}s` }}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveFooter({ onSave, content, outputType, accent, accentGlow }: {
  onSave:      (content: string, type: OutputType) => void;
  content:     string;
  outputType:  OutputType;
  accent:      string;
  accentGlow:  string;
}) {
  const [saved,     setSaved]     = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const handleSave = () => {
    setCelebrate(true);
    onSave(content, outputType);
    setSaved(true);
    setTimeout(() => setCelebrate(false), 650);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex justify-end mt-2">
      <button
        onClick={handleSave}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-extrabold tracking-tight border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-95",
          celebrate && "save-celebrate",
        )}
        style={saved ? {
          background: "rgba(0,255,148,0.12)",
          borderColor: "rgba(0,255,148,0.35)",
          color: "#7BFFC4",
        } : {
          background: "rgba(255,255,255,0.06)",
          borderColor: "rgba(255,255,255,0.12)",
          color: accent,
        }}
        onMouseEnter={e => {
          if (!saved) {
            (e.currentTarget as HTMLElement).style.background = accent;
            (e.currentTarget as HTMLElement).style.color = "#08080F";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${accentGlow}`;
          }
        }}
        onMouseLeave={e => {
          if (!saved) {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLElement).style.color = accent;
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }
        }}
      >
        {saved ? <>✓ Saved!</> : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 1H3a1 1 0 00-1 1v9l4-2 4 2V2a1 1 0 00-1-1z"
                stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Save
          </>
        )}
      </button>
    </div>
  );
}

function tryParseAudio(c: string): AudioData | null {
  try { const p = JSON.parse(c); if (p?.url && p?.script?.dialogues) return p as AudioData; } catch {}
  return null;
}
function tryParseSlides(c: string): SlideData | null {
  try { const p = JSON.parse(c); if (p?.sections && p?.pptBase64) return p as SlideData; } catch {}
  return null;
}
function isImageUrl(c: string): boolean {
  return /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(c.trim())
    || /^https?:\/\/.+supabase\.co.+images\/.+$/i.test(c.trim());
}

export function MessageBubble({
  message, avatarEmoji, isStreaming, onSave,
  arenaAccent     = "#7C3AED",
  arenaAccentGlow = "rgba(124,58,237,0.35)",
  arenaId         = 1,
}: Props) {
  const isUser = message.role === "user";

  const isLoading = !isUser && !!message.isLoading;
  const audioData = !isUser && !isLoading ? tryParseAudio(message.content)  : null;
  const slideData = !isUser && !isLoading ? tryParseSlides(message.content) : null;
  const isImage   = !isUser && !isLoading && isImageUrl(message.content);
  const isEmpty   = message.content === "" && isStreaming && !isLoading;
  const showSave  = !isUser && !isLoading && !isEmpty && !!onSave && !!message.content;

  // Derive a readable text colour for the user bubble
  // Volt yellow and cyan are dark-text; others are white-text
  const darkTextArenas = new Set([2, 4, 6]); // cyan, green, volt
  const userTextColor  = darkTextArenas.has(arenaId) ? "#08080F" : "#ffffff";

  return (
    <div className={cn("flex gap-3 message-in", isUser && "flex-row-reverse")}>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 mt-1 border backdrop-blur-md flex-shrink-0"
        style={isUser ? {
          background:  `${arenaAccent}28`,
          borderColor: `${arenaAccent}55`,
        } : {
          background:  "rgba(255,255,255,0.06)",
          borderColor: "rgba(255,255,255,0.09)",
        }}
      >
        {isUser ? avatarEmoji : "🧠"}
      </div>

      {/* Content column */}
      <div className="max-w-[80%] flex flex-col">

        {/* Bubble */}
        <div className={cn(
          !audioData && !slideData && !isImage && !isLoading && (
            isUser
              ? "px-5 py-3.5 rounded-[20px] rounded-br-[4px] text-sm leading-relaxed"
              : "px-5 py-3.5 rounded-[20px] rounded-bl-[4px] bg-white/[0.05] border border-white/[0.09] text-white text-sm leading-relaxed backdrop-blur-xl"
          )
        )}
          style={!audioData && !slideData && !isImage && !isLoading && isUser ? {
            background: `linear-gradient(135deg, ${arenaAccent}, ${arenaAccent}cc)`,
            color:      userTextColor,
            boxShadow:  `0 12px 40px -12px ${arenaAccentGlow}`,
          } : {}}
        >

          {/* Typing dots */}
          {isEmpty && (
            <div className="px-5 py-3.5 rounded-[20px] rounded-bl-[4px] bg-white/[0.05] border border-white/[0.09] backdrop-blur-xl">
              <div className="flex gap-1.5 py-1">
                {[0,1,2].map(i => (
                  <span key={i} className="dot w-2 h-2 rounded-full bg-white/35"
                    style={{ animationDelay: `${i * 0.15}s` }}/>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {!isEmpty && isLoading && <LoadingBubble outputType={message.outputType} arenaId={arenaId} />}

          {/* Image */}
          {!isEmpty && isImage && (
            <div className="rounded-2xl overflow-hidden border border-white/[0.09]"
              style={{ boxShadow: `0 0 32px ${arenaAccentGlow}` }}>
              <img src={message.content.trim()} alt="Generated image"
                className="w-full max-w-sm object-cover rounded-2xl"/>
            </div>
          )}

          {/* Audio */}
          {!isEmpty && audioData && <AudioPlayer data={audioData} />}

          {/* Slides */}
          {!isEmpty && slideData && <SlideCarousel data={slideData} />}

          {/* Plain text */}
          {!isEmpty && !isLoading && !isImage && !audioData && !slideData && (
            isUser ? (
              <div>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.attachmentMeta && message.attachmentMeta.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {message.attachmentMeta.map((item, i) => {
                      const isFileType = ["image","audio","pdf","file"].includes(item);
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{ background: "rgba(255,255,255,0.18)", color: userTextColor }}>
                          {item === "image" ? (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <rect x=".5" y=".5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1"/>
                              <circle cx="3" cy="3.5" r="1" fill="currentColor"/>
                              <path d="M.5 7l2.5-2.5 2 2 1.5-1.5L9.5 7" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                            </svg>
                          ) : item === "audio" ? (
                            <div className="flex items-end gap-[1.5px]">
                              {[2,3,2,4,2,3,2].map((h, j) => (
                                <div key={j} className="w-[1.5px] rounded-full" style={{ height: `${h}px`, background: userTextColor }}/>
                              ))}
                            </div>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M6 1H2.5a1 1 0 00-1 1v6a1 1 0 001 1h5a1 1 0 001-1V3.5L6 1z" stroke="currentColor" strokeWidth="1"/>
                              <path d="M6 1v2.5h2.5" stroke="currentColor" strokeWidth="1"/>
                            </svg>
                          )}
                          {isFileType ? `${item} attached` : item}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <ReactMarkdown components={{
                p:      ({ children }) => <p className="mb-2 last:mb-0 text-white/90">{children}</p>,
                code:   ({ children }) => (
                  <code className="bg-[#1E1E30] px-1.5 py-0.5 rounded-md text-xs font-mono"
                    style={{ color: arenaAccent }}>
                    {children}
                  </code>
                ),
                pre:    ({ children }) => (
                  <pre className="bg-[#0F0F1A] text-white/90 p-4 rounded-2xl text-xs font-mono overflow-x-auto my-2 border border-white/[0.08]">
                    {children}
                  </pre>
                ),
                ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-white/85">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-white/85">{children}</ol>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                a:      ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="underline" style={{ color: arenaAccent }}>{children}</a>
                ),
              }}>
                {message.content}
              </ReactMarkdown>
            )
          )}
        </div>

        {/* Save footer */}
        {showSave && (
          <SaveFooter
            onSave={onSave}
            content={message.content}
            outputType={message.outputType ?? "text"}
            accent={arenaAccent}
            accentGlow={arenaAccentGlow}
          />
        )}
      </div>
    </div>
  );
}