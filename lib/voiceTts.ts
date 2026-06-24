"use client";

// Shared client-side voice playback for AIDA / SAGE / Bhavna audio mode.
//
// Two paths — tried in order:
//   PRIMARY  → POST /api/aida/voice (ElevenLabs WS stream-input → SSE base64)
//              Collects all audio chunks then plays as a single blob.
//              (MediaSource removed — its onerror fires on empty streams and
//               permanently kills the fallback via the shared audio element.)
//   FALLBACK → POST /api/aida/tts-timed (complete audio + word timings as JSON)
//              Same endpoint used by the classroom karaoke path — proven to work.
//
// Each path creates its OWN <audio> element so a failed primary cannot corrupt
// the fallback via shared event-handler state.
//
// Orb amplitude is driven by a synthetic oscillator (no Web Audio AnalyserNode —
// createMediaElementSource suspends audio when AudioContext is suspended).

export type VoiceRole = "aida" | "teacher" | "classroom";

export interface SpeakHandle {
  stop: () => void;
  done: Promise<void>;
}

interface SpeakOpts {
  role?: VoiceRole;
  onAmplitude?: (level: number) => void;
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
  let activeAudioEl: HTMLAudioElement | null = null; // track whichever path is currently playing
  let pcmCtx: AudioContext | null = null;
  let pcmSrc: AudioBufferSourceNode | null = null;

  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  // Orb oscillator — runs while any audio element reports playing = true.
  let raf   = 0;
  let playing = false;
  let phase   = 0;
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

  // cleanup() is the single exit point — resolves `done` for all paths.
  const cleanup = (callerAudio?: HTMLAudioElement) => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    try { opts.onAmplitude?.(0); } catch { /* */ }
    try { abort.abort(); } catch { /* */ }
    // Stop PCM audio if active
    if (pcmSrc) { try { pcmSrc.stop(); } catch { /* */ } pcmSrc = null; }
    if (pcmCtx) { try { pcmCtx.close(); } catch { /* */ } pcmCtx = null; }
    const audioToStop = callerAudio ?? activeAudioEl;
    if (audioToStop) {
      try { audioToStop.pause(); } catch { /* */ }
      if (audioToStop.src.startsWith("blob:")) {
        try { URL.revokeObjectURL(audioToStop.src); } catch { /* */ }
      }
    }
    resolveDone();
  };

  // Wire an audio element: connect playback events → shared cleanup.
  // Returns a `safePlay` function for that element.
  const wireAudio = (audio: HTMLAudioElement) => {
    activeAudioEl   = audio; // always points to whichever path is currently wired
    audio.onended   = () => cleanup(audio);
    audio.onerror   = () => {
      console.warn("[voiceTts] audio element error", audio.error?.code, audio.error?.message);
      cleanup(audio);
    };
    audio.onpause   = () => { playing = false; };
    audio.onplaying = () => { playing = true; opts.onStart?.(); };

    const safePlay = () => {
      playAttempted = true;
      return audio.play().catch((err) => {
        console.warn("[voiceTts] audio.play() rejected:", err);
        cleanup(audio);
      });
    };
    return safePlay;
  };

  // PCM AudioContext playback for /api/aida/voice (pcm_16000 Int16LE).
  async function playPcmInline(text: string, role: VoiceRole): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch("/api/aida/voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, role }),
        signal: abort.signal,
      });
    } catch { return false; }
    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const rawParts: Uint8Array[] = [];

    try {
      for (;;) {
        if (stopped) { try { await reader.cancel(); } catch { /* */ } return false; }
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          rawParts.push(b64ToBytes(payload));
        }
      }
    } catch { /* keep whatever we collected */ }

    if (stopped || rawParts.length === 0) {
      if (rawParts.length === 0) console.warn("[voiceTts] /api/aida/voice returned no audio chunks");
      return false;
    }

    // Concat MP3 frames → decode via Web Audio API
    const totalLen = rawParts.reduce((s, a) => s + a.length, 0);
    const mp3Bytes = new Uint8Array(totalLen);
    let off = 0;
    for (const c of rawParts) { mp3Bytes.set(c, off); off += c.length; }

    const ACtx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
    const ctx = new ACtx();
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch { ctx.close().catch(() => {}); return false; } }
    pcmCtx = ctx;

    let audioBuf: AudioBuffer;
    try {
      audioBuf = await ctx.decodeAudioData(mp3Bytes.buffer.slice(0));
    } catch {
      ctx.close().catch(() => {}); pcmCtx = null; return false;
    }
    if (stopped) { ctx.close().catch(() => {}); pcmCtx = null; return false; }

    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    src.start(0);
    pcmSrc = src;

    playAttempted = true;
    playing = true;
    opts.onStart?.();

    src.onended = () => {
      playing = false;
      opts.onAmplitude?.(0);
      pcmCtx = null; pcmSrc = null;
      ctx.close().catch(() => {});
      cleanup();
    };

    return true;
  }

  if (!clean) { cleanup(); return { stop: () => cleanup(), done }; }

  // Set to true the moment any audio element successfully calls play().
  // The IIFE exits as soon as play() starts (not when audio ends — onended
  // handles that). Without this flag, the .then() below would see stopped===false
  // (audio is still playing) and call cleanup(), killing the audio immediately.
  let playAttempted = false;

  (async () => {
    // ── PRIMARY: /api/aida/voice (ElevenLabs WS stream → PCM Int16LE) ──────
    // Collect PCM chunks and play via AudioContext AudioBufferSourceNode.
    // Note: the endpoint output_format was changed from mp3_44100_128 to
    // pcm_16000 in commit 02d6ab6 — raw PCM cannot be fed to <audio>, so
    // we use Web Audio API directly (no blob-collect delay, no gap).
    const pcmOk = await playPcmInline(clean, role);
    if (stopped || pcmOk) return;

    // ── FALLBACK: /api/aida/tts-timed (JSON blob + word timings → MP3) ─────
    // Uses a FRESH audio element so any prior state cannot contaminate it.
    const fallbackAudio = new Audio();
    fallbackAudio.preload = "auto";
    const fallbackPlay = wireAudio(fallbackAudio);

    await fetchAndPlayTimedBlob(
      clean, role, fallbackAudio, abort.signal, () => stopped, fallbackPlay,
    );
  })()
    .catch(() => { cleanup(); })
    .then(() => {
      // IIFE exits as soon as play() starts (not when audio ends).
      // Only call cleanup if play() was never attempted — meaning both routes
      // returned no audio data at all. If playAttempted is true, audio is still
      // playing; onended/onerror will call cleanup when it finishes.
      if (!stopped && !playAttempted) {
        console.warn("[voiceTts] all audio paths produced no data — releasing speaking state");
        cleanup();
      }
    });

  return {
    stop: () => cleanup(),
    done,
  };
}

// ── FALLBACK: /api/aida/tts-timed → JSON { audioBase64 } → play ─────────────
async function fetchAndPlayTimedBlob(
  text: string, role: VoiceRole, audio: HTMLAudioElement,
  signal: AbortSignal, isStopped: () => boolean,
  safePlay: () => Promise<void>,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/aida/tts-timed", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, role }), signal,
    });
  } catch { return; }

  if (!res.ok) {
    console.warn("[voiceTts] /api/aida/tts-timed returned", res.status);
    return;
  }

  let data: { audioBase64?: string } = {};
  try { data = await res.json(); } catch { return; }

  if (!data.audioBase64) {
    console.warn("[voiceTts] tts-timed returned no audioBase64");
    return;
  }
  if (isStopped()) return;

  const bytes = b64ToBytes(data.audioBase64);
  const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/mpeg" });
  audio.src   = URL.createObjectURL(blob);
  await safePlay();
}
