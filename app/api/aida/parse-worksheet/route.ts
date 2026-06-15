import { NextResponse } from "next/server";
import mammoth from "mammoth";
import OpenAI from "openai";

export const runtime     = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Field IDs per lmsId — GPT maps extracted text to these.
const FIELD_IDS: Record<string, string[]> = {
  "l1-02": [
    "avatarName",
    "intent", "assumptions", "audience", "success",
    "question",
    "chatGptObservation", "chatGptInterpretation",
    "geminiObservation",  "geminiInterpretation",
    "claudeObservation",  "claudeInterpretation",
    "surprisingDifference", "agreement", "whichAiForType",
    "correctAssumption", "wrongAssumption",
  ],
  "l1-06": [
    "avatarName",
    "intent", "assumptions", "audience", "success",
    "avatarRole", "appearance", "personalityTraits", "voiceCharacter", "presentationStyle",
    "successTest",
    "intentionalOutcome", "unintentionalOutcome",
  ],
  "l1-10": [
    "avatarName",
    "intent", "assumptions", "audience", "success",
    "oneSentenceStory",
    "panel1Setup", "panel2Twist", "panel3Punchline",
    "panel1Image", "panel2Image", "panel3Image",
    "panel1Dialogue", "panel2Dialogue", "panel3Dialogue",
    "heldAssumption", "brokenAssumption",
  ],
};

export async function POST(req: Request) {
  let body: { url?: string; format?: string; lmsId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { url, format, lmsId } = body;
  if (!url || !lmsId) return NextResponse.json({ error: "url and lmsId required" }, { status: 400 });

  // Fetch the file from Supabase storage
  let fileBuffer: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });
    fileBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: `Fetch error: ${String(e)}` }, { status: 502 });
  }

  // Extract plain text from the document
  let docText = "";
  if (format === "pdf") {
    // PDF: send directly to GPT vision — return empty data, caller falls back to inline form
    return NextResponse.json({ data: {} });
  } else {
    // DOCX: mammoth extracts plain text
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value.trim();
    } catch (e) {
      return NextResponse.json({ error: `mammoth error: ${String(e)}` }, { status: 500 });
    }
  }

  if (!docText) return NextResponse.json({ data: {} });

  // Resolve which fields to map
  // Accept both l1-0N and a1-N style ids
  const normalised = lmsId.startsWith("a1-")
    ? `l1-${lmsId.slice(3).padStart(2, "0")}`
    : lmsId;
  const fields = FIELD_IDS[normalised] ?? FIELD_IDS["l1-02"];

  // Ask GPT to map the raw text to field IDs
  const systemPrompt = `You are an assistant that reads student worksheet text and extracts answers into a structured JSON object.
The worksheet has been extracted as plain text via mammoth. Section headers and field labels may appear.
Map the student's answers to the field IDs listed below. Only include a field if the student wrote something for it.
Return a single JSON object with field IDs as keys and student answer strings as values.
Do not include empty strings. Do not invent content — only extract what the student wrote.

Field IDs to extract:
${fields.join(", ")}`;

  let parsed: Record<string, string> = {};
  try {
    const completion = await openai.chat.completions.create({
      model:       "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Worksheet text:\n\n${docText.slice(0, 6000)}` },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const obj = JSON.parse(raw);
    // Keep only known field IDs with non-empty string values
    for (const id of fields) {
      const val = obj[id];
      if (typeof val === "string" && val.trim()) {
        parsed[id] = val.trim();
      }
    }
  } catch (e) {
    console.error("[parse-worksheet] GPT error:", e);
    return NextResponse.json({ data: {} });
  }

  return NextResponse.json({ data: parsed });
}
