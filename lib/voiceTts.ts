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

  if (!clean) { cleanup(); return { stop: () => cleanup(), done }; }

  // Set to true the moment any audio element successfully calls play().
  // The IIFE exits as soon as play() starts (not when audio ends — onended
  // handles that). Without this flag, the .then() below would see stopped===false
  // (audio is still playing) and call cleanup(), killing the audio immediately.
  let playAttempted = false;

  (async () => {
    // ── PRIMARY: /api/aida/voice (ElevenLabs WS stream → SSE) ───────────────
    // Collect all base64 chunks into one blob then play. Avoids MediaSource
    // complexity that caused onerror to fire on empty streams.
    const primaryAudio = new Audio();
    primaryAudio.preload = "auto";
    const primaryPlay = wireAudio(primaryAudio);

    const primaryOk = await fetchAndPlayBlob(
      "/api/aida/voice", { text: clean, role },
      primaryAudio, abort.signal, () => stopped, primaryPlay,
    );

    if (stopped || primaryOk) return;

    // ── FALLBACK: /api/aida/tts-timed (JSON blob + word timings) ────────────
    // This is the same endpoint that powers Bhavna classroom karaoke — reliable.
    // Uses a FRESH audio element so primary state cannot contaminate it.
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

// ── PRIMARY: collect SSE base64 chunks from /api/aida/voice → blob → play ───
async function fetchAndPlayBlob(
  url: string,
  body: object,
  audio: HTMLAudioElement,
  signal: AbortSignal,
  isStopped: () => boolean,
  safePlay: () => Promise<void>,
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal,
    });
  } catch { return false; }

  if (!res.ok || !res.body) {
    console.warn("[voiceTts]", url, "returned", res.status);
    return false;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf   = "";
  const parts: ArrayBuffer[] = [];

  try {
    for (;;) {
      if (isStopped()) { try { await reader.cancel(); } catch { /* */ } return false; }
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        parts.push(b64ToBytes(payload).buffer as ArrayBuffer);
      }
    }
  } catch { /* keep whatever we collected */ }

  if (isStopped() || parts.length === 0) {
    if (parts.length === 0) console.warn("[voiceTts]", url, "returned no audio chunks");
    return false;
  }

  const blob = new Blob(parts, { type: "audio/mpeg" });
  audio.src  = URL.createObjectURL(blob);
  await safePlay();
  return true;
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
