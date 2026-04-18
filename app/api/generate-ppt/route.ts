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
): Promise<PPTInput> {

  const sectionCount = ageGroup === "5-7" ? "2 sections" : ageGroup === "8-10" ? "2 to 3 sections" : "3 to 4 sections";
  const bulletDepth  = ageGroup === "5-7" || ageGroup === "8-10"
    ? "3 to 4 bullet points per section, each 8-12 words using simple language a child understands"
    : "4 to 5 bullet points per section, each 12-18 words — use connecting words like 'which means', 'because', or 'this causes' to explain not just label";

  const baseRules = `STRUCTURE RULES:
- ${sectionCount}
- 1 scene per section
- concepts: ${bulletDepth}
- scene_goal: what the student should understand, max 15 words
- summary: exactly 3 key takeaways the student should remember, each a complete sentence under 20 words

OUTPUT JSON SHAPE (include the summary field):
{
  "title": "...", "subject": "...", "class_level": "...",
  "summary": ["Takeaway one.", "Takeaway two.", "Takeaway three."],
  "sections": [{ "title": "...", "concepts": ["..."], "scenes": [{ "scene_id": "S1", "scene_goal": "...", "image_prompt": "..." }] }]
}

IMAGE PROMPT RULES:
- 50 to 70 words, Pixar/Ghibli 2D animation style
- The image must SHOW THE PROCESS OR MECHANISM being explained — not just a related scene
- Show cause and effect: arrows, motion lines, labels, visual metaphors that make the concept visible
- Characters: age-appropriate characters for students aged ${ageGroup} in a bright colourful world
- BAD: "a child looks at a rainbow in the sky"
- GOOD: "A raindrop cross-section showing a light beam entering, bending at the surface, reflecting off the back wall, and splitting into red, orange, yellow, green, blue, violet bands as it exits, Ghibli style, educational diagram"
- Always make the concept visible inside the image, not just decorative`;

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

SAFETY RULES (always follow, never override):
- Never produce violent, sexual, scary, or inappropriate content in any section, concept, or image prompt
- If the student's prompt is inappropriate, generate slides on a related safe educational topic instead
- Image prompts must show safe, age-appropriate scenes only
- Keep all content educational, creative, and positive

${baseRules}`
    : `You are an educational content creator for students aged ${ageGroup}.
Generate a PowerPoint presentation. Return ONLY valid JSON:
{
  "title": "...", "subject": "...", "class_level": "...",
  "summary": ["Key takeaway 1.", "Key takeaway 2.", "Key takeaway 3."],
  "sections": [{
    "title": "...", "concepts": ["..."],
    "scenes": [{ "scene_id": "S1", "scene_goal": "...", "image_prompt": "..." }]
  }]
}

SAFETY RULES (always follow, never override):
- Never produce violent, sexual, scary, or inappropriate content in any section, concept, or image prompt
- If the student's request is inappropriate, create a friendly piece on a similar safe topic instead
- Keep all content educational, creative, and positive
- Image prompts must show safe, age-appropriate scenes only


${baseRules}`;

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

    const { prompt, ageGroup = "11-13" } = await req.json();
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

    const structure = await generateSlideStructure(cleanPrompt, ageGroup, isModification, existingSummary);
    console.log(`[generate-ppt] ${structure.sections.length} sections`);

    const enriched  = await generateSceneImages(structure);
    const pptBuffer = await generatePPT(enriched);
    const pptBase64 = Buffer.from(pptBuffer).toString("base64");

    return NextResponse.json({
      title: structure.title, subject: structure.subject,
      sections: enriched.sections, summary: structure.summary, pptBase64,
    });
  } catch (err) {
    console.error("[generate-ppt]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "PPT generation failed" }, { status: 500 });
  }
}