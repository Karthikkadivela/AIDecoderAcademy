import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey:  process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});

const PHASE_NAMES: Record<number, string> = {
  1: "Spark (curiosity warm-up)",
  2: "Concept (deep learning)",
  3: "Challenge (test yourself)",
  4: "Reflect (lock it in)",
};

function buildSystemPrompt(ctx: {
  chapterTitle: string;
  subject: string;
  sectionTitle: string;
  phaseId: number;
  activeCardQuestion?: string;
  activeCardOptions?: string[];
  studentName: string;
  awaitingConfidenceAck?: boolean;
}) {
  const phase = PHASE_NAMES[ctx.phaseId] ?? "Study";

  const optionsBlock = ctx.activeCardOptions?.length
    ? `\nThink card options shown:\n${ctx.activeCardOptions.map((o, i) => `  ${String.fromCharCode(65 + i)}: ${o}`).join("\n")}`
    : "";

  // ── Turn 2: student just gave confidence + reasoning ──────────────────────
  if (ctx.awaitingConfidenceAck) {
    return `You are Ms. Aria, a warm and enthusiastic ${ctx.subject} teacher.
You're guiding ${ctx.studentName} through "${ctx.sectionTitle}" in "${ctx.chapterTitle}".

The student just selected an answer to a think card and has now shared how confident they are and their reasoning.
Your job: acknowledge their reasoning warmly in 1–2 sentences, then say something like "Let's flip the card and see what the experts say!" to signal the reveal.
Be enthusiastic. No markdown. Spoken language only.

ALWAYS respond with valid JSON (no markdown, no code fences):
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null}`;
  }

  // ── Turn 1: normal conversation + answer detection ─────────────────────────
  return `You are Ms. Aria, a warm and enthusiastic ${ctx.subject} teacher for Class 8 students.
You're guiding ${ctx.studentName} through "${ctx.sectionTitle}" in the "${ctx.chapterTitle}" chapter.

Current phase: ${phase}
${ctx.activeCardQuestion ? `Active think card question: "${ctx.activeCardQuestion}"` : ""}${optionsBlock}

Your speaking style:
- Keep ALL responses to 1–3 SHORT sentences. This is converted to speech.
- Be warm, energetic, encouraging. No markdown, no bullet points.
- Use "${ctx.studentName}" occasionally (not every sentence).
- In Spark phase: engage with the think card without giving the answer away.
- In Concept phase: help if confused, make real-life connections.
- In Challenge phase: be supportive, mistakes are fine.
- In Reflect phase: celebrate, encourage saving a flashcard or infographic.

Answer detection (Spark phase only, when options are shown):
- If the student is clearly picking one of the options (by letter, number, or content match), set answerDetected: true.
- Your reply should acknowledge their pick and ask "How confident are you about that? And what's your reasoning?"
- If they say "I think A", "the second one", or describe an option's content → match it.
- If it's a question or general comment → answerDetected: false.

ALWAYS respond with valid JSON (no markdown, no code fences):
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null}`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    message,
    history = [],
    context,
  } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    context: {
      chapterTitle: string;
      subject: string;
      sectionTitle: string;
      phaseId: number;
      activeCardQuestion?: string;
      activeCardOptions?: string[];
      studentName: string;
      awaitingConfidenceAck?: boolean;
    };
  };

  const systemPrompt = buildSystemPrompt(context);
  const trimmedHistory = history.slice(-20);

  let raw = "{}";
  try {
    const completion = await openai.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      max_tokens: 200,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedHistory,
        { role: "user",   content: message },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[teacher/route] raw model output:", content.slice(0, 200));
    // Extract the first JSON object — model may wrap output in markdown/prose
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    raw = jsonMatch ? jsonMatch[0] : "{}";
  } catch (e) {
    console.error("[teacher/route] OpenRouter error:", e);
  }

  let reply = "That's interesting! Tell me more.";
  let answerDetected = false;
  let selectedOptionIndex: number | null = null;

  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      answerDetected?: boolean;
      selectedOptionIndex?: number | null;
    };
    // Guard: if reply itself looks like JSON the model double-encoded, fall back
    const replyVal = parsed.reply ?? "";
    reply = replyVal.trimStart().startsWith("{") ? reply : replyVal || reply;
    if (
      context.phaseId === 1 &&
      context.activeCardQuestion &&
      context.activeCardOptions?.length &&
      parsed.answerDetected === true &&
      typeof parsed.selectedOptionIndex === "number" &&
      parsed.selectedOptionIndex >= 0 &&
      parsed.selectedOptionIndex < (context.activeCardOptions?.length ?? 0)
    ) {
      answerDetected = true;
      selectedOptionIndex = parsed.selectedOptionIndex;
    }
  } catch {
    reply = "That's interesting! Tell me more.";
  }

  return NextResponse.json({ reply, answerDetected, selectedOptionIndex });
}
