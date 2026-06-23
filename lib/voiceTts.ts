"use client";

// Shared client-side voice playback for AIDA / SAGE / Bhavna audio mode.
//
// Pure audio — NO text/karaoke. This is the replacement for the old per-sentence
// `/api/aida/tts-timed` + word-timing reveal path. It does two things:
//
//   1. Streams audio with the lowest latency available:
//        • PRIMARY  → POST /api/aida/voice  (ElevenLabs WebSocket stream-input,
//          one continuous MP3 fed into a MediaSource SourceBuffer — gapless,
//          first audio ~75ms).
//        • FALLBACK → POST /api/aida/tts     (sentence-chunked SSE; here we just
//          concatenate the chunks and play once). Used when MediaSource/`audio/mpeg`
//          is unsupported or the WS route fails — the kid is never left in silence.
//
//   2. Drives the VoiceOrb animation: routes the playing audio through a Web
//      Audio AnalyserNode and reports a 0..1 amplitude every frame.
//
// One AudioContext is shared across calls. It is resumed on first use — voice
// mode always begins from a user gesture (mic tap), so autoplay policy is satisfied.

export type VoiceRole = "aida" | "teacher" | "classroom";

export interface SpeakHandle {
  /** Stop immediately — barge-in, mute, or teardown. Idempotent. */
  stop: () => void;
  /** Resolves when playback ends naturally OR is stopped. */
  done: Promise<void>;
}

interface SpeakOpts {
  role?: VoiceRole;
  /** Live voice level 0..1 each frame, for the orb. */
  onAmplitude?: (level: number) => void;
  /** Fired once when audio actually begins playing. */
  onStart?: () => void;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function speak(text: string, opts: SpeakOpts = {}): SpeakHandle {
  const role = opts.role ?? "aida";
  const clean = (text ?? "").trim();

  let stopped = false;
  const abort = new AbortController();
  const audio = new Audio();
  audio.preload = "auto";

  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  // Orb amplitude — driven SYNTHETICALLY while the audio is playing. We do NOT
  // route the <audio> element through a Web Audio AnalyserNode: that capture
  // (createMediaElementSource) redirects the element's output into the audio
  // graph, and if the AudioContext is suspended the result is total silence.
  // Reliable playback matters more than a true waveform, so the element plays
  // straight to the speakers and the orb pulses from a lively oscillator.
  let raf = 0;
  let playing = false;
  let phase = 0;
  const animate = () => {
    if (stopped) return;
    if (playing && opts.onAmplitude) {
      phase += 0.09;
      const a = 0.4 + 0.22 * Math.sin(phase * 7) + 0.16 * Math.sin(phase * 13)
        + (Math.random() - 0.5) * 0.12;
      opts.onAmplitude(Math.max(0.05, Math.min(1, a)));
    }
    raf = requestAnimationFrame(animate);
  };
  if (opts.onAmplitude) raf = requestAnimationFrame(animate);

  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    try { opts.onAmplitude?.(0); } catch { /* */ }
    try { abort.abort(); } catch { /* */ }
    try { audio.pause(); } catch { /* */ }
    if (audio.src.startsWith("blob:")) { try { URL.revokeObjectURL(audio.src); } catch { /* */ } }
    resolveDone();
  };

  audio.onended  = cleanup;
  audio.onerror  = cleanup;
  audio.onpause  = () => { playing = false; };
  audio.onplaying = () => { playing = true; opts.onStart?.(); };

  if (!clean) { cleanup(); return { stop: cleanup, done }; }

  (async () => {
    const ok = await streamViaWebSocket(clean, role, audio, abort.signal, () => stopped);
    if (stopped) return;
    if (!ok) await playViaFallback(clean, role, audio, abort.signal, () => stopped);
  })().catch(() => { if (!stopped) cleanup(); });

  return { stop: cleanup, done };
}

// ── PRIMARY: ElevenLabs WebSocket stream → MediaSource (gapless) ────────────
async function streamViaWebSocket(
  text: string, role: VoiceRole, audio: HTMLAudioElement,
  signal: AbortSignal, isStopped: () => boolean,
): Promise<boolean> {
  if (typeof MediaSource === "undefined" || !MediaSource.isTypeSupported("audio/mpeg")) return false;

  let res: Response;
  try {
    res = await fetch("/api/aida/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, role }),
      signal,
    });
  } catch { return false; }
  if (!res.ok || !res.body) return false;

  const ms = new MediaSource();
  audio.src = URL.createObjectURL(ms);

  let sb: SourceBuffer;
  try {
    sb = await new Promise<SourceBuffer>((resolve, reject) => {
      ms.addEventListener("sourceopen", () => {
        try { resolve(ms.addSourceBuffer("audio/mpeg")); } catch (e) { reject(e); }
      }, { once: true });
    });
  } catch { return false; }

  const queue: Uint8Array[] = [];
  let appending = false;
  let streamEnded = false;
  let started = false;

  const pump = () => {
    if (appending || sb.updating) return;
    const chunk = queue.shift();
    if (chunk) {
      appending = true;
      try { sb.appendBuffer(chunk as BufferSource); } catch { appending = false; }
    } else if (streamEnded && ms.readyState === "open") {
      try { ms.endOfStream(); } catch { /* already ended */ }
    }
  };
  sb.addEventListener("updateend", () => { appending = false; pump(); });

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      if (isStopped()) { try { await reader.cancel(); } catch { /* */ } return true; }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") { if (payload === "[DONE]") streamEnded = true; continue; }
        queue.push(b64ToBytes(payload));
        pump();
        if (!started) { started = true; audio.play().catch(() => { /* */ }); }
      }
    }
  } catch {
    // Mid-stream network failure: if we already started, let what we have play
    // out; if nothing started, fall back.
    if (!started) return false;
  }
  streamEnded = true;
  pump();
  return started;
}

// ── FALLBACK: /api/aida/tts (sentence chunks) → one concatenated blob ───────
async function playViaFallback(
  text: string, role: VoiceRole, audio: HTMLAudioElement,
  signal: AbortSignal, isStopped: () => boolean,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/aida/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, role }),
      signal,
    });
  } catch { return; }
  if (!res.ok || !res.body) return;

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      if (isStopped()) { try { await reader.cancel(); } catch { /* */ } return; }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        parts.push(b64ToBytes(payload));
      }
    }
  } catch { /* keep whatever we collected */ }

  if (isStopped() || parts.length === 0) return;
  const blob = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
  audio.src = URL.createObjectURL(blob);
  await audio.play().catch(() => { /* */ });
}
