import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CONCEPT_SEEDS } from "@/lib/blogSeeds";

export const runtime     = "nodejs";
export const maxDuration = 300;

async function falGenerate(prompt: string): Promise<string> {
  const endpoint = "openai/gpt-image-2";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.FAL_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      prompt:     `${prompt}, educational illustration for middle school students aged 13-16, bright cheerful vivid colours, clean simple composition, no text overlays, no words, no letters`,
      image_size: "square_hd",
      quality:    "low",
      n:          1,
    }),
  });

  if (!res.ok) throw new Error(`fal submit failed: ${res.status}`);
  const { request_id } = await res.json();

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 4000));
    const poll = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { "Authorization": `Key ${process.env.FAL_KEY}` },
    });
    if (!poll.ok) continue;
    const data = await poll.json();
    const directUrl = data.images?.[0]?.url;
    if (directUrl) return directUrl;
    if (data.status === "COMPLETED") {
      const url = data.output?.images?.[0]?.url;
      if (url) return url;
    }
    if (data.status === "FAILED") throw new Error("fal generation failed");
  }
  throw new Error("Timed out waiting for image");
}

async function generateAndUpload(imagePrompt: string, key: string): Promise<string> {
  const imageSource = await falGenerate(imagePrompt);

  let buffer: Buffer;
  if (imageSource.startsWith("data:")) {
    const b64 = imageSource.split(",")[1];
    buffer = Buffer.from(b64, "base64");
  } else {
    const imgRes = await fetch(imageSource);
    if (!imgRes.ok) throw new Error(`Failed to download image from ${imageSource}`);
    buffer = Buffer.from(await imgRes.arrayBuffer());
  }

  const supabase = createAdminClient();
  const path     = `learn-seeds/concept-${key}.png`;

  const { error } = await supabase.storage
    .from("creations-media")
    .upload(path, buffer, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: pub } = supabase.storage.from("creations-media").getPublicUrl(path);
  return pub.publicUrl;
}

export async function POST(req: NextRequest) {
  const { sectionIds } = await req.json().catch(() => ({}));

  const sections = sectionIds
    ? Object.entries(CONCEPT_SEEDS).filter(([id]) => (sectionIds as string[]).includes(id))
    : Object.entries(CONCEPT_SEEDS);

  const results: Array<{ sectionId: string; cardIndex: number; imageUrl: string }> = [];
  const errors:  Array<{ sectionId: string; cardIndex: number; error: string }>    = [];

  for (const [sectionId, { cards }] of sections) {
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
    generated:    results.length,
    failed:       errors.length,
    results,
    errors,
    instructions: "Copy each imageUrl into lib/blogSeeds.ts matching sectionId + cardIndex.",
  });
}
