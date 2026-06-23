"use client";

// Shared client-side voice playback for AIDA / SAGE / Bhavna audio mode.
//
// Pure audio — NO text/karaoke. Does two things:
//
//   1. Streams audio with the lowest latency available:
//        • PRIMARY  → POST /api/aida/voice  (ElevenLabs WebSocket stream-input,
//          one continuous MP3 fed into a MediaSource SourceBuffer — gapless,
//          first audio ~75ms).
//        • FALLBACK → POST /api/aida/tts     (sentence-chunked SSE; concatenated
//          and played once). Used when MediaSource/`audio/mpeg` is unsupported
//          or the WS route fails — the kid is never left in silence.
//
//   2. Drives the VoiceOrb animation via a synthetic oscillator while playing
//      (no Web Audio graph — avoids AudioContext suspension silencing output).

export type VoiceRole = "aida" | "teacher" | "classroom";

export interface SpeakHandle {
  /** Stop immediately — barge-in, mute, or teardown. Idempotent. */
  stop: () => void;
  /** Resolves when playback ends naturally OR is stopped. Always resolves. */
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
  const role  = opts.role ?? "aida";
  const clean = (text ?? "").trim();

  let stopped = false;
  const abort = new AbortController();
  const audio = new Audio();
  audio.preload = "auto";

  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  // Orb amplitude — driven synthetically while playing. No Web Audio AnalyserNode
  // (createMediaElementSource suspends output when AudioContext is suspended).
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

  audio.onended   = cleanup;
  audio.onerror   = cleanup;
  audio.onpause   = () => { playing = false; };
  audio.onplaying = () => { playing = true; opts.onStart?.(); };

  if (!clean) { cleanup(); return { stop: cleanup, done }; }

  // Track whether audio.play() was ever attempted. If the IIFE completes
  // without play() ever being called (e.g. ElevenLabs returned no audio data),
  // we must resolve `done` explicitly — otherwise speakText() hangs forever.
  let playAttempted = false;

  // Called when audio.play() is rejected (autoplay policy, decode error, etc.).
  // Without this, onended/onerror never fire on a rejected play() and `done`
  // would hang indefinitely keeping the UI stuck on "speaking".
  const onPlayFailed = (err?: unknown) => {
    if (stopped) return;
    console.warn("[voiceTts] audio.play() rejected — recovering:", err);
    cleanup();
  };

  // Wrapper used by both paths so play() rejections always resolve `done`.
  const safePlay = () => {
    playAttempted = true;
    return audio.play().catch(onPlayFailed);
  };

  (async () => {
    const ok = await streamViaWebSocket(clean, role, audio, abort.signal, () => stopped, safePlay);
    if (stopped) return;
    if (!ok) await playViaFallback(clean, role, audio, abort.signal, () => stopped, safePlay);
  })()
    .catch(() => { if (!stopped) cleanup(); })
    .then(() => {
      // IIFE completed normally. If play() was never even attempted (both
      // routes returned no audio data), resolve `done` now.
      if (!stopped && !playAttempted) {
        console.warn("[voiceTts] no audio data received from either route — releasing speaking state");
        cleanup();
      }
    });

  return { stop: cleanup, done };
}

// ── PRIMARY: ElevenLabs WebSocket stream → MediaSource (gapless) ────────────
async function streamViaWebSocket(
  text: string, role: VoiceRole, audio: HTMLAudioElement,
  signal: AbortSignal, isStopped: () => boolean,
  safePlay: () => Promise<void>,
): Promise<boolean> {
  if (typeof MediaSource === "undefined" || !MediaSource.isTypeSupported("audio/mpeg")) return false;

  let res: Response;
  try {
    res = await fetch("/api/aida/voice", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, role }),
      signal,
    });
  } catch { return false; }
  if (!res.ok || !res.body) {
    console.warn("[voiceTts] /api/aida/voice returned", res.status);
    return false;
  }

  const ms = new MediaSource();
  audio.src = URL.createObjectURL(ms);

  let sb: SourceBuffer;
  try {
    sb = await new Promise<SourceBuffer>((resolve, reject) => {
      // Guard: if sourceopen never fires (browser quirk), don't hang forever.
      const timer = setTimeout(() => reject(new Error("sourceopen timeout")), 5000);
      ms.addEventListener("sourceopen", () => {
        clearTimeout(timer);
        try { resolve(ms.addSourceBuffer("audio/mpeg")); } catch (e) { reject(e); }
      }, { once: true });
    });
  } catch (e) {
    console.warn("[voiceTts] MediaSource setup failed:", e);
    return false;
  }

  const queue: Uint8Array[] = [];
  let appending   = false;
  let streamEnded = false;
  let started     = false;

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
        if (!started) { started = true; void safePlay(); }
      }
    }
  } catch {
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
  safePlay: () => Promise<void>,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/aida/tts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, role }),
      signal,
    });
  } catch { return; }
  if (!res.ok || !res.body) {
    console.warn("[voiceTts] /api/aida/tts returned", res.status);
    return;
  }

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

  if (isStopped() || parts.length === 0) {
    if (parts.length === 0) console.warn("[voiceTts] fallback returned no audio chunks");
    return;
  }
  const blob = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
  audio.src = URL.createObjectURL(blob);
  await safePlay();
}
