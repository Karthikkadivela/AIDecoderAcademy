import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";
import { generateScene, type SceneInput } from "@/lib/audioGenerator";

export const runtime     = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ─── Intent detection ─────────────────────────────────────────────────────────

const MULTI_CHARACTER_KEYWORDS = [
  "dialogue", "dialog", "conversation", "debate", "interview",
  "two people", "two characters", "between", "discuss", "arguing",
  "roleplay", "role play", "characters talking", "scene",
  "maya", "leo", "mr chen", "joey",
];

function needsMultipleCharacters(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return MULTI_CHARACTER_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Single narrator script ───────────────────────────────────────────────────

async function generateNarratorScript(prompt: string, ageGroup: string): Promise<SceneInput> {
  const systemPrompt = `You are a creative audio producer for students aged ${ageGroup}.
The student wants an audio clip. Generate exactly what they asked for — do NOT turn it into a lesson.
Return ONLY valid JSON, no markdown.

JSON structure:
{
  "scene_id": "scene_01",
  "narrator_text": "The full audio content spoken by the narrator",
  "dialogues": []
}

RULES:
- narrator_text should be the FULL content — a rap, poem, story, narration, or whatever was asked
- Keep it engaging, fun, and age-appropriate
- Match the tone the student asked for (spooky = spooky, funny = funny, dramatic = dramatic)
- Length: 60–120 words for the narrator_text — enough to feel satisfying but not too long
- dialogues must be an empty array []
- Do NOT add educational explanations unless the student explicitly asked to learn something
- If asked for a rap: write actual rap lyrics with rhythm
- If asked for a poem: write an actual poem
- If asked for a story: write a short vivid story
- Just create what was asked — no meta-commentary, no "here is your rap:"`;

  const response = await openai.chat.completions.create({
    model:           "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: prompt },
    ],
    temperature:     0.9,
    max_tokens:      512,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as SceneInput;
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
  }
}

// ─── Multi-character script ───────────────────────────────────────────────────

async function generateDialogueScript(prompt: string, ageGroup: string): Promise<SceneInput> {
  const systemPrompt = `You are a creative audio producer for students aged ${ageGroup}.
The student wants a multi-character audio clip. Generate exactly what they asked for.
Return ONLY valid JSON, no markdown.

JSON structure:
{
  "scene_id": "scene_01",
  "narrator_text": "Optional short scene-setter (1 sentence max, or empty string)",
  "dialogues": [
    { "character": "maya", "text": "What maya says", "emotion": "curious" },
    { "character": "leo",  "text": "What leo says",  "emotion": "excited" }
  ]
}

CHARACTER RULES:
- Available characters: maya (teen girl, Ivy voice), leo (teen boy, Kevin voice), mr_chen (teacher, Matthew voice), joey (kid, Kevin voice)
- Use 2 characters unless 3 makes sense for the request
- narrator_text: 1 sentence max to set the scene, or leave as empty string ""

EMOTION RULES — CRITICAL:
- Every dialogue entry MUST have an emotion
- Use varied emotions that match the moment — never repeat the same emotion more than twice in a row
- Available: happy, sad, curious, excited, frustrated, neutral, confident, realization, awestruck, proud
- Build an emotional arc across the conversation

CONTENT RULES:
- Generate EXACTLY what the student asked for — a debate, conversation, interview, etc.
- Match the tone (funny, serious, dramatic, casual)
- Keep each line SHORT — max 15 words per dialogue line
- Make it feel natural with "wait...", "hmm...", "oh!", interruptions
- 4–10 dialogue exchanges
- Age-appropriate and engaging`;

  const response = await openai.chat.completions.create({
    model:           "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: prompt },
    ],
    temperature:     0.9,
    max_tokens:      1024,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as SceneInput;

    const VALID_EMOTIONS = new Set([
      "happy", "sad", "curious", "excited", "frustrated",
      "neutral", "confident", "realization", "awestruck", "proud",
    ]);
    const FALLBACK_ARC = ["curious", "excited", "realization", "confident", "frustrated", "awestruck", "happy", "proud"];

    parsed.dialogues = parsed.dialogues.map((d, i) => ({
      ...d,
      emotion: d.emotion && VALID_EMOTIONS.has(d.emotion)
        ? d.emotion
        : FALLBACK_ARC[i % FALLBACK_ARC.length],
    }));

    console.log(`[generate-audio] Emotions: ${parsed.dialogues.map(d => d.emotion).join(" → ")}`);
    return parsed;
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : e}`);
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, ageGroup = "11-13" } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const isMultiChar = needsMultipleCharacters(prompt);
    console.log(`[generate-audio] intent=${isMultiChar ? "multi-character" : "narrator"} prompt="${prompt.slice(0, 60)}"`);

    const script = isMultiChar
      ? await generateDialogueScript(prompt, ageGroup)
      : await generateNarratorScript(prompt, ageGroup);

    console.log(`[generate-audio] narrator=${!!script.narrator_text} dialogues=${script.dialogues.length}`);

    console.log("[generate-audio] Synthesising with Polly...");
    const { combined_mp3, parts } = await generateScene(script);
    console.log(`[generate-audio] Merged ${parts} parts → ${combined_mp3.length} bytes`);

    const supabase = createAdminClient();
    const filename = `audio/${userId}/${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("creations-media")
      .upload(filename, combined_mp3, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) {
      console.error("[generate-audio] Upload error:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("creations-media").getPublicUrl(filename);
    console.log("[generate-audio] Done →", data.publicUrl);

    return NextResponse.json({ url: data.publicUrl, script });
  } catch (err) {
    console.error("[generate-audio]", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Audio generation failed",
    }, { status: 500 });
  }
}