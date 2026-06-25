import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase";
import { getPageDoc } from "@/lib/aidaDocs";
import { buildAidaSystemPrompt } from "@/lib/aidaPersona";
import { OBJECTIVES, toLmsId } from "@/lib/objectives";
import { getRubric, getStagedRubric } from "@/lib/objectiveRubrics";
import { moderateContent, detectDistress, buildDistressFooter, getRefusalLine } from "@/lib/aidaSafety";
import type { Profile, AgeGroup } from "@/types";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 60;

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
      playgroundImages = [],
      interruptedContext,
      isVoiceMode = false,
      profile,
      objectiveId,
      validator_state,
      worksheet_draft,
      classroom_state,
    }: {
      message:              string;
      history:              { role: "user" | "assistant"; content: string }[];
      pathname:             string;
      playgroundImages?:    string[];
      interruptedContext?:  string;
      isVoiceMode?:         boolean;
      profile: Profile;
      // Set by the AIDA client when the playground URL has ?objective=<id>.
      // Triggers the hint-or-answer scaffolding in the system prompt.
      objectiveId?:         string | null;
      // Validator + worksheet channel snapshots from chatChannels — small,
      // optional, attached only on graded objectives.
      validator_state?: {
        lmsId:       string | null;
        lastTier:    "distinction" | "merit" | "pass" | "fail" | null;
        lastMode:    "challenge" | "nudge" | "celebrate" | null;
        lastSummary: string | null;
        attempts:    { count: number; lastAt: string | null };
      };
      worksheet_draft?: {
        lmsId:      string;
        data:       Record<string, string | boolean>;
        updated_at: string;
      };
      // Classroom-teacher channel snapshot. AIDA can read it (one-way mirror
      // of whiteboard ↔ AIDA). Only attached when lesson_ended — see Phase 5.
      classroom_state?: {
        status:    "idle" | "in_lesson" | "lesson_ended";
        lastLesson?: {
          topic:       string;
          summary:     string;
          keyConcepts: string[];
          studentResponses: Array<{ question: string; answer: string }>;
        } | null;
      };
    } = body;

    const isObjectiveMode = !!objectiveId;

    if (!message?.trim()) return new Response("Bad request", { status: 400 });

    // ── Pre-flight safety check — fires immediately, in parallel with the ───
    // profile lookup below (previously sequential: moderation -> profile fetch).
    let distressFlag = false;
    const moderationPromise = moderateContent(message);

    // ── Fetch student's learner model from Supabase ─────────────────────────
    // Kept server-derived from the verified Clerk userId. Runs in parallel
    // with the moderation check above.
    const supabase = createAdminClient();
    const profileRowPromise = supabase
      .from("profiles")
      .select("learner_model")
      .eq("clerk_user_id", userId)
      .single();

    const inputVerdict = await moderationPromise;
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

    const { data: profileRow } = await profileRowPromise;
    const learnerModel = (profileRow?.learner_model as Record<string, unknown> | null) ?? null;

    // ── Build system prompt ───────────────────────────────────────────────────
    const arenaNames: Record<number, string> = {
      1: "AI Explorer Arena", 2: "Prompt Lab", 3: "Story Forge",
      4: "Visual Studio",     5: "Sound Booth", 6: "Director's Suite",
    };

    const isOnPlayground = pathname.startsWith("/dashboard/playground");

    // ── Validator + worksheet extras (always rendered when present) ────────
    const channelExtras: string[] = [];
    if (validator_state?.lmsId) {
      const v = validator_state;
      channelExtras.push(
        `[Validator Teacher last verdict — objective ${v.lmsId}]\n` +
        `tier: ${v.lastTier ?? "n/a"} | mode: ${v.lastMode ?? "n/a"} | attempts: ${v.attempts.count}\n` +
        `summary: ${v.lastSummary ?? "(none yet)"}\n` +
        `If the kid asks what the teacher meant, paraphrase the summary in your own words. Never speak as the teacher.`
      );
    }
    if (worksheet_draft?.lmsId) {
      const w = worksheet_draft;
      const compact = Object.entries(w.data)
        .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v.slice(0, 200) : v}`)
        .join("\n");
      if (compact) {
        channelExtras.push(
          `[Kid's current worksheet draft — objective ${w.lmsId}]\n${compact}\n` +
          `Read for context. Do not invent answers for them. Do not paste their draft back at them.`
        );
      }
    }

    // ── Resolve active objective + curriculum digest ────────────────────────
    // When the kid clicks into a mission, the URL carries ?objective=<id>
    // (e.g. "a1-6"). AIDA needs the full objective metadata + rubric criteria
    // injected into her system prompt, otherwise she hallucinates "I can't
    // see the current objective". Look up both the Objective record and the
    // (staged or single-pass) rubric so she can coach on tier/pass criteria.
    let activeObjective: Parameters<typeof buildAidaSystemPrompt>[0]["activeObjective"];
    if (objectiveId) {
      const obj = OBJECTIVES.find(o => o.id === objectiveId);
      const lmsId = obj ? toLmsId(obj.id) : objectiveId;
      const staged = getStagedRubric(lmsId);
      const single = !staged ? getRubric(lmsId) : null;
      activeObjective = {
        id:    objectiveId,
        lmsId,
        title: obj?.title ?? staged?.title ?? single?.title ?? objectiveId,
        description: obj?.description ?? "",
        emoji: obj?.emoji,
        tier:  single?.tier,
        tools: single?.tools,
        labTask: single?.labTask,
        passCriteria:        single?.passCriteria,
        meritCriteria:       single?.meritCriteria,
        distinctionCriteria: single?.distinctionCriteria,
      };
    }

    // Curriculum digest — short, one-line-per-objective summary so AIDA can
    // answer "what's next?" / "what's in this arena?" without hallucinating.
    // Only includes objectives at or below the student's current level (no
    // spoilers for locked arenas).
    const currentArena = profile?.active_arena ?? 1;
    const curriculumDigest = OBJECTIVES
      .filter(o => o.arenaId <= currentArena)
      .sort((a, b) => a.arenaId - b.arenaId || a.order - b.order)
      .map(o => `- ${o.id} · Arena ${o.arenaId} #${o.order} · ${o.emoji} ${o.title} (${o.outputType}, ${o.xpReward} XP)`)
      .join("\n");

    // Classroom context: only attach when lesson is ENDED (edge case 10).
    let classroomContext: string | undefined;
    if (classroom_state?.status === "lesson_ended" && classroom_state.lastLesson) {
      const l = classroom_state.lastLesson;
      const responses = l.studentResponses?.length
        ? l.studentResponses.slice(0, 6).map(r => `  Q: ${r.question}\n  A: ${r.answer}`).join("\n")
        : "  (no student responses recorded)";
      classroomContext =
        `Topic: ${l.topic}\nSummary: ${l.summary}\nKey concepts: ${(l.keyConcepts ?? []).join(", ") || "—"}\nStudent responses:\n${responses}`;
    } else if (classroom_state?.status === "in_lesson") {
      classroomContext = "[The student's classroom lesson is still in progress — full transcript unavailable. Answer their question without assuming what the teacher just covered.]";
    }

    const baseSystemPrompt = buildAidaSystemPrompt({
        profile:           profile as Profile,
        pageContext:       getPageDoc(pathname),
        classroomContext,
        learnerModel,
        isVoiceMode,
        interruptedContext,
        isObjectiveMode,
        activeObjective,
        curriculumDigest,
      })

    const systemPrompt = channelExtras.length > 0
      ? `${baseSystemPrompt}\n\n${channelExtras.join("\n\n")}`
      : baseSystemPrompt;

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

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";

        try {
          const stream = await openai.chat.completions.create({
            model:       "gpt-4o-mini",
            messages,
            stream:      true,
            temperature: 0.7,
            max_tokens:  isVoiceMode ? 300 : 800,
          });

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
          if (fullText) {
            moderateContent(fullText).then(v => {
              if (!v.allow) {
                console.warn("[aida] post-hoc moderation flagged assistant output:", v.reason);
              }
            }).catch(() => { /* logged inside moderateContent */ });
          }
        } catch (err) {
          console.error("[AIDA stream]", err);
        } finally {
          controller.close();
        }
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
