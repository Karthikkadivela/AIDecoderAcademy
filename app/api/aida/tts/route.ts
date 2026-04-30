import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// Jessica — Playful, Bright, Warm. Young American female. Ideal friendly AI
// companion voice for students aged 8–16.
const AIDA_VOICE_ID    = process.env.ELEVENLABS_AIDA_VOICE_ID    ?? "cgSgspJ2msm6clMCkdW9";
// George — Warm, Captivating Storyteller. British male, middle-aged.
// Reads as professorial/authoritative without being harsh — perfect teacher.
const TEACHER_VOICE_ID = process.env.ELEVENLABS_TEACHER_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

const ELEVENLABS_MODEL = "eleven_flash_v2_5"; // ~75ms first-byte latency

// Split text into sentence-sized chunks so the first sentence's audio starts
// playing while later sentences are still generating.
function splitIntoChunks(text: string): string[] {
  const parts = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(p => p.trim().length > 0);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { text, role } = (await req.json()) as { text: string; role?: "aida" | "teacher" };
    if (!text?.trim()) return new Response("Bad request", { status: 400 });

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("[AIDA TTS] ELEVENLABS_API_KEY is not set in environment");
      return new Response("TTS not configured", { status: 503 });
    }

    const voiceId = role === "teacher" ? TEACHER_VOICE_ID : AIDA_VOICE_ID;
    const chunks  = splitIntoChunks(text.slice(0, 4096));
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          try {
            const res = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
              {
                method:  "POST",
                headers: {
                  "xi-api-key":   process.env.ELEVENLABS_API_KEY ?? "",
                  "Content-Type": "application/json",
                  "Accept":       "audio/mpeg",
                },
                body: JSON.stringify({
                  text:       chunk,
                  model_id:   ELEVENLABS_MODEL,
                  voice_settings: {
                    stability:        0.5,
                    similarity_boost: 0.75,
                    style:            0.0,
                    use_speaker_boost: true,
                  },
                }),
              }
            );

            if (!res.ok) {
              const errBody = await res.text().catch(() => "");
              console.error(`[AIDA TTS] ElevenLabs ${res.status}:`, errBody.slice(0, 200));
              continue; // skip this chunk but keep streaming
            }

            const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
            controller.enqueue(encoder.encode(`data: ${b64}\n\n`));
          } catch (err) {
            console.error("[AIDA TTS] chunk fetch failed:", err);
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
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
    console.error("[AIDA TTS]", err);
    return new Response("Internal server error", { status: 500 });
  }
}
