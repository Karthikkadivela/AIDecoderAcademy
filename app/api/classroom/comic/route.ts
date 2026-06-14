/**
 * POST /api/classroom/comic
 *
 * Generates a 4-panel educational comic strip for a classroom chapter.
 * Step 1 — GPT-4o-mini writes panel scripts (JSON).
 * Step 2 — Imagen4 / fal.ai generates one image per panel in parallel.
 * Step 3 — Images uploaded to Supabase Storage; public URLs returned.
 */

import { auth }             from "@clerk/nextjs/server";
import OpenAI               from "openai";
import { createAdminClient } from "@/lib/supabase";
import { generateImage }    from "@/lib/imageGenerator";

export const runtime     = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface Panel {
  number:    number;
  title:     string;
  scene:     string;
  dialogue:  { speaker: string; text: string }[];
  concept:   string;
  imagePrompt: string;
}

interface ComicScript {
  panels:        Panel[];
  keyTakeaways:  string[];
}

const SCRIPT_SYSTEM = `
You are an educational comic writer for CBSE Class 10 Science.
Generate a 4-panel comic strip script as strict JSON — no markdown, no prose outside JSON.

Characters (keep CONSISTENT across all panels):
- Arya: 15-year-old Indian student, school uniform (white shirt, navy trousers), short black hair, curious expression.
- Dr. Spark: enthusiastic scientist, lab coat with star patches, round glasses, messy grey hair, big smile.

JSON schema (return ONLY valid JSON, nothing else):
{
  "panels": [
    {
      "number": 1,
      "title": "short panel title",
      "scene": "One vivid sentence describing the VISUAL setting and action — use real-world analogies.",
      "dialogue": [
        { "speaker": "Arya",     "text": "max 12 words" },
        { "speaker": "Dr. Spark","text": "max 15 words, explains one concept clearly" }
      ],
      "concept": "The exact CBSE syllabus fact illustrated here — 1 sentence.",
      "imagePrompt": "Detailed image generation prompt for this panel: art style (manga/anime, bright educational), character poses, expressions, setting, props, speech bubble text visible in image. 60-80 words."
    }
  ],
  "keyTakeaways": ["fact 1", "fact 2", "fact 3"]
}

Rules:
- Exactly 4 panels. Each teaches a different aspect of the topic.
- Panel 1: introduce the concept with curiosity.
- Panel 2: core definition or law, with an analogy.
- Panel 3: real-world application or experiment.
- Panel 4: surprising fact or exam tip.
- Keep dialogue short and punchy — this is a COMIC not an essay.
- Every imagePrompt must include: "educational manga/anime comic panel style, bright colors, clean ink lines, Indian student Arya and scientist Dr. Spark"
`.trim();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { chapterTitle } = await req.json() as { chapterTitle: string };
    if (!chapterTitle?.trim()) return new Response("chapterTitle required", { status: 400 });

    // ── Step 1: Generate comic script ─────────────────────────────────────────
    const scriptRes = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature: 0.7,
      max_tokens:  1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCRIPT_SYSTEM },
        { role: "user",   content: `Chapter: "${chapterTitle}" — CBSE Class 10 Science. Generate the 4-panel comic strip JSON now.` },
      ],
    });

    let script: ComicScript;
    try {
      script = JSON.parse(scriptRes.choices[0].message.content ?? "{}") as ComicScript;
      if (!Array.isArray(script.panels) || script.panels.length === 0) throw new Error("bad script");
    } catch {
      return new Response("Failed to parse comic script", { status: 500 });
    }

    const panels = script.panels.slice(0, 4);

    // ── Step 2: Generate images in parallel ───────────────────────────────────
    const supabase = createAdminClient();

    const imageResults = await Promise.allSettled(
      panels.map(async (panel) => {
        const buf = await generateImage(panel.imagePrompt, "fal-flux2pro", true);
        const filename = `images/${userId}/comic-${chapterTitle.replace(/\s+/g, "_").slice(0, 30)}-p${panel.number}-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from("creations-media")
          .upload(filename, buf, { contentType: "image/png", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("creations-media").getPublicUrl(filename);
        return data.publicUrl;
      })
    );

    const panelImages = imageResults.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );

    return Response.json({
      panels:       panels.map((p, i) => ({ ...p, imageUrl: panelImages[i] })),
      keyTakeaways: script.keyTakeaways ?? [],
      chapterTitle,
    });
  } catch (err) {
    console.error("[classroom/comic]", err);
    return new Response("Internal error", { status: 500 });
  }
}
