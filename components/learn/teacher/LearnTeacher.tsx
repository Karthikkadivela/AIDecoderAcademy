"use client";

// Ms. Aria — interactive audio teacher for the Learn path.
//
// Voice architecture (same as AIDA):
//   MediaRecorder (webm/opus) → WS /api/live-voice-ws?mode=stt → Deepgram STT
//   → onFinalTranscript → /api/learn/teacher (GPT-4o-mini, 1-3 sentences)
//   → /api/aida/tts (Cartesia SSE, pcm_f32le) → Web Audio API (gapless)
//
// AudioContext is created SYNCHRONOUSLY in the click handler (Chrome autoplay policy).
// The WS + getUserMedia are kicked off immediately after.

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { LearnChapter } from "@/lib/learnPath";
import { useLiveVoiceWS } from "@/components/aida/voice/useLiveVoiceWS";
import { BlogState, BlogViewHandle } from "@/components/learn/concept/BlogView";

interface CrossSectionEntry {
  sectionId: string;
  sectionTitle: string;
  conceptCards: { title: string; hook: string }[];
}

interface Props {
  chapter: LearnChapter;
  activeSectionTitle: string;
  activeSectionId: string;
  activePhase: 1 | 2 | 3 | 4;
  activeCardQuestion?: string | null;
  /** Option texts for the current think card — used for answer detection. */
  activeCardOptions?: string[];
  /** Called when Ms. Aria detects a spoken answer — auto-selects the option. */
  onAutoSelectOption?: (idx: number) => void;
  /** Called after student gives confidence + reasoning — flips the card. */
  onRevealCard?: () => void;
  /** Blog state from phase 2 — concept cards + problem steps. */
  blogState?: BlogState | null;
  /** Ref to BlogView imperative handle for voice-driven navigation. */
  blogViewRef?: { current: BlogViewHandle | null };
  /** Navigate to a different section (cross-section recall). */
  onNavigateSection?: (sectionId: string, phase: 1 | 2 | 3 | 4) => void;
  /** All sections in the chapter with their concept cards for cross-section context. */
  crossSectionContext?: CrossSectionEntry[];
}

export interface LearnTeacherHandle {
  appreciateOption: (optionText: string) => void;
  explainHook:      (hookText: string)   => void;
  navigateBlog:     (action: string, conceptIdx?: number) => void;
}

type Turn = { role: "user" | "assistant"; content: string };

const SAMPLE_RATE = 22050;

const APPRECIATE_PHRASES = [
  "Nice choice! Now write down why you think that and check your confidence below.",
  "Love that instinct! Add your reasoning and we'll reveal the answer.",
  "Interesting pick! Share your thoughts, then let's flip the card.",
  "Bold choice! Write down your reasoning and then we'll see what the experts say.",
  "Great thinking! How confident are you? Add your notes and then hit Reveal.",
];

const PHASE_INTROS: Record<number, string> = {
  2: "Great work on the warm-up! Now let's dive deep into the actual content. Take your time reading.",
  3: "Time for the challenge round! Let's see how much you've absorbed. You've got this!",
  4: "You did it! Now let's lock in what you've learned. Save a flashcard or create an infographic!",
};

function firstTwoSentences(text: string): string {
  const m = text.match(/[^.!?]*[.!?]+(\s|$)/g);
  return m ? m.slice(0, 2).join("").trim() : text;
}

const LearnTeacher = forwardRef<LearnTeacherHandle, Props>(function LearnTeacher(
  { chapter, activeSectionTitle, activeSectionId, activePhase, activeCardQuestion, activeCardOptions, onAutoSelectOption, onRevealCard, blogState, blogViewRef, onNavigateSection, crossSectionContext },
  ref,
) {
  const { user } = useUser();
  const studentName = user?.firstName ?? "there";

  const [isOpen,     setIsOpen]     = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [currentText,setCurrentText]= useState("");
  const [history,    setHistory]    = useState<Turn[]>([]);
  const [ttsActive,  setTtsActive]  = useState(false);
  const [ttsError,   setTtsError]   = useState("");
  const [interim,    setInterim]    = useState("");
  const [isMuted,    setIsMuted]    = useState(false);
  const isMutedRef                  = useRef(false);

  // ── Component-level AudioContext (created synchronously in click handler) ──
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const playbackTimeRef  = useRef(0);
  const ttsAbortRef      = useRef<AbortController | null>(null);
  const activeSrcsRef    = useRef<AudioBufferSourceNode[]>([]);

  // ── Stable refs so callbacks don't go stale ───────────────────────────────
  const historyRef    = useRef<Turn[]>([]);
  const contextRef    = useRef({ chapter, activeSectionTitle, activePhase, activeCardQuestion, activeCardOptions, studentName });
  historyRef.current  = history;
  contextRef.current  = { chapter, activeSectionTitle, activePhase, activeCardQuestion, activeCardOptions, studentName };

  const blogStateRef  = useRef(blogState);
  blogStateRef.current = blogState;
  const onNavigateSectionRef    = useRef(onNavigateSection);
  onNavigateSectionRef.current  = onNavigateSection;
  const crossSectionContextRef  = useRef(crossSectionContext);
  crossSectionContextRef.current = crossSectionContext;

  const hasGreetedRef    = useRef(false);
  const prevPhaseRef     = useRef(activePhase);
  const prevCardRef      = useRef<string | null | undefined>(activeCardQuestion);
  // When we trigger auto-select we don't want the onOptionSelect chain to
  // fire a second appreciation phrase — the LLM reply already covers it.
  const suppressNextAppreciationRef  = useRef(false);
  // True while waiting for the student's confidence/reasoning response.
  const awaitingConfidenceRef        = useRef(false);
  const onAutoSelectRef  = useRef(onAutoSelectOption);
  const onRevealCardRef  = useRef(onRevealCard);
  onAutoSelectRef.current = onAutoSelectOption;
  onRevealCardRef.current = onRevealCard;

  const addTurn = useCallback((role: Turn["role"], content: string) => {
    setHistory(h => [...h, { role, content }]);
    historyRef.current = [...historyRef.current, { role, content }];
  }, []);

  // ── TTS — Cartesia via /api/aida/tts (SSE, pcm_f32le) ───────────────────
  function haltTts() {
    ttsAbortRef.current?.abort();
    activeSrcsRef.current.forEach(s => { try { s.stop(); } catch { /**/ } });
    activeSrcsRef.current = [];
    playbackTimeRef.current = 0;
    setTtsActive(false);
  }

  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (isMutedRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;

    haltTts();
    setTtsActive(true);
    setTtsError("");

    const abort = new AbortController();
    ttsAbortRef.current = abort;

    try {
      const res = await fetch("/api/aida/tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text, role: "learn" }),
        signal:  abort.signal,
      });
      if (!res.ok || !res.body) throw new Error(`TTS ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamDone = false;

      // Keep a local alias — TypeScript narrows out null above but loses it in closures
      const safeCtx = ctx;

      function scheduleChunk(ab: ArrayBuffer) {
        if (abort.signal.aborted) return;
        const f32 = new Float32Array(ab);
        const audioBuf = safeCtx.createBuffer(1, f32.length, SAMPLE_RATE);
        audioBuf.copyToChannel(f32, 0);
        const src = safeCtx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(safeCtx.destination);
        const startAt = Math.max(safeCtx.currentTime + 0.08, playbackTimeRef.current);
        src.start(startAt);
        playbackTimeRef.current = startAt + audioBuf.duration;
        activeSrcsRef.current.push(src);
        src.onended = () => {
          activeSrcsRef.current = activeSrcsRef.current.filter(s => s !== src);
          if (activeSrcsRef.current.length === 0 && streamDone) {
            setTtsActive(false);
          }
        };
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done || abort.signal.aborted) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as { type: string; data?: string };
            if (evt.type === "chunk" && evt.data) {
              const bin   = atob(evt.data);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              scheduleChunk(bytes.buffer);
            }
          } catch { /* malformed line */ }
        }
      }

      streamDone = true;
      if (activeSrcsRef.current.length === 0) setTtsActive(false);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("[Aria TTS]", err);
        setTtsError("Audio unavailable.");
        setTimeout(() => setTtsError(""), 3000);
      }
      setTtsActive(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── STT — useLiveVoiceWS in stt mode (Deepgram on server.js) ─────────────
  // onFinalTranscript fires when Deepgram detects end-of-utterance.
  const liveVoice = useLiveVoiceWS({
    mode: "stt",
    onFinalTranscript: (text) => { void handleStudentSpeech(text); },
    onInterrupt:       ()     => { haltTts(); },
    onError:           (err)  => { console.error("[Aria STT]", err); },
  });

  // ── Handle student speech → LLM (with answer detection) → TTS ───────────
  async function handleStudentSpeech(transcript: string) {
    if (!transcript.trim()) return;
    addTurn("user", transcript);
    setInterim("");

    liveVoice.setAiSpeaking(true);
    try {
      const ctx = contextRef.current;

      // ── Turn 2: student gave confidence + reasoning → acknowledge → reveal ──
      if (awaitingConfidenceRef.current) {
        awaitingConfidenceRef.current = false;
        const res = await fetch("/api/learn/teacher", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            history: historyRef.current.slice(-20),
            context: {
              chapterTitle:         ctx.chapter.title,
              subject:              ctx.chapter.subject,
              sectionTitle:         ctx.activeSectionTitle,
              phaseId:              ctx.activePhase,
              activeCardQuestion:   ctx.activeCardQuestion ?? undefined,
              activeCardOptions:    ctx.activeCardOptions  ?? [],
              studentName:          ctx.studentName,
              awaitingConfidenceAck: true,
            },
          }),
        });
        const t2text = await res.text();
        let reply = "Great thinking! Let's flip the card!";
        try { reply = (JSON.parse(t2text) as { reply: string }).reply ?? reply; } catch { /* keep fallback */ }
        addTurn("assistant", reply);
        setCurrentText(reply);
        await speakText(reply);
        // Flip the card after Ms. Aria finishes acknowledging
        onRevealCardRef.current?.();
        return;
      }

      // ── Turn 1: normal response + answer detection + blog nav ─────────────
      const blog = blogStateRef.current;
      const res = await fetch("/api/learn/teacher", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcript,
          history: historyRef.current.slice(-20),
          context: {
            chapterTitle:       ctx.chapter.title,
            subject:            ctx.chapter.subject,
            sectionTitle:       ctx.activeSectionTitle,
            phaseId:            ctx.activePhase,
            activeCardQuestion: ctx.activeCardQuestion ?? undefined,
            activeCardOptions:  ctx.activeCardOptions  ?? [],
            studentName:        ctx.studentName,
            // Blog context (phase 2 only)
            blogPhase:              blog?.blogPhase,
            blogConceptCardTitle:   blog?.conceptCardTitle,
            blogConceptCardHook:    blog?.conceptCardHook,
            blogConceptCardBody:    blog?.conceptCardBody,
            blogConceptCards:       blog?.conceptCards,
            blogStepInstruction:    blog?.stepInstruction,
            blogStepWhy:            blog?.stepWhy,
            blogProblemIdx:         blog?.problemIdx,
            blogStepIdx:            blog?.stepIdx,
            activeSectionId,
            crossSectionContext:    crossSectionContextRef.current,
          },
        }),
      });
      const text = await res.text();
      let data: { reply: string; answerDetected?: boolean; selectedOptionIndex?: number | null; action?: string; conceptIdx?: number; sectionId?: string };
      try {
        data = JSON.parse(text);
      } catch {
        console.error("[Aria LLM] bad JSON from route:", text);
        data = { reply: "Sorry, I didn't catch that. Can you try again?" };
      }

      addTurn("assistant", data.reply);
      setCurrentText(data.reply);

      // Blog navigation action (phase 2)
      if (data.action && ctx.activePhase === 2) {
        if (data.action === "navigate_section" && data.sectionId) {
          // Cross-section: go to that section's concept phase (2)
          onNavigateSectionRef.current?.(data.sectionId, 2 as 1 | 2 | 3 | 4);
          // If a specific concept card index was returned, navigate there after
          // BlogView mounts by letting the blog narration effect handle it naturally.
        } else {
          const bv = blogViewRef?.current;
          if (bv) {
            switch (data.action) {
              case "next_concept_card":  bv.nextConceptCard(); break;
              case "prev_concept_card":  bv.prevConceptCard(); break;
              case "go_to_concept_card": bv.goToConceptCard(data.conceptIdx ?? 0); break;
              case "start_solving":      bv.startSolving(); break;
              case "go_to_concept":      bv.goToConcept(); break;
              case "next_step":          bv.nextStep(); break;
              case "prev_step":          bv.prevStep(); break;
            }
          }
        }
      }

      if (data.answerDetected && typeof data.selectedOptionIndex === "number") {
        suppressNextAppreciationRef.current = true;
        onAutoSelectRef.current?.(data.selectedOptionIndex);
        awaitingConfidenceRef.current = true;
      }

      await speakText(data.reply);
    } catch (e) {
      console.error("[Aria LLM]", e);
    } finally {
      liveVoice.setAiSpeaking(false);
    }
  }

  // ── Imperative API (option click, hook reveal) ────────────────────────────
  useImperativeHandle(ref, () => ({
    appreciateOption(optionText: string) {
      if (!hasGreetedRef.current) return;
      // Skip if the auto-select path already handled acknowledgement
      if (suppressNextAppreciationRef.current) {
        suppressNextAppreciationRef.current = false;
        return;
      }
      const phrase = APPRECIATE_PHRASES[Math.floor(Math.random() * APPRECIATE_PHRASES.length)];
      addTurn("assistant", phrase);
      setCurrentText(phrase);
      liveVoice.setAiSpeaking(true);
      speakText(phrase).finally(() => liveVoice.setAiSpeaking(false));
    },
    explainHook(hookText: string) {
      if (!hasGreetedRef.current) return;
      setTimeout(() => {
        addTurn("assistant", hookText);
        setCurrentText(hookText);
        liveVoice.setAiSpeaking(true);
        speakText(hookText).finally(() => {
          // speakText resolves when the SSE stream closes, but Web Audio API
          // may still be playing buffered chunks. Wait for the remaining
          // scheduled playback before re-enabling the mic to avoid Deepgram
          // picking up Ms. Aria's voice from the speakers.
          const ctx = audioCtxRef.current;
          const remainingMs = ctx
            ? Math.max(0, (playbackTimeRef.current - ctx.currentTime) * 1000)
            : 0;
          setTimeout(() => liveVoice.setAiSpeaking(false), remainingMs + 300);
        });
      }, 750);
    },
    navigateBlog(action: string, conceptIdx?: number) {
      const bv = blogViewRef?.current;
      if (!bv) return;
      switch (action) {
        case "next_concept_card":  bv.nextConceptCard(); break;
        case "prev_concept_card":  bv.prevConceptCard(); break;
        case "go_to_concept_card": bv.goToConceptCard(conceptIdx ?? 0); break;
        case "start_solving":      bv.startSolving(); break;
        case "go_to_concept":      bv.goToConcept(); break;
        case "next_step":          bv.nextStep(); break;
        case "prev_step":          bv.prevStep(); break;
      }
    },
  }), [speakText, addTurn, liveVoice, blogViewRef]);

  // ── Phase transition announcements ────────────────────────────────────────
  useEffect(() => {
    if (!hasGreetedRef.current) return;
    if (activePhase === prevPhaseRef.current) return;
    prevPhaseRef.current = activePhase;
    // Phase 2 narration is handled by the blog narration effect below
    if (activePhase === 2) return;
    const msg = PHASE_INTROS[activePhase];
    if (!msg) return;
    addTurn("assistant", msg);
    setCurrentText(msg);
    liveVoice.setAiSpeaking(true);
    speakText(msg).finally(() => liveVoice.setAiSpeaking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePhase]);

  // ── Read new think cards aloud ─────────────────────────────────────────────
  useEffect(() => {
    if (!hasGreetedRef.current || activePhase !== 1) return;
    if (activeCardQuestion === prevCardRef.current) return;
    prevCardRef.current = activeCardQuestion;
    if (!activeCardQuestion) return;
    const t = setTimeout(async () => {
      const msg = `Here's one for you — ${activeCardQuestion} What do you think?`;
      addTurn("assistant", msg);
      setCurrentText(msg);
      liveVoice.setAiSpeaking(true);
      await speakText(msg);
      liveVoice.setAiSpeaking(false);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardQuestion, activePhase]);

  // ── Blog: narrate every page the student lands on (concept card or step) ──
  // Fires whenever the blog position changes — whether from a button click,
  // voice navigation, or entering the phase for the first time.
  const prevBlogNarrationKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasGreetedRef.current || activePhase !== 2) {
      prevBlogNarrationKeyRef.current = null;
      return;
    }
    if (!blogState) return;

    let key: string;
    let msg: string;

    if (blogState.blogPhase === "concept") {
      key = `concept-${blogState.conceptCardIdx}`;
      const isFirstInPhase = prevBlogNarrationKeyRef.current === null;
      msg = isFirstInPhase
        ? `Now let's learn the concepts! First up — ${blogState.conceptCardTitle}. ${blogState.conceptCardHook}`
        : `${blogState.conceptCardTitle}. ${blogState.conceptCardHook}`;
    } else {
      key = `problems-${blogState.problemIdx}-${blogState.stepIdx}`;
      const enteringProblems = !prevBlogNarrationKeyRef.current?.startsWith("problems");
      msg = enteringProblems
        ? `Great — now let's work through some problems! ${blogState.stepInstruction}`
        : blogState.stepInstruction;
    }

    if (key === prevBlogNarrationKeyRef.current) return;
    prevBlogNarrationKeyRef.current = key;

    const t = setTimeout(() => {
      if (!hasGreetedRef.current) return;
      addTurn("assistant", msg);
      setCurrentText(msg);
      liveVoice.setAiSpeaking(true);
      speakText(msg).finally(() => {
        const ctx = audioCtxRef.current;
        const remainingMs = ctx
          ? Math.max(0, (playbackTimeRef.current - ctx.currentTime) * 1000)
          : 0;
        setTimeout(() => liveVoice.setAiSpeaking(false), remainingMs + 200);
      });
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogState?.conceptCardIdx, blogState?.stepIdx, blogState?.problemIdx, blogState?.blogPhase, activePhase]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      haltTts();
      void liveVoice.stop();
      audioCtxRef.current?.close().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync liveVoice interim text to display ────────────────────────────────
  useEffect(() => {
    setInterim(liveVoice.interim);
  }, [liveVoice.interim]);

  // ── Greeting ──────────────────────────────────────────────────────────────
  async function greet() {
    setHasGreeted(true);
    hasGreetedRef.current = true;
    setIsOpen(true);

    // Start the Deepgram STT pipeline (getUserMedia + WebSocket).
    // This is called from handleAvatarClick which just ran synchronously,
    // so the browser's transient user-activation is still live for getUserMedia.
    await liveVoice.start();

    const msg = `Hey ${studentName}! Welcome to ${chapter.title}. I'm so excited to explore this with you today! I'll be here chatting with you throughout — just talk to me anytime!`;
    addTurn("assistant", msg);
    setCurrentText(msg);
    liveVoice.setAiSpeaking(true);
    await speakText(msg);
    liveVoice.setAiSpeaking(false);

    setTimeout(async () => {
      const intro = `Before we dive in, let me set the scene. ${activeSectionTitle ? `Today we're covering ${activeSectionTitle}.` : ""} Think about what you already know about ${chapter.title} — we'll build from there!`;
      addTurn("assistant", intro);
      setCurrentText(intro);
      liveVoice.setAiSpeaking(true);
      await speakText(intro);
      liveVoice.setAiSpeaking(false);
    }, 3500);
  }

  // ── Avatar click — AudioContext MUST be created synchronously here ─────────
  function handleAvatarClick() {
    if (hasGreeted) { setIsOpen(o => !o); return; }

    // Create and resume AudioContext in the SAME synchronous tick as the click.
    // Chrome refuses AudioContext.resume() if called from async code that has
    // left the user-activation window.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ACtx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new ACtx({ sampleRate: SAMPLE_RATE });
    }
    void audioCtxRef.current.resume(); // fire-and-forget — don't await

    void greet(); // async — getUserMedia + WS happen here
  }

  // ── Mute toggle ───────────────────────────────────────────────────────────
  function handleMuteToggle() {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) haltTts();
  }

  // ── Derived UI state ───────────────────────────────────────────────────────
  const liveState   = liveVoice.state;
  const isSpeaking  = ttsActive;
  const isListening = liveState === "listening" || liveState === "user-speaking";
  const isThinking  = liveState === "llm-thinking" && !ttsActive;
  const isArming    = liveState === "arming";

  const statusLabel =
    isArming    ? "Getting mic…"  :
    isSpeaking  ? "Speaking…"     :
    isThinking  ? "Thinking…"     :
    liveState === "user-speaking" ? "Heard you…"   :
    isListening ? "Listening"     : "";

  const statusColor =
    isSpeaking  ? "#F59E0B" :
    liveState === "user-speaking" ? "#60A5FA" :
    isListening ? "#10B981"       :
    isThinking  ? "#8B5CF6"       : "#94A3B8";

  const showBars = isSpeaking || isListening;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 48, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 12,  scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              width: 290, borderRadius: 20,
              background: "#FFFFFF",
              border: "1.5px solid #FDE68A",
              boxShadow: "0 8px 32px rgba(217,119,6,0.18), 0 2px 10px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 14px 10px", background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", borderBottom: "1px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#F59E0B,#D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>👩‍🏫</div>
                <div>
                  <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#1E293B" }}>Ms. Aria</div>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, color: "#92400E", fontWeight: 600 }}>{isMuted ? "Voice off • Still reading" : "Always listening • Just speak"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={handleMuteToggle} aria-pressed={isMuted} aria-label={isMuted ? "Unmute Aria" : "Mute Aria"} title={isMuted ? "Unmute Aria" : "Mute Aria"} style={{ background: "none", border: "none", cursor: "pointer", color: isMuted ? "#F59E0B" : "#94A3B8", padding: 4, display: "flex", alignItems: "center" }}>
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
              </div>
            </div>

            {/* Aria's current speech */}
            <div style={{ padding: "14px 14px 8px", minHeight: 72 }}>
              {currentText ? (
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#334155", lineHeight: 1.65, margin: 0 }}>{currentText}</p>
              ) : (
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, color: "#94A3B8", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                  {hasGreeted ? "I'm listening — just speak!" : "Tap the avatar to start chatting!"}
                </p>
              )}
            </div>

            {/* Student interim transcript */}
            <AnimatePresence>
              {interim && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ padding: "0 14px 10px" }}>
                  <div style={{ padding: "6px 10px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: "#1D4ED8", margin: 0, fontStyle: "italic" }}>
                      You: {interim}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status bar */}
            {hasGreeted && (
              <div style={{ padding: "6px 14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                {/* Soundwave bars */}
                <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
                  {[0,1,2,3,4].map(i => (
                    <motion.div key={i}
                      animate={showBars ? { height: [3, 16, 3], opacity: 1 } : { height: 3, opacity: 0.25 }}
                      transition={showBars ? { duration: 0.45 + i * 0.08, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 } : {}}
                      style={{ width: 3, borderRadius: 2, background: statusColor }}
                    />
                  ))}
                </div>
                {statusLabel && (
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                )}
                {ttsError && (
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, color: "#EF4444" }}>{ttsError}</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating avatar button */}
      <div style={{ position: "relative" }}>
        {/* Speaking pulse ring */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.55, 0.15, 0.55], scale: [1, 1.4, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "2px solid #F59E0B", pointerEvents: "none" }}
            />
          )}
        </AnimatePresence>

        {/* Listening pulse ring */}
        <AnimatePresence>
          {isListening && !isSpeaking && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0.4, 0.1, 0.4], scale: [1, 1.25, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "1.5px solid #10B981", pointerEvents: "none" }}
            />
          )}
        </AnimatePresence>

        <motion.button onClick={handleAvatarClick}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          style={{
            width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#F59E0B,#D97706)",
            boxShadow: "0 4px 16px rgba(217,119,6,0.45), 0 2px 6px rgba(0,0,0,0.12)",
            fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          }}
        >
          👩‍🏫
          {/* Green "live" dot when mic is active */}
          {hasGreeted && liveState !== "idle" && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{ position: "absolute", top: 1, right: 1, width: 13, height: 13, borderRadius: "50%", background: isListening ? "#10B981" : isSpeaking ? "#F59E0B" : "#94A3B8", border: "2px solid #fff" }}
            />
          )}
        </motion.button>

        {/* First-time tooltip */}
        <AnimatePresence>
          {!hasGreeted && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              style={{
                position: "absolute", right: 66, top: "50%", transform: "translateY(-50%)",
                background: "#FFFFFF", border: "1.5px solid #FDE68A", borderRadius: 10,
                padding: "6px 12px", whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, color: "#92400E",
              }}
            >
              👋 Chat with Ms. Aria!
              <div style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)", width: 10, height: 10, background: "#fff", borderRight: "1.5px solid #FDE68A", borderTop: "1.5px solid #FDE68A" }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

LearnTeacher.displayName = "LearnTeacher";
export default LearnTeacher;
