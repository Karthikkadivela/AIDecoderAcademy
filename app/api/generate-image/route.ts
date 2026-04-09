import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { generateImage } from "@/lib/imageGenerator";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    console.log("[generate-image] Generating for prompt:", prompt.slice(0, 80));

    // Generate using fal.ai Flux (not Gemini — avoids quota usage)
    const buffer = await generateImage(prompt, "fal-flux2pro", true);

    // Upload to Supabase Storage
    const supabase = createAdminClient();
    const filename = `images/${userId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("creations-media")
      .upload(filename, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("[generate-image] Upload error:", uploadError.message);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("creations-media").getPublicUrl(filename);
    console.log("[generate-image] Done →", data.publicUrl);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[generate-image]", err);
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}