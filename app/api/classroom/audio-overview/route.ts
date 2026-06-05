import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { synthLine, uploadAudio, BHAVNA_VOICE_ID } from "@/lib/classroomAudio";

export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { chapterTitle, focus } = (await req.json()) as { chapterTitle: string; focus?: string };
  const topic = focus?.trim() || chapterTitle;

  const script = (await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content:
        "You are Bhavna, a warm Indian-English teacher for students aged 11-16. " +
        "Write a spoken audio-overview script (90-120 seconds, ~180-220 words) that explains the topic " +
        "clearly and engagingly. Plain spoken English only — NO headings, NO markdown, NO LaTeX. " +
        "Write equations in words or plain text (e.g. 'sin of theta'). One flowing narration, no speaker labels." },
      { role: "user", content: `Topic: ${topic}\nChapter context: ${chapterTitle} (CBSE).` },
    ],
  })).choices[0]?.message?.content?.trim() ?? "";

  if (!script) return new Response("Script generation failed", { status: 500 });

  const mp3 = await synthLine(script, { voiceId: BHAVNA_VOICE_ID });
  const audioUrl = await uploadAudio(mp3, `overview/${userId}/${Date.now()}.mp3`);

  return Response.json({ audioUrl, script, title: `Audio Overview: ${topic}` });
}
