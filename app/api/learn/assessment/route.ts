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
      temperature: 0.5,
      response_format: { type: "json_object" },
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content: `You create mini-assessment MCQ questions for students aged 13–16 studying ${subject ?? "Mathematics"} (${gradeLevel ?? "Class 10"}).
Return JSON: { "questions": [ { "question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..." } ] }
Rules:
- Exactly 6 questions
- Mix of difficulty: 2 easy, 3 medium, 1 hard
- "correct" is the 0-based index of the correct option
- Explanation: 1 concise sentence explaining why the answer is correct
- Options should be plausible — include common misconceptions as distractors
- Questions should cover different aspects of the topic
- No "all of the above" or "none of the above" options
- Keep language clear and age-appropriate`,
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
    console.error("[learn/assessment]", err);
    return new Response("Internal error", { status: 500 });
  }
}
