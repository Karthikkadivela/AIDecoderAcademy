import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { generateImage } from "@/lib/imageGenerator";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const runtime     = "nodejs";
export const maxDuration = 120;

// Extract existing image URL from creation context if present (manual creation picker injection)
function extractImageUrl(prompt: string): { imageUrl: string | null; cleanPrompt: string } {
  const imgStart = prompt.indexOf('[Image titled "');
  const imgEnd   = imgStart > -1 ? prompt.indexOf(']', imgStart) : -1;
  const match    = imgStart > -1 && imgEnd > -1
    ? prompt.slice(imgStart, imgEnd + 1).match(/\[Image titled "[^"]*": (https?:\/\/[^\]]+)\]/)
    : null;
  if (match) {
    const imageUrl    = match[1].trim();
    const cleanPrompt = prompt.replace(match[0], "").trim();
    return { imageUrl, cleanPrompt };
  }
  return { imageUrl: null, cleanPrompt: prompt };
}

// Converts conversation history + user request into a vivid image prompt
async function buildImagePrompt(conversationHistory: string, userPrompt: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model:    "gpt-4o-mini",
    messages: [
      {
        role:    "system",
        content: "You are a visual description writer for an AI image generator. Read the conversation history and the user's request, then write a detailed, vivid image prompt. Output ONLY the image prompt — no explanation, no quotes, no extra text. Max 80 words.",
      },
      {
        role:    "user",
        content: `Conversation history:\n${conversationHistory}\n\nUser's request: ${userPrompt || "generate an image based on this context"}\n\nWrite a visual image prompt.`,
      },
    ],
    temperature: 0.7,
    max_tokens:  150,
  });
  return res.choices[0]?.message?.content?.trim() ?? userPrompt;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, conversationHistory } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const { imageUrl, cleanPrompt } = extractImageUrl(prompt);
    let finalPrompt = cleanPrompt;

    if (imageUrl) {
      // img2img mode — user injected an existing image via creation picker
      console.log("[generate-image] img2img mode — source:", imageUrl.slice(0, 60));
      console.log("[generate-image] modification:", cleanPrompt.slice(0, 80));
    } else if (conversationHistory?.trim() && cleanPrompt.trim().split(/\s+/).length <= 6) {
      // History-aware mode only for short/ambiguous prompts (≤6 words) like "another one" or "similar".
      // For clear prompts the user's words are used directly — no GPT rewrite that could
      // silently blend unrelated conversation context into the image subject.
      console.log("[generate-image] history-aware mode (short prompt)");
      finalPrompt = await buildImagePrompt(conversationHistory, cleanPrompt);
      console.log("[generate-image] resolved prompt:", finalPrompt.slice(0, 80));
    } else {
      console.log("[generate-image] direct mode:", cleanPrompt.slice(0, 80));
    }

    const buffer = await generateImage(finalPrompt, "fal-flux2pro", true, imageUrl ?? undefined);

    const supabase  = createAdminClient();
    const filename  = `images/${userId}/${Date.now()}.png`;

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
