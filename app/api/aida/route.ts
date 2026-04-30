import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";
import { queryContext } from "@/lib/pinecone";
import { getPageDoc } from "@/lib/aidaDocs";
import { isEnabled } from "@/lib/featureFlags";
import { buildAidaSystemPrompt } from "@/lib/aidaPersona";
import { moderateContent, detectDistress, buildDistressFooter, getRefusalLine } from "@/lib/aidaSafety";
import type { Profile, AgeGroup } from "@/types";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      message,
      history = [],
      pathname = "/dashboard",
      playgroundSession,
      playgroundImages = [],
      interruptedContext,
      isVoiceMode = false,
      profile,
    }: {
      message:              string;
      history:              { role: "user" | "assistant"; content: string }[];
      pathname:             string;
      playgroundSession?:   string;
      playgroundImages?:    string[];
      interruptedContext?:  string;
      isVoiceMode?:         boolean;
      profile: Profile;
    } = body;

    if (!message?.trim()) return new Response("Bad request", { status: 400 });

    // ── Pre-flight safety check ──────────────────────────────────────────────
    let distressFlag = false;
    if (isEnabled("USE_NEW_AIDA_PROMPTS")) {
      const inputVerdict = await moderateContent(message);
      if (!inputVerdict.allow) {
        const refusal = getRefusalLine(profile.age_group as AgeGroup);
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(refusal));
            controller.close();
          },
        });
        return new Response(readable, {
          headers: {
            "Content-Type":      "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control":     "no-cache",
          },
        });
      }
      distressFlag = detectDistress(message);
    }

    // ── Fetch student's profile ID from Supabase ─────────────────────────────
    const supabase = createAdminClient();
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    const profileId = profileRow?.id as string | undefined;

    // ── Search relevant creations from Pinecone ───────────────────────────────
    let creationsContext = "";
    if (profileId) {
      try {
        const results = await queryContext({ profileId, query: message, topK: 5 });
        if (results.length > 0) {
          creationsContext = "\n\nStudent's relevant creations:\n" +
            results.map(r =>
              `- "${r.title}" (${r.outputType})${r.tags ? ` [tags: ${r.tags}]` : ""}${r.promptUsed ? ` — made with prompt: "${r.promptUsed}"` : ""}`
            ).join("\n");
        }
      } catch {
        // Pinecone failure is non-fatal
      }
    }

    // ── Build session context ─────────────────────────────────────────────────
    // Prefer live playground session (passed from client) over DB fetch.
    let sessionContext = "";
    if (playgroundSession && playgroundSession.trim()) {
      sessionContext = "\n\nStudent's current playground session (live):\n" + playgroundSession;
    } else if (profileId) {
      try {
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("profile_id", profileId)
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        if (session?.id) {
          const { data: msgs } = await supabase
            .from("chat_messages")
            .select("role, content")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(6);

          if (msgs && msgs.length > 0) {
            const recent = [...msgs].reverse();
            sessionContext = "\n\nStudent's most recent playground conversation:\n" +
              recent.map(m => `${m.role === "user" ? "Student" : "AI"}: ${String(m.content).slice(0, 300)}`).join("\n");
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // ── Build system prompt ───────────────────────────────────────────────────
    const arenaNames: Record<number, string> = {
      1: "AI Explorer Arena", 2: "Prompt Lab", 3: "Story Forge",
      4: "Visual Studio",     5: "Sound Booth", 6: "Director's Suite",
    };

    const isOnPlayground = pathname.startsWith("/dashboard/playground");

    const systemPrompt = isEnabled("USE_NEW_AIDA_PROMPTS")
      ? buildAidaSystemPrompt({
          profile:           profile as Profile,
          pageContext:       getPageDoc(pathname),
          sessionContext:    sessionContext || undefined,
          creationsContext:  creationsContext || undefined,
          isVoiceMode,
          interruptedContext,
        })
      : `You are AIDA, an AI assistant built into AI Decoder Academy — a creative AI learning platform for students aged 11–16.${interruptedContext ? `\n\nIMPORTANT: The student just interrupted you mid-response. You were in the middle of saying: "${interruptedContext.slice(0, 400)}". Acknowledge the new question briefly, answer it clearly, then offer to continue your previous explanation if it's still relevant.` : ""}

About the student you're talking to:
- Name: ${profile.display_name}
- Age group: ${profile.age_group}
- Interests: ${profile.interests?.join(", ") || "not set"}
- XP: ${profile.xp}, Level: ${profile.level}, Streak: ${profile.streak_days} days
- Current arena: ${arenaNames[profile.active_arena] ?? "AI Explorer Arena"}

Current page context:
${getPageDoc(pathname)}
${creationsContext}
${sessionContext}

Instructions:
- You are AIDA — friendly, warm, and encouraging. Adapt your language to the student's age group.
- You can answer ANY question — school subjects, general knowledge, coding, creative ideas, or questions about this app. You are not restricted to any topic.
- When answering questions about the student's creations or activity, use the context provided above.
- Keep responses concise and easy to understand. Use simple language for younger students.
- If the student asks about a feature or page in the app, use the page context to guide them accurately.
${isOnPlayground && sessionContext ? `
Playground coaching instructions (IMPORTANT — follow these when the student asks about their creations):
- You can see everything the student generated in their current playground session above.
- If the student asks "why did it turn out like this?" or "why didn't it work?", look at their prompt and the output type, then explain in simple terms what likely caused it — e.g., vague description, missing details, too many conflicting ideas, or unclear instructions.
- For IMAGE prompts: look for missing details like style, lighting, colours, mood, or a clear subject.
- For AUDIO prompts: look for whether they named characters, set a scene, gave emotions, or described the story clearly.
- For SLIDES prompts: look for whether they gave a clear topic, structure, or level of detail.
- For TEXT/JSON prompts: look at whether the instruction was clear, specific, and had enough context.
- ALWAYS frame mistakes as learning moments — never criticise, always encourage.
- Before giving the full answer, offer a choice: e.g., "Want me to just tell you what to fix, or would you prefer a hint so you can figure it out yourself?" Let the student decide.
- If they want a hint: give one small clue, then ask if they want another.
- If they want the full answer: explain clearly then offer to help rewrite the prompt together.
- Keep explanations short, fun, and age-appropriate. Use analogies kids relate to.
` : ""}`;

    // ── Stream response ───────────────────────────────────────────────────────
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: "text", text: message },
      ...(playgroundImages.slice(0, 4).map(url => ({
        type: "image_url" as const,
        image_url: { url, detail: "low" as const },
      }))),
    ];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map(m => ({
        role:    m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role:    "user",
        content: playgroundImages.length > 0 ? userContent : message,
      },
    ];

    const stream = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      messages,
      stream:      true,
      temperature: 0.7,
      max_tokens:  isVoiceMode ? 300 : 800,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullText += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        // Append distress footer if the user message triggered detection
        if (distressFlag) {
          const footer = buildDistressFooter("auto");
          controller.enqueue(encoder.encode(footer));
        }
        // Defensive post-hoc moderation on the assistant response (fire-and-forget)
        if (isEnabled("USE_NEW_AIDA_PROMPTS") && fullText) {
          moderateContent(fullText).then(v => {
            if (!v.allow) {
              console.warn("[aida] post-hoc moderation flagged assistant output:", v.reason);
            }
          }).catch(() => { /* logged inside moderateContent */ });
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type":      "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control":     "no-cache",
      },
    });
  } catch (err) {
    console.error("[AIDA]", err);
    return new Response("Internal server error", { status: 500 });
  }
}
