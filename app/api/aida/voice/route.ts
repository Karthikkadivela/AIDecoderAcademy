import { auth } from "@clerk/nextjs/server";
import { sanitizeTtsText } from "@/lib/classroomAudio";
import WebSocket from "ws";

export const runtime = "nodejs";

// AIDA / SAGE / Bhavna voice — low-latency streaming TTS over the ElevenLabs
// WebSocket `stream-input` endpoint. Unlike the older /tts-timed route (which
// buffered a whole sentence to get word timestamps), this opens an outbound
// socket, pushes the reply text, and relays the MP3 audio frames back to the
// browser AS THEY GENERATE — first audio at ~75ms with Flash v2.5.
//
// The ElevenLabs socket is held only for the duration of this one request
// (Node runtime). We never expose a client-facing WebSocket (App Router can't),
// so the browser still talks plain HTTP: we re-emit the audio as Server-Sent
// Events using the SAME wire format as /api/aida/tts (`data: <base64>\n\n`,
// terminated by `data: [DONE]\n\n`) so the client player is shared.
//
// IMPORTANT: ElevenLabs WS audio frames are fragments of ONE continuous MP3
// stream — they are NOT independently-playable files. The client must feed them
// into a MediaSource SourceBuffer (or concatenate) rather than playing each as
// its own <audio>. See lib/voiceTts.ts.

// Domi (Supportive) — AIDA "Curious Friend".
const AIDA_VOICE_ID      = process.env.ELEVENLABS_AIDA_VOICE_ID      ?? "AZnzlk1XvdvUeBnXmlld";
// George (Supportive) — SAGE "Skeptical Mentor".
const TEACHER_VOICE_ID   = process.env.ELEVENLABS_TEACHER_VOICE_ID   ?? "JBFqnCBsd6RMkjVDRZzb";
// Rachel — Bhavna (matches BHAVNA_VOICE_ID in lib/classroomAudio.ts).
const CLASSROOM_VOICE_ID = process.env.ELEVENLABS_CLASSROOM_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

const ELEVENLABS_MODEL = "eleven_flash_v2_5"; // ~75ms first-byte; EL-recommended for conversational use.

// Per-role voice tuning (mirrors /api/aida/tts). `speed` is kept slightly slow
// so younger kids can follow the audio (pure-audio mode has no text to read).
const VOICE_SETTINGS = {
  aida:      { stability: 0.30, similarity_boost: 0.70, style: 0.50, use_speaker_boost: true, speed: 0.92 },
  teacher:   { stability: 0.50, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true, speed: 0.92 },
  classroom: { stability: 0.40, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 0.92 },
} as const;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    let body: { text?: string; role?: string } = {};
    try { body = await req.json(); } catch { /* fall through to empty-check */ }
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const role = body?.role as "aida" | "teacher" | "classroom" | undefined;
    if (!text) return new Response("Bad request", { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("[AIDA voice] ELEVENLABS_API_KEY is not set");
      return new Response("TTS not configured", { status: 503 });
    }

    const voiceId =
      role === "teacher"   ? TEACHER_VOICE_ID :
      role === "classroom" ? CLASSROOM_VOICE_ID :
                             AIDA_VOICE_ID;
    const voiceSettings =
      role === "teacher"   ? VOICE_SETTINGS.teacher :
      role === "classroom" ? VOICE_SETTINGS.classroom :
                             VOICE_SETTINGS.aida;

    const spoken  = sanitizeTtsText(text.slice(0, 4096));
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      start(controller) {
        const url =
          `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input` +
          `?model_id=${ELEVENLABS_MODEL}&output_format=mp3_44100_128`;
        const ws = new WebSocket(url, { headers: { "xi-api-key": apiKey } });

        let done = false;
        const finish = (err?: unknown) => {
          if (done) return;
          done = true;
          if (err) console.error("[AIDA voice WS]", err);
          try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch { /* closed */ }
          try { controller.close(); } catch { /* closed */ }
          try { ws.close(); } catch { /* closed */ }
        };

        // Client navigated away / barged in → tear the socket down now.
        const onAbort = () => { try { ws.terminate(); } catch { /* */ } finish(); };
        if (req.signal.aborted) { onAbort(); return; }
        req.signal.addEventListener("abort", onAbort);

        ws.on("open", () => {
          // BOS — settings + how aggressively to chunk (small first chunk for a
          // fast start, larger later chunks for stability).
          ws.send(JSON.stringify({
            text: " ",
            voice_settings: voiceSettings,
            generation_config: { chunk_length_schedule: [50, 120, 500] },
          }));
          // The reply, then flush, then end-of-stream.
          ws.send(JSON.stringify({ text: spoken + " ", flush: true }));
          ws.send(JSON.stringify({ text: "" }));
        });

        ws.on("message", (raw: WebSocket.RawData) => {
          if (done) return;
          try {
            const msg = JSON.parse(raw.toString()) as { audio?: string; isFinal?: boolean };
            if (msg.audio) {
              controller.enqueue(encoder.encode(`data: ${msg.audio}\n\n`));
            }
            if (msg.isFinal) finish();
          } catch {
            // Non-JSON / keepalive frame — ignore.
          }
        });

        ws.on("error", (e) => finish(e));
        ws.on("close", () => finish());
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AIDA voice]", err);
    return new Response("Internal server error", { status: 500 });
  }
}
