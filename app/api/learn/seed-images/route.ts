import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { LEARN_PATH_SEEDS } from "@/lib/learnSeeds";

export const runtime    = "nodejs";
export const maxDuration = 300;

async function falGenerate(prompt: string): Promise<string> {
  const endpoint = "fal-ai/flux-pro/v1.1";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `${prompt}, educational illustration for middle school students, bright cheerful colours, clean simple composition, no text, no words, no letters`,
      image_size: "landscape_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: "2",
    }),
  });
  if (!res.ok) throw new Error(`fal submit failed: ${res.status}`);
  const { request_id } = await res.json();

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { "Authorization": `Key ${process.env.FAL_KEY}` },
    });
    const data = await poll.json();
    if (data.status === "COMPLETED") {
      const url = data.output?.images?.[0]?.url;
      if (!url) throw new Error("No image in response");
      return url;
    }
    if (data.status === "FAILED") throw new Error("fal generation failed");
  }
  throw new Error("Timed out waiting for image");
}

async function generateAndUpload(imagePrompt: string, key: string): Promise<string> {
  const url     = await falGenerate(imagePrompt);
  const imgRes  = await fetch(url);
  const buffer  = Buffer.from(await imgRes.arrayBuffer());
  const supabase = createAdminClient();
  const path    = `learn-seeds/${key}.webp`;

  const { error } = await supabase.storage
    .from("creations-media")
    .upload(path, buffer, { contentType: "image/webp", upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from("creations-media").getPublicUrl(path);
  return pub.publicUrl;
}

export async function POST(req: NextRequest) {
  const { sectionIds } = await req.json().catch(() => ({}));

  const sections = sectionIds
    ? Object.entries(LEARN_PATH_SEEDS).filter(([id]) => (sectionIds as string[]).includes(id))
    : Object.entries(LEARN_PATH_SEEDS);

  const results: Array<{ sectionId: string; cardIndex: number; imageUrl: string }> = [];
  const errors:  Array<{ sectionId: string; cardIndex: number; error: string }>    = [];

  for (const [sectionId, cards] of sections) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card.imagePrompt) continue;
      const key = `${sectionId}-${i}`;
      try {
        const imageUrl = await generateAndUpload(card.imagePrompt, key);
        results.push({ sectionId, cardIndex: i, imageUrl });
        console.log(`✓ ${key} → ${imageUrl}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ sectionId, cardIndex: i, error: msg });
        console.error(`✗ ${key}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    generated: results.length,
    failed:    errors.length,
    results,
    errors,
    instructions: "Copy each imageUrl into lib/learnSeeds.ts matching sectionId + cardIndex.",
  });
}
