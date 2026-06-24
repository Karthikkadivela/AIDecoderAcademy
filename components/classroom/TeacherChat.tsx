"use client";

// Classroom Teacher chat panel — Ms. Bhavna.
// Text + Voice modes. Voice mode (AI-188) is pure-audio LIVE only: Bhavna's
// golden orb listens, thinks, and speaks — no text, no tap sub-mode, no karaoke.
// Spoken replies stream via lib/voiceTts (ElevenLabs WebSocket).
// Lecture mode lives in LecturePanel — the "Lesson" button here opens it.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, X, BookOpen, MessageSquare, PhoneOff } from "lucide-react";
import { buildClassroomGreeting } from "@/lib/teacherPanelGreeting";
import { useTeacherVoice } from "./useTeacherVoice";
import { VoiceOrb } from "@/components/aida/VoiceOrb";
import { type SpeakHandle } from "@/lib/voiceTts";
import ReactMarkdown from "react-markdown";
import type { Profile } from "@/types";

interface Props {
  profile:            Profile | null;
  chapterTitle?:      string;
  onClose:            () => void;
  /** Lifts Bhavna's speaking state up so the standee can pulse while she talks. */
  onSpeakingChange?:  (speaking: boolean) => void;
  /** Called when the student taps the "Lesson" button. */
  onOpenLecture?:     () => void;
}

type Role = "user" | "assistant";

interface Msg {
  role:      Role;
  content:   string;
  streaming?: boolean;
}

// Compact markdown styling for Bhavna's chat bubbles — keeps headings/lists/code
// readable inside a narrow panel instead of dumping raw ## / ** / ``` symbols.
const TC_MD_CSS = `
.tc-md > :first-child { margin-top: 0; }
.tc-md > :last-child  { margin-bottom: 0; }
.tc-md p              { margin: 0 0 6px; }
.tc-md ul, .tc-md ol  { margin: 0 0 6px; padding-left: 18px; }
.tc-md li             { margin: 2px 0; }
.tc-md h1, .tc-md h2, .tc-md h3 { font-weight: 700; margin: 9px 0 4px; line-height: 1.3; font-family: inherit; letter-spacing: normal; }
.tc-md h1 { font-size: 14.5px; }
.tc-md h2 { font-size: 14px; }
.tc-md h3 { font-size: 13.5px; }
.tc-md strong { font-weight: 800; }
.tc-md code   { background: rgba(255,255,255,0.12); border-radius: 4px; padding: 1px 4px; font-size: 12px; }
.tc-md pre    { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 8px 10px; overflow-x: auto; margin: 0 0 6px; }
.tc-md pre code { background: transparent; padding: 0; }
.tc-md a { color: #E0B14C; text-decoration: underline; }
`;

// Bullets sometimes arrive as the U+2212 minus sign / en-dash, which markdown
// won't parse as a list. Normalise them to real "- " bullets before rendering.
const normalizeMd = (s: string) => s.replace(/^[−–]\s/gm, "- ");

// ── Teacher palette ───────────────────────────────────────────────────────────
const NAVY_DEEP   = "#0A1230";
const NAVY_MID    = "#15224E";
const GOLD        = "#E0B14C";
const GOLD_GLOW   = "rgba(224,177,76,0.45)";
const VIOLET      = "#9D6BFF";
const VIOLET_DEEP = "#5B2BCC";
const TEXT_HI     = "#F4ECD7";
const TEXT_MID    = "rgba(244,236,215,0.78)";
const TEXT_LO     = "rgba(244,236,215,0.50)";

export function TeacherChat({ profile, chapterTitle, onClose, onSpeakingChange, onOpenLecture }: Props) {
  const [io,        setIo]        = useState<"text" | "voice">("text");
  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [input,     setInput]     = useState("");
  const [streaming, setStreaming] = useState(false);

  const scrollRef     = useRef<HTMLDivElement>(null);
  const ioRef         = useRef<"text" | "voice">("text");
  const messagesRef   = useRef<Msg[]>([]);
  const streamingRef  = useRef(false);
  const streamGenRef  = useRef(0);
  const sendAbortRef  = useRef<AbortController | null>(null);
  const sendRef       = useRef<(t?: string) => void>(() => {});

  useEffect(() => { ioRef.current = io; }, [io]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Greeting ─────────────────────────────────────────────────────────────
  const greeting = useMemo(() => {
    const lmRaw = (profile as (Profile & { learner_model?: Record<string, unknown> }) | null)
      ?.learner_model ?? null;
    return buildClassroomGreeting({
      displayName:     profile?.display_name ?? "Explorer",
      activeArena:     profile?.active_arena ?? null,
      isReturning:     ((profile as unknown as { reflection_count?: number })?.reflection_count ?? 0) > 0,
      learnerModelRaw: lmRaw,
    });
  }, [profile]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: greeting.text }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleTranscript = useCallback((t: string) => {
    sendRef.current(t);
  }, []);

  const voice = useTeacherVoice({
    onTranscript: handleTranscript,
    onInterrupt: () => {
      stopBhavnaRef.current();
      streamGenRef.current++;
      sendAbortRef.current?.abort();
      setStreaming(false); streamingRef.current = false;
      setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    },
  });

  const mutedRef = useRef(voice.muted);
  mutedRef.current = voice.muted;

  // ── Pure-audio voice mode (AI-188) ────────────────────────────────────────
  // Orb amplitude (0..1) driven by the streaming TTS AnalyserNode + the active
  // playback handle. We drive TTS directly (not voice.speak) so it streams over
  // the WebSocket player and never reveals text. setAiSpeaking bridges the live
  // VAD so barge-in still interrupts Bhavna.
  const [orbAmp, setOrbAmp] = useState(0);
  const voiceHandleRef = useRef<SpeakHandle | null>(null);
  const setAiSpeakingRef = useRef(voice.setAiSpeaking);
  setAiSpeakingRef.current = voice.setAiSpeaking;
  const [bhavnaSpeaking, setBhavnaSpeaking] = useState(false);

  const stopBhavnaAudio = useCallback(() => {
    if (voiceHandleRef.current) { try { voiceHandleRef.current.stop(); } catch { /* */ } voiceHandleRef.current = null; }
    setOrbAmp(0);
    setBhavnaSpeaking(false);
    setAiSpeakingRef.current(false);
  }, []);

  const speakBhavna = useCallback((text: string) => {
    stopBhavnaAudio();
    if (!text.trim()) return;
    // setBhavnaSpeaking(true) moved to el.onplaying — fires when audio actually plays.

    // Call tts-timed directly — same path as classroom lessons (proven reliable).
    // voiceTts.ts tries the WebSocket route first; if that ElevenLabs voice ID
    // isn't on the plan, it silently produces no audio. Direct is unambiguous.
    let active = true;
    let raf = 0, phase = 0;
    let audioEl: HTMLAudioElement | null = null;
    let resolveDone!: () => void;
    const done = new Promise<void>(r => { resolveDone = r; });

    const finish = () => {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      if (audioEl?.src.startsWith("blob:")) { try { URL.revokeObjectURL(audioEl.src); } catch { /* */ } }
      resolveDone();
    };

    const handle: SpeakHandle = {
      stop: () => { if (audioEl) { try { audioEl.pause(); } catch { /* */ } } finish(); },
      done,
    };
    voiceHandleRef.current = handle;

    (async () => {
      const MIME = "audio/mpeg";
      const canStream = typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(MIME);

      const attachHandlers = (el: HTMLAudioElement) => {
        el.onplaying = () => {
          // Audio is actually playing — now safe to show "speaking" state.
          setBhavnaSpeaking(true);
          setAiSpeakingRef.current(true);
          const tick = () => {
            if (!active) return;
            phase += 0.09;
            setOrbAmp(Math.max(0.05, Math.min(1, 0.4 + 0.22 * Math.sin(phase * 7) + 0.16 * Math.sin(phase * 13) + (Math.random() - 0.5) * 0.12)));
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        };
        el.onpause = () => { cancelAnimationFrame(raf); setOrbAmp(0); };
        el.onended = () => { setOrbAmp(0); finish(); };
        el.onerror = () => { setOrbAmp(0); finish(); };
      };

      if (!canStream) {
        // Fallback: blob-collect then play (reliable on browsers without MSE).
        const res = await fetch("/api/aida/voice", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, role: "classroom" }),
        });
        if (!active || !res.ok || !res.body) { finish(); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = ""; const parts: ArrayBuffer[] = [];
        for (;;) {
          if (!active) { try { await reader.cancel(); } catch {} break; }
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const b64 = line.slice(5).trim();
            if (!b64 || b64 === "[DONE]") continue;
            const bin = atob(b64); const ab2 = new ArrayBuffer(bin.length);
            const v = new Uint8Array(ab2);
            for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
            parts.push(ab2);
          }
        }
        if (!active || parts.length === 0) { finish(); return; }
        audioEl = new Audio(URL.createObjectURL(new Blob(parts, { type: MIME })));
        attachHandlers(audioEl);
        audioEl.play().catch(() => finish());
        return;
      }

      // MediaSource path — play() deferred until first updateend (first real chunk
      // buffered). Calling play() on an empty MediaSource rejects immediately on
      // Safari/Firefox and silently kills audio — this is the root cause of the bug.
      const ms = new MediaSource();
      audioEl = new Audio(URL.createObjectURL(ms));
      audioEl.preload = "auto";
      attachHandlers(audioEl);
      // NOTE: audioEl.play() is NOT called here — deferred to first updateend below.

      let sb: SourceBuffer | null = null;
      const msQueue: ArrayBuffer[] = [];
      let msAppending  = false;
      let streamDone   = false;
      let chunksTotal  = 0;
      let msEnded      = false;
      let playStarted  = false;

      const safeEnd = (err?: "network" | "decode") => {
        if (msEnded || ms.readyState !== "open") return;
        msEnded = true;
        try { err ? ms.endOfStream(err) : ms.endOfStream(); } catch {}
      };

      const flushQueue = () => {
        if (msAppending || msQueue.length === 0 || !sb || ms.readyState !== "open") return;
        msAppending = true;
        try { sb.appendBuffer(msQueue.shift()!); }
        catch { msAppending = false; safeEnd("decode"); }
      };

      // 5s guard: if sourceopen never fires, call finish() to unblock.
      let soTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        soTimer = null;
        if (ms.readyState !== "open") finish();
      }, 5000);

      ms.addEventListener("sourceopen", () => {
        if (soTimer) { clearTimeout(soTimer); soTimer = null; }
        if (!active) { safeEnd(); return; }
        try { sb = ms.addSourceBuffer(MIME); } catch { finish(); return; }
        sb.addEventListener("updateend", () => {
          msAppending = false;
          if (msQueue.length > 0) { flushQueue(); return; }

          // First real chunk is buffered — NOW it's safe to call play().
          if (!playStarted && chunksTotal > 0) {
            playStarted = true;
            audioEl!.play().catch(() => finish());
          }

          if (streamDone && chunksTotal > 0) safeEnd();
        });
        flushQueue();
      }, { once: true });

      try {
        const res = await fetch("/api/aida/voice", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, role: "classroom" }),
        });
        if (!active || !res.ok || !res.body) { finish(); return; }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let sseBuf = "";
        for (;;) {
          if (!active) { try { await reader.cancel(); } catch {} safeEnd(); break; }
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += dec.decode(value, { stream: true });
          const lines = sseBuf.split("\n"); sseBuf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const b64 = line.slice(5).trim();
            if (!b64 || b64 === "[DONE]") continue;
            const bin = atob(b64);
            const arrBuf = new ArrayBuffer(bin.length);
            const v = new Uint8Array(arrBuf);
            for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
            msQueue.push(arrBuf); chunksTotal++; flushQueue();
          }
        }
      } catch { /* network error — safeEnd("decode") → audio.onerror → finish() */ }
      finally {
        if (soTimer) { clearTimeout(soTimer); soTimer = null; }
        streamDone = true;
        if (!msAppending && msQueue.length === 0)
          safeEnd(chunksTotal === 0 ? "decode" : undefined);
        // If no chunks ever arrived and play() was never called, finish() must
        // be called here to unblock the session (audio.onerror may not fire
        // if the element never started loading).
        if (!playStarted && chunksTotal === 0) finish();
      }
    })().catch(() => finish());

    handle.done.finally(() => {
      if (voiceHandleRef.current === handle) {
        voiceHandleRef.current = null;
        setOrbAmp(0);
        setBhavnaSpeaking(false);
        setAiSpeakingRef.current(false);
      }
    });
  }, [stopBhavnaAudio]);
  const speakBhavnaRef = useRef(speakBhavna);
  speakBhavnaRef.current = speakBhavna;
  const stopBhavnaRef = useRef(stopBhavnaAudio);
  stopBhavnaRef.current = stopBhavnaAudio;

  useEffect(() => {
    onSpeakingChange?.(bhavnaSpeaking || voice.voiceState === "speaking");
  }, [bhavnaSpeaking, voice.voiceState, onSpeakingChange]);

  // ── Stream abort ──────────────────────────────────────────────────────────
  const abortStream = useCallback(() => {
    streamGenRef.current++;
    sendAbortRef.current?.abort();
    setStreaming(false); streamingRef.current = false;
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streamingRef.current) return;
    setInput("");

    const myGen  = ++streamGenRef.current;
    const history = messagesRef.current
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [
      ...prev,
      { role: "user",      content: text },
      { role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true); streamingRef.current = true;

    const ctrl = new AbortController();
    sendAbortRef.current = ctrl;
    try {
      const res = await fetch("/api/classroom/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  ctrl.signal,
        body: JSON.stringify({
          message:      text,
          chapterTitle: chapterTitle || "General Study",
          history,
          isVoiceMode:  ioRef.current === "voice",
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (streamGenRef.current !== myGen) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              full += parsed.content;
              // Voice mode: hold the bubble (shows "…") and reveal word-by-word
              // synced to Bhavna's audio after the stream finishes. Text mode:
              // stream straight into the bubble as it arrives.
              if (ioRef.current !== "voice") {
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: full, streaming: true };
                  return copy;
                });
              }
            }
          } catch { /* ignore malformed frame */ }
        }
      }
      if (streamGenRef.current !== myGen) return;

      const setBubble = (content: string, streaming: boolean) => {
        setMessages(prev => {
          const copy = [...prev];
          if (copy[copy.length - 1]?.role === "assistant") {
            copy[copy.length - 1] = { role: "assistant", content, streaming };
          }
          return copy;
        });
      };

      if (ioRef.current === "voice" && full.trim() && !mutedRef.current) {
        // Pure audio: stream the reply over the WebSocket player; the orb
        // animates from amplitude. No text reveal. We still write the bubble
        // (for history + a text-mode switch) but it's hidden in voice mode.
        setBubble(full, false);
        speakBhavnaRef.current(full);
      } else {
        // Text mode (or muted): show the full reply immediately.
        setBubble(full, false);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      if (streamGenRef.current !== myGen) return;
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `(Couldn't reach the teacher: ${(e as Error).message})`,
          streaming: false,
        };
        return copy;
      });
    } finally {
      if (streamGenRef.current === myGen) { setStreaming(false); streamingRef.current = false; }
    }
  }, [input, chapterTitle]);

  // Keep ref fresh every render
  sendRef.current = send;

  // ── Close + mode switch ───────────────────────────────────────────────────
  const fireReflection = useCallback(async () => {
    if (messages.length < 2) return;
    try {
      const pid = (profile as { id?: string } | null)?.id;
      if (!pid) return;
      await fetch("/api/learner-model/reflect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id:         pid,
          session_id:         null,
          surface:            "classroom_teacher",
          messages:           messages.map(m => ({ role: m.role, content: m.content })),
          metrics:            { message_count: messages.length, user_message_count: messages.filter(m => m.role === "user").length },
          session_started_at: new Date(Date.now() - 60_000).toISOString(),
          session_ended_at:   new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch { /* non-blocking */ }
  }, [messages, profile]);

  const handleClose = useCallback(() => {
    abortStream();
    stopBhavnaAudio();
    void fireReflection();
    voice.cleanup();
    onClose();
  }, [abortStream, stopBhavnaAudio, fireReflection, voice, onClose]);

  const switchIo = useCallback((next: "text" | "voice") => {
    if (next === io) return;
    abortStream();
    stopBhavnaAudio();
    voice.cleanup();
    // Voice mode is live-only now — pin the engine to live.
    if (next === "voice") voice.setSubMode("live");
    setIo(next);
  }, [io, voice, abortStream, stopBhavnaAudio]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-50 flex flex-col"
      style={{
        left:   "calc(clamp(280px, 38vh, 460px) - 24px)",
        bottom: "20px",
        width:  "min(440px, calc(100vw - 32px))",
        height: "min(620px, calc(100vh - 40px))",
        fontFamily:   "var(--font-dm-sans,'DM Sans',sans-serif)",
        borderRadius: 20,
        overflow:     "hidden",
        background: `
          radial-gradient(120% 80% at 0% 0%, ${VIOLET_DEEP}22 0%, transparent 60%),
          radial-gradient(120% 80% at 100% 100%, ${GOLD}1a 0%, transparent 55%),
          linear-gradient(170deg, ${NAVY_MID} 0%, ${NAVY_DEEP} 100%)
        `,
        border:    `1px solid ${GOLD}55`,
        boxShadow: `
          0 1px 0 ${TEXT_HI}1a inset,
          0 24px 60px -20px rgba(2,4,14,0.6),
          0 0 36px -10px ${GOLD_GLOW}
        `,
      }}
    >
      {/* Top hairline */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${GOLD}cc 32%, ${VIOLET}aa 68%, transparent 100%)` }}
      />

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
        {/* Avatar */}
        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: `1.5px solid ${GOLD}aa`, boxShadow: `0 0 12px ${GOLD_GLOW}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/classroom/teacher-bhavna.png" alt="" className="w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center 18%" }} />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="uppercase tracking-[0.18em] font-bold"
            style={{ color: GOLD, fontFamily: "var(--font-jetbrains-mono,'JetBrains Mono',monospace)", fontSize: 9 }}>
            Classroom · In Session
          </div>
          <div className="font-black leading-tight"
            style={{ color: TEXT_HI, fontFamily: "var(--font-syne,'Syne',sans-serif)", fontSize: 15 }}>
            Ms. Bhavna
          </div>
        </div>

        {/* Text / Voice toggle — shows current state highlighted */}
        {voice.voiceOK && (
          <div className="flex items-center gap-0.5 rounded-full p-0.5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {(["text", "voice"] as const).map(opt => (
              <button key={opt}
                onClick={() => switchIo(opt)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors"
                style={io === opt
                  ? { background: `linear-gradient(135deg, ${GOLD}, ${VIOLET})`, color: TEXT_HI }
                  : { color: TEXT_LO }}>
                {opt === "text" ? <MessageSquare size={11} /> : <Mic size={11} />}
                {opt === "text" ? "Text" : "Voice"}
              </button>
            ))}
          </div>
        )}

        {/* Lesson button — opens LecturePanel, not a mode toggle */}
        <button
          onClick={onOpenLecture}
          disabled={streaming}
          title="Start a guided lesson"
          className="px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: `1px solid rgba(255,255,255,0.12)`,
            color:   TEXT_HI,
            opacity: streaming ? 0.5 : 1,
          }}
        >
          <BookOpen size={12} /> Lesson
        </button>

        {/* Close — separated with extra left margin so it's not misclick-able */}
        <button
          onClick={handleClose}
          aria-label="Close"
          className="ml-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", color: TEXT_MID }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Messages (hidden in voice mode — the orb fills the panel) ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ scrollbarWidth: "thin", display: io === "voice" ? "none" : undefined }}>
        <style>{TC_MD_CSS}</style>
        {io !== "voice" && messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="rounded-2xl px-3.5 py-2.5 max-w-[85%]"
              style={{
                background: m.role === "user"
                  ? `linear-gradient(135deg, ${VIOLET_DEEP}, ${VIOLET})`
                  : `linear-gradient(180deg, ${TEXT_HI}10, ${TEXT_HI}05)`,
                border:     `1px solid ${m.role === "user" ? `${VIOLET}aa` : `${TEXT_HI}1a`}`,
                color:      TEXT_HI,
                fontSize:   13.5,
                lineHeight: 1.55,
                whiteSpace: m.role === "user" ? "pre-wrap" : "normal",
                wordBreak:  "break-word",
              }}
            >
              {m.role === "assistant"
                ? <div className="tc-md"><ReactMarkdown>{normalizeMd(m.content || (m.streaming ? "…" : ""))}</ReactMarkdown></div>
                : (m.content || (m.streaming ? "…" : ""))}
              {m.streaming && m.content && (
                <span className="inline-block w-1 h-3 ml-0.5 align-middle"
                  style={{ background: GOLD, animation: "tcblink 1s steps(2) infinite" }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Voice error chip */}
      {voice.voiceError && (
        <div className="mx-4 mb-2 text-[11px] rounded-lg px-3 py-1.5"
          style={{ color: "#FFC7CC", background: "rgba(255,87,108,0.12)", border: "1px solid rgba(255,87,108,0.35)" }}>
          {voice.voiceError}
        </div>
      )}

      {/* ── Text input row ── */}
      {io === "text" && (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-white/[0.08] flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.18)" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={streaming ? "Bhavna is typing…" : "Ask Ms. Bhavna anything…"}
            disabled={streaming}
            className="flex-1 bg-transparent outline-none text-[13.5px] px-2"
            style={{ color: TEXT_HI }}
          />
          <button
            onClick={() => void send()}
            disabled={streaming || !input.trim()}
            aria-label="Send"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              background: input.trim() && !streaming
                ? `linear-gradient(135deg, ${GOLD}, ${VIOLET})`
                : "rgba(255,255,255,0.06)",
              border:  `1px solid ${input.trim() && !streaming ? GOLD : "rgba(255,255,255,0.12)"}`,
              color:   TEXT_HI,
              opacity: streaming || !input.trim() ? 0.5 : 1,
              cursor:  streaming || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            <Send size={15} />
          </button>
        </div>
      )}

      {/* ── Voice panel ── */}
      {io === "voice" && <VoicePanel voice={voice} streaming={streaming} onSend={send} orbAmp={orbAmp} />}

      <style jsx>{`
        @keyframes tcblink { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
    </motion.div>
  );
}

// ── VoicePanel ────────────────────────────────────────────────────────────────
// Pure-audio LIVE mode (AI-188): Bhavna's golden orb listens / thinks / speaks.
// No tap sub-mode, no karaoke. Mute + a mandatory mic-live indicator + an
// "or type instead" fallback (for when STT keeps failing).
function VoicePanel({
  voice,
  streaming,
  onSend,
  orbAmp,
}: {
  voice:    ReturnType<typeof useTeacherVoice>;
  streaming: boolean;
  onSend:   (text?: string) => void;
  orbAmp:   number;
}) {
  const { liveState, muted, toggleMute, toggleLive, micStream } = voice;
  const [typeOpen,  setTypeOpen]  = useState(false);
  const [typeInput, setTypeInput] = useState("");
  const [micMuted,  setMicMuted]  = useState(false);

  // Apply mic mute to the live audio track whenever state changes.
  useEffect(() => {
    micStream?.getAudioTracks().forEach(t => { t.enabled = !micMuted; });
  }, [micMuted, micStream]);

  // Reset mic mute when the call ends.
  useEffect(() => {
    if (liveState === "idle") {
      setMicMuted(false);
      micStream?.getAudioTracks().forEach(t => { t.enabled = true; });
    }
  }, [liveState, micStream]);

  const liveLabel: Record<string, string> = {
    idle: "Tap the orb to talk 🎧", arming: "Connecting…",
    listening: "Listening… just talk", "user-speaking": "Heard you — keep going",
    "awaiting-end": "Catching the rest…", "llm-thinking": "Thinking…",
    "ai-speaking": "Speaking… (talk to interrupt)",
  };
  const active = liveState !== "idle";

  const orbState =
    liveState === "idle" || liveState === "arming" ? "idle" :
    liveState === "llm-thinking"                    ? "thinking" :
    liveState === "ai-speaking"                     ? "speaking" :
    "listening" as const; // listening · user-speaking · awaiting-end

  const GOLD     = "#E0B14C";
  const TEXT_HI  = "#F4ECD7";
  const TEXT_MID = "rgba(244,236,215,0.78)";
  const TEXT_LO  = "rgba(244,236,215,0.50)";

  return (
    <div className="flex-1 min-h-0 px-3 py-3 flex flex-col items-center justify-center gap-3"
      style={{ background: "rgba(0,0,0,0.18)" }}>

      {/* The orb fills the panel and is the button: tap to start / stop. */}
      <button
        onClick={toggleLive}
        disabled={liveState === "arming"}
        aria-label={active ? "Stop" : "Start talking to Bhavna"}
        className="rounded-full transition-transform active:scale-95 disabled:opacity-70"
        style={{ lineHeight: 0 }}>
        <VoiceOrb variant="bhavna" size={248} amplitude={orbAmp} state={orbState} />
      </button>

      <p className="text-[12px]" style={{ color: TEXT_MID }}>
        {active ? (liveLabel[liveState] ?? "") : "Tap the orb to start 🎧"}
      </p>

      {/* During a call only: mic-live indicator, stop, mute, type-fallback. */}
      {active && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: GOLD }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
              Mic is live
            </span>
            <button
              onClick={toggleLive}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: TEXT_HI }}>
              <PhoneOff size={11} /> Stop
            </button>
            <button
              onClick={toggleMute}
              title={muted ? "Unmute Bhavna" : "Mute Bhavna"}
              aria-label={muted ? "Unmute Bhavna" : "Mute Bhavna"}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${muted ? GOLD : "rgba(255,255,255,0.12)"}` }}>
              {muted ? <VolumeX size={13} color={TEXT_HI} /> : <Volume2 size={13} color={TEXT_HI} />}
            </button>
            {/* Mic mute — silences the student's own mic without stopping the call */}
            <button
              onClick={() => setMicMuted(v => !v)}
              title={micMuted ? "Unmute mic" : "Mute mic"}
              aria-label={micMuted ? "Unmute mic" : "Mute mic"}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: micMuted ? "rgba(255,45,120,0.18)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${micMuted ? "#FF2D78" : "rgba(255,255,255,0.12)"}`,
              }}>
              {micMuted ? <MicOff size={13} color="#FF2D78" /> : <Mic size={13} color={TEXT_HI} />}
            </button>
          </div>

          {!typeOpen ? (
            <button
              onClick={() => setTypeOpen(true)}
              className="text-[10px] underline underline-offset-2"
              style={{ color: TEXT_LO }}>
              or type instead
            </button>
          ) : (
            <div className="flex gap-2 items-center" style={{ width: 260 }}>
              <input
                value={typeInput}
                onChange={e => setTypeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && typeInput.trim() && !streaming) { onSend(typeInput.trim()); setTypeInput(""); }
                }}
                placeholder="Type your message…"
                disabled={streaming}
                className="flex-1 bg-transparent outline-none text-[12px] px-3 py-1.5 rounded-lg"
                style={{ border: `1px solid rgba(255,255,255,0.12)`, color: TEXT_HI, background: "rgba(255,255,255,0.04)" }}
              />
              <button
                onClick={() => { if (typeInput.trim()) { onSend(typeInput.trim()); setTypeInput(""); } }}
                disabled={streaming || !typeInput.trim()}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: typeInput.trim() && !streaming ? GOLD : "rgba(255,255,255,0.06)", opacity: (streaming || !typeInput.trim()) ? 0.5 : 1 }}>
                <Send size={12} color={typeInput.trim() && !streaming ? "#2a1c00" : TEXT_HI} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeacherChat;
