import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";
import { buildSystemPrompt } from "@/lib/prompts";
import { ARENAS } from "@/lib/arenas";
import type { ChatRequest } from "@/types";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const OUTPUT_INSTRUCTIONS: Record<string, string> = {
  text: "Respond in clear, readable text. Only use markdown formatting (headers, bullet lists) if the child is aged 8 or older and it genuinely helps clarity — never use markdown for simple conversational replies.",
  json: "Respond ONLY with valid JSON. No explanation, no backticks — just the raw JSON.",
};

function generateTitleLocally(msg: string): string {
  return msg.replace(/[^a-zA-Z0-9 ]/g, " ").trim()
    .split(" ").filter(Boolean).slice(0, 5).join(" ") || "New chat";
}

function getStaticWelcome(name: string, mode: string): string {
  const g: Record<string, string> = {
    story: `Hey ${name}! 📖 Welcome to Story Builder! What kind of story do you want to write today?`,
    code:  `Hey ${name}! 💻 Welcome to Code Lab! What would you like to create today?`,
    art:   `Hey ${name}! 🎨 Welcome to Art Studio! What kind of art are you imagining?`,
    quiz:  `Hey ${name}! 🧠 Welcome to Quiz Zone! What topic shall we explore?`,
    free:  `Hey ${name}! 🚀 Welcome to your AI playground! What are you curious about today?`,
  };
  return g[mode] ?? g.free;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body: ChatRequest = await req.json();
    const { message, sessionId, mode, outputType = "text", profile, history, attachments = [] } = body;

    if (!message?.trim()) return new Response("Empty message", { status: 400 });

    const isInit = message === "__init__";
    const supabase = createAdminClient();

    // Get actual profile UUID
    const { data: profileRow } = await supabase
      .from("profiles").select("id").eq("clerk_user_id", userId).single();
    const profileId = profileRow?.id ?? userId;

    // __init__ — stream static welcome, ZERO API calls
    if (isInit) {
      const welcomeText = getStaticWelcome(profile.display_name, mode);
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          const words = welcomeText.split(" ");
          let i = 0;
          const interval = setInterval(() => {
            if (i < words.length) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ text: (i === 0 ? "" : " ") + words[i] })}\n\n`
              ));
              i++;
            } else {
              clearInterval(interval);
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          }, 30);
        },
      });
      return new Response(readable, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // Build system prompt
    const arena = ARENAS.find(a => a.id === (profile.active_arena ?? 1)) ?? ARENAS[0];
    const systemPrompt = buildSystemPrompt(profile.age_group, mode, profile.display_name, profile.interests, arena.tutorPersona);
    const outputInstruction = OUTPUT_INSTRUCTIONS[outputType] ?? OUTPUT_INSTRUCTIONS.text;
    const fullSystem = `${systemPrompt}\n\nOUTPUT FORMAT: ${outputInstruction}`;

    // Build message history for OpenAI
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: fullSystem },
      ...history
        .filter(m => m.content.trim() !== "" && m.content !== "__init__")
        .slice(-20)
        .map(m => ({
          role:    m.role as "user" | "assistant",
          content: m.content,
        })),
    ];

    // Add current message (with attachments if any)
    if (attachments.length > 0) {
      const parts: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: "text", text: message },
        ...attachments
          .filter(a => a.mimeType.startsWith("image/"))
          .map(a => ({
            type: "image_url" as const,
            image_url: { url: `data:${a.mimeType};base64,${a.data}` },
          })),
      ];
      openaiMessages.push({ role: "user", content: parts });
    } else {
      openaiMessages.push({ role: "user", content: message });
    }

    // Stream from OpenAI
    const stream = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      messages:    openaiMessages,
      stream:      true,
      max_tokens:  outputType === "json" ? 2048 : 1024,
      temperature: outputType === "json" ? 0.3 : 0.8,
    });

    // Save user message — encode attachment types as marker suffix for reload
    const attMeta = attachments
      .map((a: { mimeType: string }) =>
        a.mimeType.startsWith("image/") ? "image"
        : a.mimeType.startsWith("audio/") ? "audio"
        : a.mimeType.startsWith("application/pdf") ? "pdf" : "file")
      .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);
    const savedContent = attMeta.length > 0
      ? message + `
__attach:${attMeta.join(",")}__`
      : message;
    supabase.from("chat_messages").insert({
      session_id: sessionId, profile_id: profileId,
      role: "user", content: savedContent, output_type: outputType,
    }).then(() => {});

    // Auto-title first message
    if (history.length === 0) {
      supabase.from("sessions").update({ title: generateTitleLocally(message) })
        .eq("id", sessionId).then(() => {});
    }

    let fullResponse = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          supabase.from("chat_messages").insert({
            session_id: sessionId, profile_id: profileId,
            role: "assistant", content: fullResponse, output_type: outputType,
          }).then(() => {});

          supabase.rpc("increment_message_count", { sid: sessionId }).then(() => {});

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[stream error]", err);
          const errMsg = err instanceof Error && err.message.includes("429")
            ? "⚠️ OpenAI rate limit hit. Please wait a moment and try again."
            : "Oops, something went wrong! Try again? 🙈";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errMsg })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("[chat/route]", err);
    return new Response("Internal error", { status: 500 });
  }
}