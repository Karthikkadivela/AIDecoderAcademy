import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { matchPersona, buildDynamicPersona } from "@/lib/podcastPersonas";
import { synthesizeEpisode, type Turn } from "@/lib/podcastEpisode";

export const maxDuration = 300;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { topic, chapterTitle } = (await req.json()) as { topic: string; chapterTitle: string };
  const subject = topic?.trim() || chapterTitle;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        // 1. Persona
        const persona = matchPersona(subject) ?? buildDynamicPersona(subject);
        send({ stage: "persona", persona: { id: persona.id, name: persona.name, archetype: persona.archetype } });

        // 2. Script
        const sys =
          `Write a kids' podcast (ages 11-16) about "${subject}". Two speakers:\n` +
          `HOST = Bhavna (warm teacher). GUEST = ${persona.name}, a ${persona.archetype} ` +
          `(${persona.personality}; style: ${persona.speakingStyle}). The guest is a FICTIONAL character ` +
          `inspired by an archetype — never claim to be a real person, never quote real people.\n` +
          `Structure: a punchy COLD-OPEN hook, intro, 4-6 Q&A beats with light banter, one "whoa" fact, a wrap-up.\n` +
          `Plain spoken English, no markdown, no LaTeX. Target 24-32 short turns.\n` +
          `Return JSON: {"turns":[{"speaker":"host"|"guest","text":"..."}]}`;
        const raw = (await openai.chat.completions.create({
          model: "gpt-4o-mini", temperature: 0.8, response_format: { type: "json_object" },
          messages: [{ role: "system", content: sys }, { role: "user", content: `Topic: ${subject}` }],
        })).choices[0]?.message?.content ?? "{}";
        const turns: Turn[] = (JSON.parse(raw).turns ?? []).slice(0, 32);
        if (!turns.length) throw new Error("empty script");
        send({ stage: "script", total: turns.length });

        // 3. TTS + merge via synthesizeEpisode (per-line progress for the loader)
        send({ stage: "tts", done: 0, total: turns.length });
        const ep = await synthesizeEpisode(
          turns as Turn[],
          persona,
          userId,
          (done, total) => send({ stage: "tts", done, total }),
        );
        send({ stage: "tts", done: turns.length, total: turns.length });

        // 4. Done
        send({
          stage: "done",
          title: `Podcast: ${subject}`,
          persona: { id: persona.id, name: persona.name, archetype: persona.archetype },
          transcript: turns,
          audioUrl: ep.audioUrl,
          segments: ep.segments,
        });
        controller.close();
      } catch (e) {
        send({ stage: "error", message: (e as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
