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
  // Blog context (phase 2)
  blogPhase?: string;
  blogConceptCardTitle?: string;
  blogConceptCardHook?: string;
  blogConceptCardBody?: string[];
  blogConceptCards?: { title: string; hook: string }[];
  blogStepInstruction?: string;
  blogStepWhy?: string;
  blogProblemIdx?: number;
  blogStepIdx?: number;
  // Cross-section navigation
  activeSectionId?: string;
  crossSectionContext?: { sectionId: string; sectionTitle: string; conceptCards: { title: string; hook: string }[] }[];
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
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null,"action":null,"conceptIdx":null}`;
  }

  // ── Build cross-section knowledge block (shared by both phase-2 branches) ─
  const crossSectionBlock = (() => {
    if (!ctx.crossSectionContext?.length) return "";
    const lines = ctx.crossSectionContext.map(s => {
      const cards = s.conceptCards.map((c, i) => `      ${i}: "${c.title}"`).join("\n");
      const marker = s.sectionId === ctx.activeSectionId ? " ← CURRENT SECTION" : "";
      return `  Section "${s.sectionTitle}" (id: ${s.sectionId})${marker}:\n${cards || "      (no concept cards)"}`;
    }).join("\n");
    return `\nAll sections in this chapter (for cross-section navigation):\n${lines}`;
  })();

  // ── Phase 2 — Blog Concept explainer ─────────────────────────────────────
  if (ctx.phaseId === 2 && ctx.blogPhase === "concept") {
    const conceptMap = ctx.blogConceptCards
      ?.map((c, i) => `  ${i}: "${c.title}" — ${c.hook}`)
      .join("\n") ?? "";

    const bodyBlock = ctx.blogConceptCardBody?.length
      ? `\nFull explanation of current card:\n${ctx.blogConceptCardBody.map((p, i) => `  [${i + 1}] ${p}`).join("\n")}`
      : "";

    return `You are Ms. Aria, a warm and enthusiastic ${ctx.subject} teacher.
You're guiding ${ctx.studentName} through the CONCEPT phase of "${ctx.sectionTitle}".
Currently showing concept card: "${ctx.blogConceptCardTitle}"
Hook: "${ctx.blogConceptCardHook}"${bodyBlock}

Concept cards in this section (index: title — hook):
${conceptMap}
${crossSectionBlock}

Your job:
- Answer any question about the current concept in 1–3 spoken sentences.
- If the student says they don't understand a specific concept that exists IN THIS SECTION → action "go_to_concept_card" with the matching index.
- If the concept the student asks about is in a DIFFERENT section → action "navigate_section" with the matching sectionId.
- If the student says "next", "continue", "move on" → action "next_concept_card".
- If the student says "go back", "previous" → action "prev_concept_card".
- If the student says "I'm ready", "let's try problems", "start solving" → action "start_solving".
- Keep reply to 1–2 sentences max. No markdown. Spoken language only.

ALWAYS respond with valid JSON (no markdown, no code fences):
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null,"action":null,"conceptIdx":null,"sectionId":null}`;
  }

  // ── Phase 2 — Blog Problems walkthrough ──────────────────────────────────
  if (ctx.phaseId === 2 && ctx.blogPhase === "problems") {
    const whyBlock = ctx.blogStepWhy
      ? `\nWhy this step works: "${ctx.blogStepWhy}"`
      : "";

    return `You are Ms. Aria, a warm and enthusiastic ${ctx.subject} teacher.
You're guiding ${ctx.studentName} through the PROBLEMS phase of "${ctx.sectionTitle}".
Current step instruction: "${ctx.blogStepInstruction}" (problem ${(ctx.blogProblemIdx ?? 0) + 1}, step ${(ctx.blogStepIdx ?? 0) + 1})${whyBlock}
${crossSectionBlock}

Your job:
- Help the student understand the current step if they're confused. Use the "Why" text above.
- If student says "next", "got it", "continue" → action "next_step".
- If student says "go back", "previous step" → action "prev_step".
- If student mentions a concept from THIS section (e.g. "explain ratio" while in the ratios section) → action "go_to_concept".
- If student mentions a concept from a DIFFERENT section (check the cross-section list above) → action "navigate_section" with the correct sectionId.
- Keep reply to 1–2 sentences. No markdown. Spoken language only.

ALWAYS respond with valid JSON (no markdown, no code fences):
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null,"action":null,"conceptIdx":null,"sectionId":null}`;
  }

  // ── Turn 1: Spark/Challenge/Reflect — normal conversation + answer detection
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
{"reply":"your spoken reply here","answerDetected":false,"selectedOptionIndex":null,"action":null,"conceptIdx":null}`;
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
      blogPhase?: string;
      blogConceptCardTitle?: string;
      blogConceptCardHook?: string;
      blogConceptCardBody?: string[];
      blogConceptCards?: { title: string; hook: string }[];
      blogStepInstruction?: string;
      blogStepWhy?: string;
      blogProblemIdx?: number;
      blogStepIdx?: number;
      activeSectionId?: string;
      crossSectionContext?: { sectionId: string; sectionTitle: string; conceptCards: { title: string; hook: string }[] }[];
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
  let action: string | null = null;
  let conceptIdx: number | null = null;
  let sectionId: string | null = null;

  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      answerDetected?: boolean;
      selectedOptionIndex?: number | null;
      action?: string | null;
      conceptIdx?: number | null;
      sectionId?: string | null;
    };
    const replyVal = parsed.reply ?? "";
    reply = replyVal.trimStart().startsWith("{") ? reply : replyVal || reply;

    // Answer detection (Spark phase only)
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

    // Blog navigation action (phase 2 only)
    if (context.phaseId === 2 && parsed.action && parsed.action !== "null") {
      action = parsed.action;
      if (typeof parsed.conceptIdx === "number") conceptIdx = parsed.conceptIdx;
      if (typeof parsed.sectionId === "string") sectionId = parsed.sectionId;
    }
  } catch {
    reply = "That's interesting! Tell me more.";
  }

  return NextResponse.json({ reply, answerDetected, selectedOptionIndex, action, conceptIdx, sectionId });
}
