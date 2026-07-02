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

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      max_tokens: 900,
      stream: true,
      messages: [
        {
          role: "system",
          content: `You write short, gripping educational stories for students aged 13–16 studying ${subject ?? "Mathematics"} (${gradeLevel ?? "Class 10"}).
The story should:
- Have a relatable teen protagonist in a real-world situation
- Weave in the key concepts naturally through the plot (not as a lecture)
- Be 350–450 words
- Have 3 clear sections: Setup (problem/situation), Discovery (concept revealed), and Twist/Payoff (concept solves the problem in a surprising way)
- End with one "Moral of the story" line that crystallises the core concept
- Use vivid language, dialogue, and mild suspense — make it a page-turner
Format as plain prose with section breaks using "—" as a separator. No headers, no bullet points.`,
        },
        {
          role: "user",
          content: `Chapter section: "${sectionTitle}"\nTopic: ${topic}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("[learn/concept/story]", err);
    return new Response("Internal error", { status: 500 });
  }
}
