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
  purple: { ring: "border-purple-200", bg: "bg-purple-50",  bar: "bg-[#6C47FF]", text: "text-purple-700" },
  blue:   { ring: "border-blue-200",   bg: "bg-blue-50",    bar: "bg-blue-500",   text: "text-blue-700"   },
  green:  { ring: "border-green-200",  bg: "bg-green-50",   bar: "bg-green-500",  text: "text-green-700"  },
  amber:  { ring: "border-amber-200",  bg: "bg-amber-50",   bar: "bg-amber-500",  text: "text-amber-700"  },
};

function LoadingBubble({ outputType }: { outputType?: string }) {
  const [tick, setTick] = useState(0);
  const [barWidth, setBarWidth] = useState(8);

  const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    image:  { icon: "🎨", label: "Generating your image",     color: "purple" },
    audio:  { icon: "🎙️", label: "Creating your audio scene", color: "blue"   },
    slides: { icon: "📊", label: "Building your slides",       color: "green"  },
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
    <div className={cn("w-72 rounded-2xl border p-4 space-y-3", colors.ring, colors.bg)}>
      <div className="flex items-center gap-2.5">
        <span className="text-2xl animate-bounce" style={{ animationDuration: "1.2s" }}>
          {meta.icon}
        </span>
        <div>
          <p className={cn("text-sm font-bold leading-tight", colors.text)}>
            {meta.label}{dots}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">This takes 20–30 seconds</p>
        </div>
      </div>
      <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden border border-white">
        <div
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${barWidth}%`, transitionDuration: "600ms", transitionTimingFunction: "ease-out" }}
        />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 rounded-full bg-white/60 w-full animate-pulse" />
        <div className="h-2.5 rounded-full bg-white/60 w-4/5 animate-pulse" style={{ animationDelay: "0.15s" }} />
        <div className="h-2.5 rounded-full bg-white/60 w-2/3 animate-pulse" style={{ animationDelay: "0.3s" }} />
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

  const handleSave = () => {
    onSave(content, outputType);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex justify-end mt-2">
      <button
        onClick={handleSave}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
          saved
            ? "bg-green-50 border-green-200 text-green-600"
            : "bg-[#EEF0FF] border-purple-200 text-[#6C47FF] hover:bg-[#6C47FF] hover:text-white hover:border-[#6C47FF]"
        )}
      >
        {saved ? (
          <>✓ Saved!</>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 1H3a1 1 0 00-1 1v9l4-2 4 2V2a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Save to My Creations
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
        "w-9 h-9 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 mt-1",
        isUser ? "bg-brand-100" : "bg-purple-100"
      )}>
        {isUser ? avatarEmoji : "🧠"}
      </div>

      {/* Content column */}
      <div className="max-w-[80%] flex flex-col">

        {/* Bubble */}
        <div className={cn(
          !audioData && !slideData && !isImage && !isLoading && (
            isUser
              ? "px-5 py-3.5 rounded-3xl rounded-tr-md bg-brand-500 text-white text-sm leading-relaxed"
              : "px-5 py-3.5 rounded-3xl rounded-tl-md bg-white border border-slate-100 text-slate-800 text-sm leading-relaxed shadow-card"
          )
        )}>

          {/* Typing dots */}
          {isEmpty && (
            <div className="px-5 py-3.5 rounded-3xl rounded-tl-md bg-white border border-slate-100 shadow-card">
              <div className="flex gap-1.5 py-1">
                {[0,1,2].map(i => (
                  <span key={i} className="dot w-2 h-2 rounded-full bg-slate-400"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {!isEmpty && isLoading && <LoadingBubble outputType={message.outputType} />}

          {/* Image */}
          {!isEmpty && isImage && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-card">
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
                p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                code:   ({ children }) => (
                  <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-xs font-mono">
                    {children}
                  </code>
                ),
                pre:    ({ children }) => (
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto my-2">
                    {children}
                  </pre>
                ),
                ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
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