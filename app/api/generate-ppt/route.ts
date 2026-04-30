import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateImage } from "@/lib/imageGenerator";
import { generatePPT, type PPTInput } from "@/lib/pptGenerator";

export const runtime     = "nodejs";
export const maxDuration = 180;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Extract existing slide structure from creation context if present
function extractExistingSlides(prompt: string): {
  existingSlides: PPTInput | null;
  cleanPrompt: string;
} {
  const slideStart = prompt.indexOf('[Slides titled "');
  const slideEnd   = slideStart > -1 ? prompt.indexOf(']', slideStart) : -1;
  const match      = slideStart > -1 && slideEnd > -1
    ? prompt.slice(slideStart, slideEnd + 1).match(/\[Slides titled "[^"]*": ([\s\S]*?)\]/)
    : null;
  if (match) {
    const cleanPrompt = prompt.replace(match[0], "").trim();
    // We only have section summaries in the context string — flag as "has existing"
    // The full structure needs to come from a re-parse, so we signal modification mode
    return { existingSlides: { title: "existing", sections: [] }, cleanPrompt };
  }
  return { existingSlides: null, cleanPrompt: prompt };
}

async function generateSlideStructure(
  prompt: string,
  ageGroup: string,
  isModification: boolean,
  existingSummary?: string,
  conversationHistory?: string,
): Promise<PPTInput> {

  const baseRules = `STRUCTURE RULES:
- 2 to 3 sections
- 1 scene per section
- concepts: 3 to 5 bullet points per section, each under 8 words
- scene_goal: what the student should understand, max 15 words

IMAGE PROMPT RULES:
- 40 to 60 words, Pixar/Ghibli 2D animation style
- Include: subject, setting, mood, and what is being shown
- Characters: energetic teens in a bright colourful world
- BAD: "students in a classroom"
- GOOD: "A teenage girl holds a glowing leaf to sunlight in a lush garden, tiny arrows showing water rising through roots, Ghibli style"`;

  const historySection = !isModification && conversationHistory?.trim()
    ? `\n\nCONVERSATION HISTORY (what was created before this request — use it to understand what the student is referring to):\n${conversationHistory}`
    : "";

  const systemPrompt = isModification
    ? `You are an educational content creator for students aged ${ageGroup}.
The student has EXISTING slides they want to modify.
Apply their requested changes while keeping the overall topic and structure.

EXISTING SLIDE SUMMARY: ${existingSummary ?? ""}

The student's modification request will follow. Apply it — change specific sections, 
add content, adjust concepts, update image prompts — but keep what they didn't ask to change.

Return ONLY valid JSON:
{
  "title": "...", "subject": "...", "class_level": "...",
  "sections": [{
    "title": "...", "concepts": ["..."],
    "scenes": [{ "scene_id": "S1", "scene_goal": "...", "image_prompt": "..." }]
  }]
}

${baseRules}`
    : `You are an educational content creator for students aged ${ageGroup}.
Generate a PowerPoint presentation. Return ONLY valid JSON:
{
  "title": "...", "subject": "...", "class_level": "...",
  "sections": [{
    "title": "...", "concepts": ["..."],
    "scenes": [{ "scene_id": "S1", "scene_goal": "...", "image_prompt": "..." }]
  }]
}

${baseRules}${historySection}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: isModification ? `Modification: ${prompt}` : `Create a presentation about: ${prompt}` },
    ],
    temperature: 0.7, max_tokens: 2048,
    response_format: { type: "json_object" },
  });

  return JSON.parse(res.choices[0]?.message?.content ?? "{}") as PPTInput;
}

async function generateSceneImages(structure: PPTInput): Promise<PPTInput> {
  const enriched = JSON.parse(JSON.stringify(structure)) as PPTInput;
  for (let si = 0; si < enriched.sections.length; si++) {
    for (let sci = 0; sci < enriched.sections[si].scenes.length; sci++) {
      const scene = enriched.sections[si].scenes[sci];
      try {
        const rawPrompt = scene.image_prompt?.trim() || `${scene.scene_goal} — ${enriched.sections[si].title}`;
        console.log(`[generate-ppt] Image for ${scene.scene_id}: "${rawPrompt.slice(0, 60)}..."`);
        const buffer = await generateImage(rawPrompt, "fal-flux2pro", true);
        enriched.sections[si].scenes[sci].imageBase64 = buffer.toString("base64");
      } catch (err) {
        console.error(`[generate-ppt] Image failed for ${scene.scene_id}:`, err);
      }
    }
  }
  return enriched;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, ageGroup = "11-13", conversationHistory } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const { existingSlides, cleanPrompt } = extractExistingSlides(prompt);
    const isModification = !!existingSlides;

    // Extract the section summary from the original prompt context for GPT
  const slideSummaryStart = prompt.indexOf('[Slides titled "');
  const slideSummaryEnd   = slideSummaryStart > -1 ? prompt.indexOf(']', slideSummaryStart) : -1;
  const slideSummaryMatch  = slideSummaryStart > -1 && slideSummaryEnd > -1
    ? prompt.slice(slideSummaryStart, slideSummaryEnd + 1).match(/\[Slides titled "[^"]*": ([\s\S]*?)\]/)
    : null;
    const existingSummary = slideSummaryMatch ? slideSummaryMatch[1] : undefined;

    console.log(`[generate-ppt] mode=${isModification ? "modify" : "fresh"}`);

    const structure = await generateSlideStructure(cleanPrompt, ageGroup, isModification, existingSummary, conversationHistory);
    console.log(`[generate-ppt] ${structure.sections.length} sections`);

    const enriched  = await generateSceneImages(structure);
    const pptBuffer = await generatePPT(enriched);
    const pptBase64 = Buffer.from(pptBuffer).toString("base64");

    return NextResponse.json({
      title: structure.title, subject: structure.subject,
      sections: enriched.sections, pptBase64,
    });
  } catch (err) {
    console.error("[generate-ppt]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "PPT generation failed" }, { status: 500 });
  }
}