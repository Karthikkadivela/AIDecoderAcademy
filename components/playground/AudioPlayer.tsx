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
  narrator: "bg-slate-100 text-slate-700 border-slate-200",
  maya:     "bg-purple-50 text-purple-700 border-purple-200",
  leo:      "bg-blue-50 text-blue-700 border-blue-200",
  mr_chen:  "bg-amber-50 text-amber-700 border-amber-200",
  joey:     "bg-green-50 text-green-700 border-green-200",
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
    <div className="w-full rounded-2xl overflow-hidden border border-purple-100 bg-white shadow-sm">
      {/* Player header */}
      <div className="bg-[#1a1a2e] px-5 py-4 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-[#6C47FF] hover:bg-[#5538ee] flex items-center justify-center flex-shrink-0 transition-all shadow-lg shadow-purple-900/40 active:scale-95"
        >
          {playing
            ? <Pause size={18} className="text-white" fill="white"/>
            : <Play  size={18} className="text-white ml-0.5" fill="white"/>
          }
        </button>

        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
            onClick={seek}
          >
            <div
              className="h-full bg-[#6C47FF] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/40 font-mono">
            <span>{fmt(elapsed)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <Volume2 size={16} className="text-white/40 flex-shrink-0"/>
      </div>

      {/* Waveform decoration */}
      <div className="bg-[#1a1a2e] px-5 pb-3 flex items-end gap-0.5 h-8">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: `${Math.max(15, Math.sin(i * 0.8) * 50 + 50) * (playing ? (Math.random() * 0.4 + 0.6) : 1)}%`,
              background: progress > (i / 40) * 100 ? "#6C47FF" : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>

      {/* Script toggle */}
      <div className="px-5 py-3 border-t border-purple-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-base">🎭</span>
          <span className="font-semibold">Multi-character scene</span>
          <span className="text-slate-300">·</span>
          <span>{data.script.dialogues.length} dialogues</span>
        </div>
        <button
          onClick={() => setShowScript(s => !s)}
          className="text-xs font-bold text-[#6C47FF] hover:bg-[#EEF0FF] px-3 py-1 rounded-lg transition-all"
        >
          {showScript ? "Hide" : "Show"} script
        </button>
      </div>

      {/* Transcript */}
      {showScript && (
        <div className="px-5 pb-5 space-y-3 border-t border-purple-50 pt-3 max-h-72 overflow-y-auto">
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
            const color = CHARACTER_COLORS[d.character] ?? "bg-pink-50 text-pink-700 border-pink-200";
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