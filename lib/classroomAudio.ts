import { createAdminClient } from "@/lib/supabase";

function getElevenKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set in .env.local");
  return key;
}
// Rachel (21m00Tcm4TlvDq8ikWAM) — clear articulation of maths/science terms
// (sine, cosine, theta, hypotenuse etc.) without mispronunciation.
// Alternatives to A/B test: Charlotte XB0fDUnXU5powFXDhCwa (UK), Serena pMsXgVXv3BLzUgSXRplE
export const BHAVNA_VOICE_ID = process.env.ELEVENLABS_CLASSROOM_VOICE_ID
  ?? "21m00Tcm4TlvDq8ikWAM";

export interface VoiceSpec {
  voiceId: string;
  settings?: { stability: number; similarity_boost: number; style?: number; use_speaker_boost?: boolean };
  modelId?: string;
  speed?: number;
}

// 0.85 = ~15% slower than default — gives students time to follow along.
// ElevenLabs accepts 0.7–1.2; 1.0 is default.
export const BHAVNA_SPEED = 0.85;

const DEFAULT_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.35 };
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

// Expressive voice for the audio overview — warmer and more human than the flat
// default. Lower stability = more natural intonation; higher style = more
// expressiveness; speaker boost adds presence. Overview-only: podcast/AIDA
// voices keep DEFAULT_SETTINGS. eleven_flash_v2_5 is noticeably less robotic
// than multilingual_v2, still supports /with-timestamps word alignment, and
// is ~3-4x lower latency than turbo (EL-recommended for all conversational use).
export const OVERVIEW_VOICE_SETTINGS = {
  stability: 0.3,
  similarity_boost: 0.75,
  style: 0.55,
  use_speaker_boost: true,
};
export const OVERVIEW_MODEL_ID = "eleven_flash_v2_5";

// Convert maths/science symbols to spoken English before sending to ElevenLabs.
// Without this: θ → "tita", cos → "coss", H₂O → garbled, x^2 → "x caret 2".
export function sanitizeTtsText(raw: string): string {
  return raw
    // ── Named chemical compounds (longest/most-specific first) ───────────────
    .replace(/\bH₂SO₄\b|\bH2SO4\b/g, "sulfuric acid")
    .replace(/\bHNO₃\b|\bHNO3\b/g, "nitric acid")
    .replace(/\bH₃PO₄\b|\bH3PO4\b/g, "phosphoric acid")
    .replace(/\bH₂CO₃\b|\bH2CO3\b/g, "carbonic acid")
    .replace(/\bCH₃COOH\b|\bCH3COOH\b/g, "acetic acid")
    .replace(/\bC₆H₁₂O₆\b|\bC6H12O6\b/g, "glucose")
    .replace(/\bC₁₂H₂₂O₁₁\b|\bC12H22O11\b/g, "sucrose")
    .replace(/Ca\(OH\)₂|Ca\(OH\)2/g, "calcium hydroxide")
    .replace(/\bFe₂O₃\b|\bFe2O3\b/g, "iron three oxide")
    .replace(/\bAl₂O₃\b|\bAl2O3\b/g, "aluminium oxide")
    .replace(/\bNa₂O\b|\bNa2O\b/g, "sodium oxide")
    .replace(/\bCaCl₂\b|\bCaCl2\b/g, "calcium chloride")
    .replace(/\bH₂O₂\b|\bH2O2\b/g, "hydrogen peroxide")
    .replace(/\bNH₃\b|\bNH3\b/g, "ammonia")
    .replace(/\bCH₄\b|\bCH4\b/g, "methane")
    .replace(/\bCl₂\b|\bCl2\b/g, "chlorine gas")
    .replace(/\bBr₂\b|\bBr2\b/g, "bromine")
    .replace(/\bI₂\b|\bI2\b/g, "iodine")
    .replace(/\bSO₃\b|\bSO3\b/g, "sulfur trioxide")
    .replace(/\bSO₂\b|\bSO2\b/g, "sulfur dioxide")
    .replace(/\bNO₂\b|\bNO2\b/g, "nitrogen dioxide")
    .replace(/\bCO₂\b|\bCO2\b/g, "carbon dioxide")
    .replace(/\bH₂O\b|\bH2O\b/g, "water")
    .replace(/\bNaCl\b/g, "sodium chloride")
    .replace(/\bKCl\b/g, "potassium chloride")
    .replace(/\bNaOH\b/g, "sodium hydroxide")
    .replace(/\bKOH\b/g, "potassium hydroxide")
    .replace(/\bHCl\b/g, "hydrochloric acid")
    .replace(/\bHF\b/g, "hydrogen fluoride")
    .replace(/\bHBr\b/g, "hydrogen bromide")
    .replace(/\bMgO\b/g, "magnesium oxide")
    .replace(/\bCaO\b/g, "calcium oxide")
    .replace(/\bFeO\b/g, "iron two oxide")
    .replace(/\bCO\b/g, "carbon monoxide")
    .replace(/\bNO\b/g, "nitrogen monoxide")
    .replace(/\bO₂\b|\bO2\b/g, "oxygen")
    .replace(/\bN₂\b|\bN2\b/g, "nitrogen")
    .replace(/\bH₂\b|\bH2\b/g, "hydrogen")
    // ── Chemical reaction / equilibrium arrows ───────────────────────────────
    .replace(/⇌/g, "is in equilibrium with")
    .replace(/→/g, "produces")
    // ── Subscript unicode digits → ASCII (catches unnamed formulas) ──────────
    .replace(/[₀-₉]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x2080 + 0x30))
    // ── Caret exponents: x^2, x^{n}, x^-1 ──────────────────────────────────
    .replace(/\^(?:\{([^}]+)\}|(-?\d+(?:\.\d*)?|[a-zA-Z]))/g, (_, braced, bare) => {
      const e = (braced ?? bare ?? "").trim();
      if (e === "2") return " squared";
      if (e === "3") return " cubed";
      if (e === "-1") return " to the power of negative one";
      return ` to the power of ${e}`;
    })
    // ── Trig / math function abbreviations (word-boundary safe) ─────────────
    .replace(/\barctan\b/gi, "arc tangent")
    .replace(/\barccos\b/gi, "arc cosine")
    .replace(/\barcsin\b/gi, "arc sine")
    .replace(/\bcsc\b/gi, "cosecant")
    .replace(/\bsec\b/gi, "secant")
    .replace(/\bcot\b/gi, "cotangent")
    .replace(/\btan\b/gi, "tangent")
    .replace(/\bcos\b/gi, "cosine")
    .replace(/\bsin\b/gi, "sine")
    .replace(/\bln\b/g, "natural log")
    // ── Greek letters (Unicode) ──────────────────────────────────────────────
    .replace(/θ|Θ/g, "theta")
    .replace(/α|Α/g, "alpha")
    .replace(/β|Β/g, "beta")
    .replace(/γ|Γ/g, "gamma")
    .replace(/δ|Δ/g, "delta")
    .replace(/λ|Λ/g, "lambda")
    .replace(/μ|Μ/g, "mu")
    .replace(/π|Π/g, "pi")
    .replace(/σ|Σ/g, "sigma")
    .replace(/φ|Φ/g, "phi")
    .replace(/ω|Ω/g, "omega")
    // ── Operators and relations ──────────────────────────────────────────────
    .replace(/≈/g, "approximately equals")
    .replace(/≠/g, "does not equal")
    .replace(/≤/g, "less than or equal to")
    .replace(/≥/g, "greater than or equal to")
    .replace(/=/g, " equals ")
    .replace(/\+/g, " plus ")
    .replace(/−/g, " minus ")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/√/g, "square root of ")
    .replace(/∞/g, "infinity")
    // ── Superscripts ─────────────────────────────────────────────────────────
    .replace(/²/g, " squared")
    .replace(/³/g, " cubed")
    .replace(/⁴/g, " to the power of 4")
    .replace(/⁵/g, " to the power of 5")
    .replace(/⁶/g, " to the power of 6")
    .replace(/°/g, " degrees")
    // ── Clean up double-spaces ────────────────────────────────────────────────
    .replace(/ {2,}/g, " ")
    .trim();
}

// Synthesize ONE line to a complete MP3 buffer (non-streaming endpoint).
// `model` defaults to multilingual_v2 (highest quality); callers that need lower
// latency (the podcast) pass a faster tier like eleven_turbo_v2_5.
export async function synthLine(
  text: string,
  voice: VoiceSpec,
  model: string = "eleven_multilingual_v2",
): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": getElevenKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: sanitizeTtsText(text),
        model_id: model,
        voice_settings: voice.settings ?? DEFAULT_SETTINGS,
        ...(voice.speed !== undefined && { speed: voice.speed }),
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text().catch(() => "")}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface WordTiming { text: string; start: number; end: number; }

export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Group ElevenLabs character alignment into word timings.
 *  Whitespace chars are boundaries, never words. */
export function groupCharsToWords(a: CharAlignment): WordTiming[] {
  const words: WordTiming[] = [];
  let buf = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    if (buf.length > 0) { words.push({ text: buf, start, end }); buf = ""; }
  };
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    if (/\s/.test(ch)) { flush(); continue; }
    if (buf.length === 0) start = a.character_start_times_seconds[i];
    buf += ch;
    end = a.character_end_times_seconds[i];
  }
  flush();
  return words;
}

/** Synthesize one line via ElevenLabs /with-timestamps.
 *  Returns the MP3 buffer + per-word timings. */
export async function synthLineWithTimestamps(
  text: string,
  voice: VoiceSpec,
): Promise<{ mp3: Buffer; words: WordTiming[] }> {
  const key = getElevenKey();
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        text: sanitizeTtsText(text),
        model_id: voice.modelId ?? DEFAULT_MODEL_ID,
        voice_settings: voice.settings ?? DEFAULT_SETTINGS,
        ...(voice.speed !== undefined && { speed: voice.speed }),
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs with-timestamps ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as {
    audio_base64: string;
    alignment: CharAlignment | null;
  };
  const mp3 = Buffer.from(json.audio_base64, "base64");
  const words = json.alignment ? groupCharsToWords(json.alignment) : [];
  return { mp3, words };
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
