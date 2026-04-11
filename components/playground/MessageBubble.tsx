"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { AudioPlayer, type AudioData } from "./AudioPlayer";
import { SlideCarousel, type SlideData } from "./SlideCarousel";
import type { Message } from "./useChat";
import type { OutputType } from "@/types";

interface Props {
  message:     Message;
  avatarEmoji: string;
  isStreaming?: boolean;
  onSave?:     (content: string, type: OutputType) => void;
}

const COLOR_MAP: Record<string, { ring: string; bg: string; bar: string; text: string }> = {
  cyan:   { ring: "border-[#00D4FF]/35", bg: "bg-white/[0.04]", bar: "bg-[#00D4FF] shadow-[0_0_14px_rgba(0,212,255,0.45)]", text: "text-[#7AEFFF]" },
  pink:   { ring: "border-[#FF2D78]/35", bg: "bg-white/[0.04]", bar: "bg-[#FF2D78] shadow-[0_0_14px_rgba(255,45,120,0.45)]", text: "text-[#FF8FB8]" },
  purple: { ring: "border-[#7C3AED]/40", bg: "bg-white/[0.04]", bar: "bg-[#9F67FF] shadow-[0_0_14px_rgba(159,103,255,0.45)]", text: "text-[#C4B5FD]" },
  amber:  { ring: "border-[#FF6B2B]/35", bg: "bg-white/[0.04]", bar: "bg-[#FF6B2B] shadow-[0_0_14px_rgba(255,107,43,0.4)]", text: "text-[#FFB38A]" },
};

function LoadingBubble({ outputType }: { outputType?: string }) {
  const [tick, setTick] = useState(0);
  const [barWidth, setBarWidth] = useState(8);

  const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    image:  { icon: "🎨", label: "Generating your image",      color: "cyan"   },
    audio:  { icon: "🎙️", label: "Creating your audio scene",  color: "pink"   },
    slides: { icon: "📊", label: "Building your slides",        color: "purple" },
  };

  const meta   = TYPE_META[outputType ?? ""] ?? { icon: "⚡", label: "Working on it", color: "amber" };
  const colors = COLOR_MAP[meta.color];

  useEffect(() => {
    const interval = setInterval(() => {
      setBarWidth(w => {
        if (w >= 85) return 85;
        const step = w < 40 ? 2.5 : w < 65 ? 1.2 : 0.4;
        return Math.min(85, w + step);
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(interval);
  }, []);

  const dots = ".".repeat((tick % 3) + 1).padEnd(3, "\u00a0");

  return (
    <div className={cn("w-72 rounded-2xl border p-4 space-y-3 backdrop-blur-xl", colors.ring, colors.bg)}>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl animate-bounce" style={{ animationDuration: "1.2s" }}>
          {meta.icon}
        </span>
        <div>
          <p className={cn("text-sm font-display font-extrabold leading-tight tracking-tight", colors.text)}>
            {meta.label}{dots}
          </p>
          <p className="text-xs text-white/35 mt-0.5">This takes 20–30 seconds</p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-[#1E1E30] rounded-full overflow-hidden border border-white/10">
        <div
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${barWidth}%`, transitionDuration: "600ms", transitionTimingFunction: "ease-out" }}
        />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 rounded-full bg-white/[0.06] w-full overflow-hidden"><div className="h-full w-full animate-shimmer"/></div>
        <div className="h-2.5 rounded-full bg-white/[0.06] w-4/5 overflow-hidden"><div className="h-full w-full animate-shimmer" style={{ animationDelay: "0.2s" }}/></div>
        <div className="h-2.5 rounded-full bg-white/[0.06] w-2/3 overflow-hidden"><div className="h-full w-full animate-shimmer" style={{ animationDelay: "0.4s" }}/></div>
      </div>
    </div>
  );
}

function SaveFooter({ onSave, content, outputType }: {
  onSave: (content: string, type: OutputType) => void;
  content: string;
  outputType: OutputType;
}) {
  const [saved, setSaved] = useState(false);
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
          saved
            ? "bg-[#00FF94]/15 border-[#00FF94]/40 text-[#7BFFC4]"
            : "bg-white/[0.06] border-white/[0.12] text-[#C8FF00] hover:bg-[#C8FF00] hover:text-[#08080F] hover:border-[#C8FF00]/50"
        )}
      >
        {saved ? (
          <>✓ Saved!</>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 1H3a1 1 0 00-1 1v9l4-2 4 2V2a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Save
          </>
        )}
      </button>
    </div>
  );
}

function tryParseAudio(content: string): AudioData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.url && parsed?.script?.dialogues) return parsed as AudioData;
  } catch { /* not JSON */ }
  return null;
}

function tryParseSlides(content: string): SlideData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.sections && parsed?.pptBase64) return parsed as SlideData;
  } catch { /* not JSON */ }
  return null;
}

function isImageUrl(content: string): boolean {
  return /^https?:\/\/.+\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(content.trim())
    || /^https?:\/\/.+supabase\.co.+images\/.+$/i.test(content.trim());
}

export function MessageBubble({ message, avatarEmoji, isStreaming, onSave }: Props) {
  const isUser = message.role === "user";

  const isLoading = !isUser && !!message.isLoading;
  const audioData = !isUser && !isLoading ? tryParseAudio(message.content) : null;
  const slideData = !isUser && !isLoading ? tryParseSlides(message.content) : null;
  const isImage   = !isUser && !isLoading && isImageUrl(message.content);
  const isEmpty   = message.content === "" && isStreaming && !isLoading;

  const showSave = !isUser && !isLoading && !isEmpty && !!onSave && !!message.content;

  return (
    <div className={cn("flex gap-3 message-in", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 mt-1 border backdrop-blur-md",
        isUser
          ? "border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/30 to-[#5B21B6]/20"
          : "border-white/[0.08] bg-white/[0.06]"
      )}>
        {isUser ? avatarEmoji : "🧠"}
      </div>

      {/* Content column */}
      <div className="max-w-[80%] flex flex-col">

        {/* Bubble */}
        <div className={cn(
          !audioData && !slideData && !isImage && !isLoading && (
            isUser
              ? "px-5 py-3.5 rounded-[20px] rounded-br-[4px] bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white text-sm leading-relaxed shadow-[0_12px_40px_-12px_rgba(124,58,237,0.45)]"
              : "px-5 py-3.5 rounded-[20px] rounded-bl-[4px] bg-white/[0.05] border border-white/[0.09] text-white text-sm leading-relaxed backdrop-blur-xl"
          )
        )}>

          {/* Typing dots */}
          {isEmpty && (
            <div className="px-5 py-3.5 rounded-[20px] rounded-bl-[4px] bg-white/[0.05] border border-white/[0.09] backdrop-blur-xl">
              <div className="flex gap-1.5 py-1">
                {[0,1,2].map(i => (
                  <span key={i} className="dot w-2 h-2 rounded-full bg-white/35"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {!isEmpty && isLoading && <LoadingBubble outputType={message.outputType} />}

          {/* Image */}
          {!isEmpty && isImage && (
            <div className="rounded-2xl overflow-hidden border border-white/[0.09] shadow-[0_0_32px_rgba(0,212,255,0.12)]">
              <img
                src={message.content.trim()}
                alt="Generated image"
                className="w-full max-w-sm object-cover rounded-2xl"
              />
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
                    const isFileType = item === "image" || item === "audio" || item === "pdf" || item === "file";
                    return (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/20 text-white/80">
                        {item === "image" ? (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1"/>
                            <circle cx="3" cy="3.5" r="1" fill="currentColor"/>
                            <path d="M0.5 7l2.5-2.5 2 2 1.5-1.5L9.5 7" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                          </svg>
                        ) : item === "audio" ? (
                          <div className="flex items-end gap-[1.5px]">
                            {[2,3,2,4,2,3,2].map((h, j) => (
                              <div key={j} className="w-[1.5px] rounded-full bg-white/80" style={{ height: `${h}px` }}/>
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
                  <code className="bg-[#1E1E30] text-[#C8FF00]/90 px-1.5 py-0.5 rounded-md text-xs font-mono">
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
              }}>
                {message.content}
              </ReactMarkdown>
            )
          )}
        </div>

        {/* Save footer — below every completed assistant message */}
        {showSave && (
          <SaveFooter
            onSave={onSave}
            content={message.content}
            outputType={message.outputType ?? "text"}
          />
        )}
      </div>
    </div>
  );
}