import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

const URLS: Record<string, string> = {
  "what-is-a-ratio-0": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-0.png",
  "what-is-a-ratio-1": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-1.png",
  "what-is-a-ratio-2": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-2.png",
  "what-is-a-ratio-3": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-3.png",
  "equivalent-ratios-0": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-0.png",
  "equivalent-ratios-1": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-1.png",
  "equivalent-ratios-2": "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-2.png",
};

export async function POST() {
  const filePath = join(process.cwd(), "lib", "blogSeeds.ts");
  let content = readFileSync(filePath, "utf-8");
  let replaced = 0;

  // Each card has imagePrompt then imageUrl: "". Replace each empty imageUrl in order.
  // Strategy: replace `imageUrl: "",` → `imageUrl: "<url>",` sequentially per section.

  // For what-is-a-ratio section (4 cards, indices 0-3)
  for (let i = 0; i <= 3; i++) {
    const url = URLS[`what-is-a-ratio-${i}`];
    content = content.replace(`imageUrl: "",`, `imageUrl: "${url}",`);
    replaced++;
  }

  // For equivalent-ratios section (3 cards, indices 0-2)
  for (let i = 0; i <= 2; i++) {
    const url = URLS[`equivalent-ratios-${i}`];
    content = content.replace(`imageUrl: "",`, `imageUrl: "${url}",`);
    replaced++;
  }

  writeFileSync(filePath, content, "utf-8");
  return NextResponse.json({ ok: true, replaced });
}
