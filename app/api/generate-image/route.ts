import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { generateImage } from "@/lib/imageGenerator";
import { NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 120;

// Extract existing image URL from creation context if present
function extractImageUrl(prompt: string): { imageUrl: string | null; cleanPrompt: string } {
  const imgStart = prompt.indexOf('[Image titled "');
  const imgEnd   = imgStart > -1 ? prompt.indexOf(']', imgStart) : -1;
  const match    = imgStart > -1 && imgEnd > -1
    ? prompt.slice(imgStart, imgEnd + 1).match(/\[Image titled "[^"]*": (https?:\/\/[^\]]+)\]/)
    : null;
  if (match) {
    const imageUrl   = match[1].trim();
    const cleanPrompt = prompt.replace(match[0], "").trim();
    return { imageUrl, cleanPrompt };
  }
  return { imageUrl: null, cleanPrompt: prompt };
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const { imageUrl, cleanPrompt } = extractImageUrl(prompt);

    if (imageUrl) {
      console.log("[generate-image] Image-to-image mode — refining existing image");
      console.log("[generate-image] Source:", imageUrl.slice(0, 60));
      console.log("[generate-image] Modification:", cleanPrompt.slice(0, 80));
    } else {
      console.log("[generate-image] Text-to-image mode:", cleanPrompt.slice(0, 80));
    }

    const buffer = await generateImage(cleanPrompt, "fal-flux2pro", true, imageUrl ?? undefined);

    const supabase = createAdminClient();
    const filename = `images/${userId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("creations-media")
      .upload(filename, buffer, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("[generate-image] Upload error:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("creations-media").getPublicUrl(filename);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[generate-image]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Image generation failed" }, { status: 500 });
  }
}