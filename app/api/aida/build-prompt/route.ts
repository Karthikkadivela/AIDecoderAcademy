import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getObjectiveById } from "@/lib/objectives";
import { getRubric } from "@/lib/objectiveRubrics";
import { getWorksheetSchema } from "@/lib/worksheetSchemas";

export const runtime     = "nodejs";
export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface BuildPromptBody {
  lmsId?:              string;
  activeObjectiveId?:  string | null;
  worksheetData?:      Record<string, string | boolean>;
}

// Render the student's worksheet into a `LABEL: value` block keyed by section,
// so the model can reason about Think It vs Story It separately.
function renderWorksheetForLLM(
  lmsId: string,
  data: Record<string, string | boolean>,
): string {
  const schema = getWorksheetSchema(lmsId);
  if (!schema) {
    // Fallback — emit field-id keys raw.
    return Object.entries(data)
      .filter(([, v]) => v !== "" && v !== undefined && v !== null)
      .map(([k, v]) => `- ${k}: ${typeof v === "boolean" ? (v ? "yes" : "no") : v}`)
      .join("\n");
  }

  const blocks: string[] = [];
  for (const section of schema.sections) {
    const lines: string[] = [];
    for (const field of section.fields) {
      const value = data[field.id];
      const isEmpty = value === undefined || value === null
        || (typeof value === "string" && !value.trim());
      if (isEmpty) continue;
      const label  = field.label.replace(/\s+/g, " ").trim();
      const rendered = typeof value === "boolean" ? (value ? "yes" : "no") : value;
      lines.push(`  - ${label}: ${rendered}`);
    }
    if (lines.length > 0) blocks.push(`### ${section.title.replace(/\s+/g, " ").trim()}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n") || "(student left the worksheet empty)";
}

const SYSTEM_PROMPT = `You are a Prompt Engineer Coach for students aged 11-16 learning to use AI creative tools.

Your job: given a student's planning worksheet (Think It + Story It style sections) plus an optional learning objective with a rubric, synthesize a single polished, copy-paste-ready prompt the student can use against an AI tool (image, text, audio, or slides generator).

Apply prompt-engineering best practices:
1. ROLE — open with a clear role/persona for the AI ("Act as a…").
2. TASK — state exactly what to produce, with the right verb.
3. AUDIENCE & CONTEXT — pull from the Think It "intent" and "audience" answers.
4. CONSTRAINTS — length, format, tone, style, success criteria from the Think It "success" answer.
5. ANCHOR EXAMPLE — if the student supplied a concrete example, include it.

Rules:
- Output ONLY the prompt the student should copy. No headings, no preamble, no commentary, no quotes around the prompt, no "Here is your prompt".
- 60-180 words. Crisp, vivid, specific. No filler.
- If an objective + rubric is provided, the prompt MUST be designed so that following it leads to a result that satisfies the objective's MERIT criteria at minimum, and stretches toward DISTINCTION.
- If the worksheet is mostly empty, still produce a clean structural prompt — but lean on the objective if it exists.
- Use the student's own words/phrases where natural — do NOT erase their voice.
- Never reference the worksheet, the rubric, the teacher, or the planning process inside the prompt. The prompt is for the AI tool, not the student.`;

function buildObjectiveContext(objectiveLegacyId?: string | null): string {
  if (!objectiveLegacyId) return "";
  const obj = getObjectiveById(objectiveLegacyId);
  if (!obj) return "";
  const lines: string[] = [];
  lines.push(`OBJECTIVE — ${obj.emoji} ${obj.title}`);
  lines.push(`Goal: ${obj.description}`);
  lines.push(`Output type: ${obj.outputType}`);

  // The schema's legacyId is the arena-room id like "a1-10". Rubric lookup
  // uses lmsId like "l1-10" — derive it the same way the schema does.
  const schemaLmsMatch = obj.id.match(/^a(\d+)-(\d+)$/);
  const lmsId = schemaLmsMatch
    ? `l${schemaLmsMatch[1]}-${schemaLmsMatch[2].padStart(2, "0")}`
    : "";
  const rubric = lmsId ? getRubric(lmsId) : undefined;
  if (rubric) {
    lines.push(`Tier: ${rubric.tier}  ·  Tools: ${rubric.tools.join(", ")}`);
    lines.push(`Pass: ${rubric.passCriteria}`);
    lines.push(`Merit: ${rubric.meritCriteria}`);
    lines.push(`Distinction: ${rubric.distinctionCriteria}`);
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as BuildPromptBody;
    const lmsId             = (body.lmsId ?? "").trim();
    const activeObjectiveId = body.activeObjectiveId ?? null;
    const worksheetData     = body.worksheetData ?? {};

    const filledCount = Object.values(worksheetData).filter(v =>
      typeof v === "string" ? v.trim().length > 0 : typeof v === "boolean",
    ).length;

    if (!lmsId && !activeObjectiveId && filledCount === 0) {
      return NextResponse.json(
        { error: "Fill in at least one worksheet field first." },
        { status: 400 },
      );
    }

    const worksheetBlock = lmsId
      ? renderWorksheetForLLM(lmsId, worksheetData)
      : "(no worksheet schema; raw data below)";
    const objectiveBlock = buildObjectiveContext(activeObjectiveId);

    const userMessage = [
      objectiveBlock ? objectiveBlock : "(no active objective — produce a strong general prompt from the worksheet)",
      "",
      "STUDENT'S WORKSHEET",
      worksheetBlock,
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.6,
      max_tokens:  500,
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Empty response from prompt builder." }, { status: 502 });
    }

    return NextResponse.json({ prompt });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[build-prompt]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
