import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateImage } from "@/lib/imageGenerator";
import { generatePPT, type PPTInput } from "@/lib/pptGenerator";

export const runtime     = "nodejs";
export const maxDuration = 180;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function generateSlideStructure(prompt: string, ageGroup: string): Promise<PPTInput> {
  const systemPrompt = `You are an educational content creator for students aged ${ageGroup}.
Generate a PowerPoint presentation structure as valid JSON only.
Return ONLY the JSON object — no markdown, no backticks, no explanation.

The JSON must follow this exact structure:
{
  "title": "Presentation title",
  "subject": "Subject area",
  "class_level": "Grade X",
  "sections": [
    {
      "title": "Section title",
      "concepts": ["concept 1", "concept 2", "concept 3"],
      "scenes": [
        {
          "scene_id": "S1",
          "scene_goal": "What this scene teaches (max 15 words)",
          "image_prompt": "See image_prompt rules below"
        }
      ]
    }
  ]
}

STRUCTURE RULES:
- 2 to 3 sections
- 1 scene per section
- concepts: 3 to 5 bullet points per section, each under 8 words
- scene_goal: what the student should understand after this slide, max 15 words

IMAGE PROMPT RULES (critical — this drives the actual image generation):
- Write the image_prompt as if briefing a 2D animation studio in the style of Pixar and Studio Ghibli
- Must be 40 to 60 words — detailed enough for the image model to generate something accurate
- Always include: the specific subject/object, the setting/environment, the mood, and what action or concept is being shown
- For science topics: show the concept happening physically in a vivid scene — not just "a diagram of X"
- For history/geography: show the era, location, and key figures or landmarks
- For math: show characters interacting with numbers, shapes or patterns in a physical environment
- Characters should look like energetic teens (not adults) in a bright colourful world
- NEVER write vague prompts like "students learning" or "a classroom scene" — be specific
- BAD: "Two students learning about photosynthesis in a classroom"
- GOOD: "A teenage girl with bright eyes holds a glowing green leaf up to golden sunlight in a lush garden, tiny arrows showing water rising through roots and oxygen bubbles floating upward, warm Ghibli-style illustration"

Return COMPLETE valid JSON only.`;

  const response = await openai.chat.completions.create({
    model:           "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: `Create a presentation about: ${prompt}` },
    ],
    temperature:     0.7,
    max_tokens:      2048,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as PPTInput;
  } catch (e) {
    console.error("[generate-ppt] JSON parse failed:", raw.slice(0, 200));
    throw new Error(`Invalid JSON from OpenAI: ${e instanceof Error ? e.message : e}`);
  }
}

async function generateSceneImages(structure: PPTInput): Promise<PPTInput> {
  const enriched = JSON.parse(JSON.stringify(structure)) as PPTInput;

  for (let si = 0; si < enriched.sections.length; si++) {
    for (let sci = 0; sci < enriched.sections[si].scenes.length; sci++) {
      const scene = enriched.sections[si].scenes[sci];
      try {
        // Prefer image_prompt; fall back to scene_goal + section title for context
        const rawPrompt = scene.image_prompt?.trim()
          || `${scene.scene_goal} — ${enriched.sections[si].title}`;

        console.log(`[generate-ppt] Image for ${scene.scene_id}: "${rawPrompt.slice(0, 80)}..."`);

        // Always apply style for slide images — they are always scene/educational illustrations
        const buffer = await generateImage(rawPrompt, "fal-flux2pro", true);
        enriched.sections[si].scenes[sci].imageBase64 = buffer.toString("base64");
      } catch (err) {
        console.error(`[generate-ppt] Image failed for ${scene.scene_id}:`, err);
        // Continue — missing image gets a placeholder in the PPTX
      }
    }
  }

  return enriched;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, ageGroup = "11-13" } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    console.log("[generate-ppt] Step 1: Generating slide structure...");
    const structure = await generateSlideStructure(prompt, ageGroup);
    console.log(`[generate-ppt] ${structure.sections.length} sections, ${structure.sections.reduce((n, s) => n + s.scenes.length, 0)} scenes`);

    console.log("[generate-ppt] Step 2: Generating scene images...");
    const enriched = await generateSceneImages(structure);

    console.log("[generate-ppt] Step 3: Building PPTX...");
    const pptBuffer = await generatePPT(enriched);
    const pptBase64 = Buffer.from(pptBuffer).toString("base64");

    return NextResponse.json({
      title:    structure.title,
      subject:  structure.subject,
      sections: enriched.sections,
      pptBase64,
    });
  } catch (err) {
    console.error("[generate-ppt]", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "PPT generation failed",
    }, { status: 500 });
  }
}