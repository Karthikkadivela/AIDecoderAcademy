"use client";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface Dialogue {
  character: string;
  text:      string;
  emotion?:  string;
}

interface Script {
  narrator_text: string;
  dialogues:     Dialogue[];
}

export interface AudioData {
  url:    string;
  script: Script;
}

const CHARACTER_COLORS: Record<string, string> = {
  narrator: "border-white/[0.1] bg-white/[0.06] text-white/85 backdrop-blur-sm",
  maya:     "border-[#7C3AED]/35 bg-[#7C3AED]/15 text-[#C4B5FD] backdrop-blur-sm",
  leo:      "border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#7AEFFF] backdrop-blur-sm",
  mr_chen:  "border-[#FF6B2B]/35 bg-[#FF6B2B]/12 text-[#FFB38A] backdrop-blur-sm",
  joey:     "border-[#00FF94]/25 bg-[#00FF94]/10 text-[#7BFFC4] backdrop-blur-sm",
};

const CHARACTER_EMOJI: Record<string, string> = {
  narrator: "🎙️",
  maya:     "👩",
  leo:      "👦",
  mr_chen:  "👨‍🏫",
  joey:     "🧒",
};

export function AudioPlayer({ data }: { data: AudioData }) {
  const audioRef              = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime  = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    const onLoad  = () => setDuration(audio.duration);
    const onEnd   = () => { setPlaying(false); setProgress(0); };

    audio.addEventListener("timeupdate",  onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended",       onEnd);
    return () => {
      audio.removeEventListener("timeupdate",  onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended",       onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else         { audio.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const elapsed = audioRef.current ? audioRef.current.currentTime : 0;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#FF2D78]/25 bg-[#0F0F1A]/90 shadow-[0_0_32px_rgba(255,45,120,0.12)] backdrop-blur-xl">
      {/* Player header */}
      <div className="bg-gradient-to-r from-[#1a1020] to-[#0F0F1A] px-5 py-4 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-[#FF2D78] text-[#08080F] flex items-center justify-center flex-shrink-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_24px_rgba(255,45,120,0.45)] hover:scale-[1.04] active:scale-95"
        >
          {playing
            ? <Pause size={18} className="text-[#08080F]" fill="currentColor"/>
            : <Play  size={18} className="text-[#08080F] ml-0.5" fill="currentColor"/>
          }
        </button>

        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
            onClick={seek}
          >
            <div
              className="h-full bg-[#FF2D78] rounded-full transition-all shadow-[0_0_12px_rgba(255,45,120,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/40 font-mono">
            <span>{fmt(elapsed)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <Volume2 size={16} className="text-[#FF2D78]/60 flex-shrink-0"/>
      </div>

      {/* Waveform decoration */}
      <div className="bg-[#0a0a12] px-5 pb-3 flex items-end gap-0.5 h-8">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: `${Math.max(15, Math.sin(i * 0.8) * 50 + 50) * (playing ? (Math.random() * 0.4 + 0.6) : 1)}%`,
              background: progress > (i / 40) * 100 ? "#FF2D78" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>

      {/* Script toggle */}
      <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="text-base">🎭</span>
          <span className="font-semibold text-white/75">Multi-character scene</span>
          <span className="text-white/20">·</span>
          <span>{data.script.dialogues.length} dialogues</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res  = await fetch(data.url);
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = "ai-audio.mp3";
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                window.open(data.url, "_blank");
              }
            }}
            className="text-xs font-display font-extrabold tracking-tight text-white/40 hover:text-white/80 hover:bg-white/[0.06] px-3 py-1 rounded-lg transition-all duration-200 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            MP3
          </button>
          <button
            onClick={() => setShowScript(s => !s)}
            className="text-xs font-display font-extrabold tracking-tight text-[#C8FF00] hover:bg-[#C8FF00]/10 px-3 py-1 rounded-lg transition-all duration-200"
          >
            {showScript ? "Hide" : "Show"} script
          </button>
        </div>
      </div>

      {/* Transcript */}
      {showScript && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/[0.08] pt-3 max-h-72 overflow-y-auto">
          {/* Narrator */}
          {data.script.narrator_text && (
            <div className={`flex gap-2.5 p-3 rounded-xl border ${CHARACTER_COLORS.narrator}`}>
              <span className="text-lg flex-shrink-0">{CHARACTER_EMOJI.narrator}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-60">Narrator</p>
                <p className="text-xs leading-relaxed">{data.script.narrator_text}</p>
              </div>
            </div>
          )}

          {/* Dialogues */}
          {data.script.dialogues.map((d, i) => {
            const color = CHARACTER_COLORS[d.character] ?? "border-[#FF2D78]/30 bg-[#FF2D78]/10 text-[#FF8FB8] backdrop-blur-sm";
            const emoji = CHARACTER_EMOJI[d.character] ?? "🧒";
            return (
              <div key={i} className={`flex gap-2.5 p-3 rounded-xl border ${color}`}>
                <span className="text-lg flex-shrink-0">{emoji}</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1 opacity-60">
                    {d.character.replace(/_/g, " ")}
                    {d.emotion && <span className="ml-2 normal-case opacity-50">({d.emotion})</span>}
                  </p>
                  <p className="text-xs leading-relaxed">{d.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <audio ref={audioRef} src={data.url} preload="metadata" />
    </div>
  );
}