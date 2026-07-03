import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CONCEPT_SEEDS } from "@/lib/blogSeeds";

export const runtime     = "nodejs";
export const maxDuration = 300;

async function openrouterGenerate(prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:  "openai/gpt-image-2",
      prompt: `${prompt}, educational illustration for middle school students aged 13-16, bright cheerful vivid colours, clean simple composition, no text overlays, no words, no letters`,
      n:      1,
      size:   "1024x1024",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const item = data.data?.[0];
  if (!item) throw new Error("No image in response");

  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item.url)      return item.url;
  throw new Error(`Unexpected response shape: ${JSON.stringify(item)}`);
}

async function generateAndUpload(imagePrompt: string, key: string): Promise<string> {
  const imageSource = await openrouterGenerate(imagePrompt);

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
