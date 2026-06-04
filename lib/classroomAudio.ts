import { createAdminClient } from "@/lib/supabase";

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY!;
// Mirror the Bhavna voice id used by app/api/aida/tts (role: "classroom").
export const BHAVNA_VOICE_ID = process.env.ELEVENLABS_CLASSROOM_VOICE_ID
  ?? "1qEiC6qsybMkmnNdVMbK";

export interface VoiceSpec {
  voiceId: string;
  settings?: { stability: number; similarity_boost: number; style?: number };
}

const DEFAULT_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.35 };

// Synthesize ONE line to a complete MP3 buffer (non-streaming endpoint).
export async function synthLine(text: string, voice: VoiceSpec): Promise<Buffer> {
  // Fail loudly with a clear server-side message rather than letting an
  // undefined key reach ElevenLabs and bounce back as an opaque 401 that the
  // student sees only as "couldn't make your audio".
  if (!ELEVEN_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not set — classroom audio cannot be generated.");
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voice.settings ?? DEFAULT_SETTINGS,
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => "")}`);
  return Buffer.from(await res.arrayBuffer());
}

// Concatenate MP3 buffers. MP3 frames are independently decodable, so naive
// concatenation plays correctly in browsers for our purposes.
export function mergeMp3(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

// Upload final MP3 to the public creations-media bucket → public URL.
export async function uploadAudio(buf: Buffer, key: string): Promise<string> {
  const supabase = createAdminClient();
  const path = `audio/${key}`;
  const { error } = await supabase.storage
    .from("creations-media")
    .upload(path, buf, { contentType: "audio/mpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("creations-media").getPublicUrl(path);
  return data.publicUrl;
}
