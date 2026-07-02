import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { sectionTitle, topic, subject, gradeLevel } =
      await req.json() as { sectionTitle: string; topic: string; subject?: string; gradeLevel?: string };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `You generate curiosity-sparking think cards for students aged 13–16 studying ${subject ?? "Mathematics"} (${gradeLevel ?? "Class 10"}).
A think card has a thought-provoking question and exactly 3 options. All options are "correct" in the sense that each one reveals a different interesting curiosity hook about the topic — there is no wrong answer. The hook should surprise, connect to real life, or reveal something unexpected.
Return JSON: { "cards": [ { "question": "...", "options": [ { "text": "...", "hook": "..." }, ... ] } ] }
Rules:
- 4 cards total
- Questions should make students think "huh, why?" not just recall facts
- Hooks are 2–3 sentences, end with something that makes them want to learn more
- Language is conversational, NOT textbook-style
- Relate to things teens know: apps, sports, games, social media, movies`,
        },
        {
          role: "user",
          content: `Chapter section: "${sectionTitle}"\nTopic: ${topic}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return Response.json(parsed);
  } catch (err) {
    console.error("[learn/think-cards]", err);
    return new Response("Internal error", { status: 500 });
  }
}
