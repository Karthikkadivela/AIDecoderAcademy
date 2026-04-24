import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";
import { generateScene, type SceneInput } from "@/lib/audioGenerator";

export const runtime     = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MULTI_CHARACTER_KEYWORDS = [
  "dialogue", "dialog", "conversation", "debate", "interview",
  "two people", "two characters", "between", "discuss", "arguing",
  "roleplay", "role play", "characters talking", "scene",
  "maya", "leo", "mr chen", "joey",
];

function needsMultipleCharacters(prompt: string): boolean {
  return MULTI_CHARACTER_KEYWORDS.some(kw => prompt.toLowerCase().includes(kw));
}

const SINGLE_CHARACTER_KEYWORDS = [
  "only one", "one person", "one voice", "solo", "single person",
  "just narrator", "only narrator", "just one", "one character",
  "only maya", "only leo", "just maya", "just leo",
];

function requestsSingleCharacter(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return SINGLE_CHARACTER_KEYWORDS.some(kw => lower.includes(kw));
}

// Extract existing audio script from creation context if present
function extractExistingScript(prompt: string): {
  existingScript: SceneInput | null;
  cleanPrompt: string;
} {
  const audioStart = prompt.indexOf('[Audio titled "');
  const audioEnd   = audioStart > -1 ? prompt.indexOf(']', audioStart) : -1;
  const match      = audioStart > -1 && audioEnd > -1
    ? prompt.slice(audioStart, audioEnd + 1).match(/\[Audio titled "[^"]*": Narrator: ([\s\S]*?)\. Dialogues: ([\s\S]*?)\]/)
    : null;
  if (match) {
    const narratorText = match[1].trim();
    const dialogueStr  = match[2].trim();
    const cleanPrompt  = prompt.replace(match[0], "").trim();

    const dialogues = dialogueStr === "none" || !dialogueStr ? [] :
      dialogueStr.split(" | ").map(d => {
        const colonIdx = d.indexOf(": ");
        return colonIdx > -1
          ? { character: d.slice(0, colonIdx).toLowerCase().replace(/\s/g, "_"), text: d.slice(colonIdx + 2), emotion: "neutral" as const }
          : null;
      }).filter(Boolean) as SceneInput["dialogues"];

    return {
      existingScript: { scene_id: "scene_01", narrator_text: narratorText, dialogues },
      cleanPrompt,
    };
  }
  return { existingScript: null, cleanPrompt: prompt };
}

async function generateScriptWithModification(
  prompt: string,
  ageGroup: string,
  existingScript: SceneInput | null,
  isMultiChar: boolean,
): Promise<SceneInput> {

  const VALID_EMOTIONS = new Set([
    "happy","sad","curious","excited","frustrated",
    "neutral","confident","realization","awestruck","proud",
  ]);
  const FALLBACK_ARC = ["curious","excited","realization","confident","frustrated","awestruck","happy","proud"];

  if (existingScript) {
    // Modification mode — analyse request first, then apply changes
    const systemPrompt = `You are a creative audio editor for students aged ${ageGroup}.
The student has an EXISTING audio script they want to modify.
Read their request carefully and apply ALL changes they ask for.
Return ONLY valid JSON, no markdown.

EXISTING SCRIPT:
${JSON.stringify(existingScript, null, 2)}

CRITICAL RULES — READ EVERY REQUEST CAREFULLY:

CHARACTER COUNT CHANGES (highest priority):
- If the student says "only one person", "solo", "just narrator", "one voice", "single person"
  → set dialogues to [] and put everything in narrator_text as a single narrator monologue
- If the student says "only maya" or "only leo" or names one character
  → keep only that character in dialogues, remove all others
- If the student says "add another person" or "two people" or "add [name]"
  → add the requested character to dialogues
- NEVER keep two characters when the student asked for one

CONTENT CHANGES:
- If the student asks to add a topic → weave it into the existing story naturally
- If the student asks to change tone → rewrite lines to match (spooky, funny, dramatic, etc.)
- If the student asks to make it longer/shorter → adjust narrator_text and dialogue count

EMOTION RULES:
- Every dialogue entry MUST have an emotion field
- Use varied emotions — never repeat the same emotion more than twice in a row
- Available: happy, sad, curious, excited, frustrated, neutral, confident, realization, awestruck, proud

Return the MODIFIED script:
{
  "scene_id": "scene_01",
  "narrator_text": "...",
  "dialogues": [
    { "character": "...", "text": "...", "emotion": "..." }
  ]
}`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Modification requested: ${prompt}` },
      ],
      temperature: 0.85, max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as SceneInput;
    parsed.dialogues = parsed.dialogues.map((d, i) => ({
      ...d,
      emotion: d.emotion && VALID_EMOTIONS.has(d.emotion) ? d.emotion : FALLBACK_ARC[i % FALLBACK_ARC.length],
    }));
    return parsed;
  }

  // Fresh generation
  const systemPrompt = isMultiChar
    ? `You are a creative audio producer for students aged ${ageGroup}.
Create a multi-character audio scene. Return ONLY valid JSON.

{
  "scene_id": "scene_01",
  "narrator_text": "Optional short scene-setter (1 sentence max, or empty string)",
  "dialogues": [
    { "character": "maya", "text": "What maya says", "emotion": "curious" }
  ]
}

Characters: maya (Ivy), leo (Kevin), mr_chen (Matthew), joey (Kevin)
Use 2 characters. Max 15 words per line. Build emotional arc.
Emotions: happy, sad, curious, excited, frustrated, neutral, confident, realization, awestruck, proud
NEVER repeat same emotion more than twice in a row.`
    : `You are a creative audio producer for students aged ${ageGroup}.
Create exactly what the student asks — rap, poem, story, narration.
Return ONLY valid JSON.

{
  "scene_id": "scene_01",
  "narrator_text": "The full content here",
  "dialogues": []
}

60–120 words. Match the tone. Do NOT add educational explanations.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: prompt },
    ],
    temperature: 0.9, max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as SceneInput;
  // Ensure narrator_text is always a string
  parsed.narrator_text = parsed.narrator_text ?? "";
  // Drop any dialogue entries missing a character name, then normalise emotion
  parsed.dialogues = (parsed.dialogues ?? [])
    .filter(d => d.character && typeof d.character === "string" && d.text?.trim())
    .map((d, i) => ({
      ...d,
      emotion: d.emotion && VALID_EMOTIONS.has(d.emotion) ? d.emotion : FALLBACK_ARC[i % FALLBACK_ARC.length],
    }));
  return parsed;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, ageGroup = "11-13" } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const { existingScript, cleanPrompt } = extractExistingScript(prompt);
    // If student explicitly asks for one person, override multi-char detection
    const isMultiChar = requestsSingleCharacter(cleanPrompt)
      ? false
      : needsMultipleCharacters(cleanPrompt);

    console.log(`[generate-audio] mode=${existingScript ? "modify" : "fresh"} multiChar=${isMultiChar}`);

    const script = await generateScriptWithModification(cleanPrompt, ageGroup, existingScript, isMultiChar);
    console.log(`[generate-audio] narrator=${!!script.narrator_text} dialogues=${script.dialogues.length}`);

    const { combined_mp3, parts } = await generateScene(script);
    console.log(`[generate-audio] Merged ${parts} parts → ${combined_mp3.length} bytes`);

    const supabase  = createAdminClient();
    const filename  = `audio/${userId}/${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("creations-media")
      .upload(filename, combined_mp3, { contentType: "audio/mpeg", upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data } = supabase.storage.from("creations-media").getPublicUrl(filename);
    return NextResponse.json({ url: data.publicUrl, script });
  } catch (err) {
    console.error("[generate-audio]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Audio generation failed" }, { status: 500 });
  }
}