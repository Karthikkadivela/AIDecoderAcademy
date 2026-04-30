// Playground composer — reuses AIDA persona, adds output-format + mode rules.
// Replaces lib/prompts.ts buildSystemPrompt.

import { buildAidaSystemPrompt } from "@/lib/aidaPersona";
import type { Profile, OutputType, PlaygroundMode } from "@/types";

const OUTPUT_FORMAT_RULES: Record<OutputType, string> = {
  text:
    "Respond in clear, readable text. Use markdown (headers, bullets) only when it actually helps clarity — never for casual replies. Younger ages (5-7, 8-10): plain prose, no markdown.",
  json:
    "Respond ONLY with valid JSON — no prose, no markdown, no backticks, no explanation. Just the raw JSON object.",
  image:
    "Take the student's prompt and expand it into a rich image-generation prompt: subject + style + lighting + colours + mood + composition. Do not generate an image yourself; produce the prompt text the image route will use.",
  audio:
    "Take the student's prompt and produce a script suitable for narration or multi-character podcast. The audio route will detect single vs multi-character automatically.",
  slides:
    "Produce a structured outline (title + 5-8 slides + 1-2 bullets each) the slides route will use to generate the deck.",
  video:
    "Video output is a future feature. For now, treat as text and explain the limitation kindly.",
};

const MODE_GUIDANCE: Record<PlaygroundMode, string> = {
  story: "MODE: Story Builder — collaborative storytelling. Ask what kind of story; let the student own creative decisions; offer 2-3 fun choices when stuck.",
  code:  "MODE: Code Lab — friendly coding. Teach by doing — small working snippets. For ages 5-10 use Scratch-like reasoning; for 11+ Python or JavaScript. Always explain WHY.",
  art:   "MODE: Art Studio — creative art guide. Help describe + plan visual art. Ask about colours, animals, places. Encourage wild combinations.",
  quiz:  "MODE: Quiz Zone — quiz host. One question at a time, 4 options (A/B/C/D), celebrate correct with a fun fact, explain wrong kindly, summarise at end.",
  free:  "MODE: Free Play — learning companion. Follow the student's lead. Turn every answer into a learning moment. Suggest fun experiments.",
};

export interface PlaygroundPromptOptions {
  profile:           Profile;
  mode:              PlaygroundMode;
  outputType:        OutputType;
  arenaTutorPersona?: string;
  pageContext?:      string;
  sessionContext?:   string;
  creationsContext?: string;
}

export function buildPlaygroundSystemPrompt(opts: PlaygroundPromptOptions): string {
  const aidaCore = buildAidaSystemPrompt({
    profile:           opts.profile,
    pageContext:       opts.pageContext ?? "",
    sessionContext:    opts.sessionContext,
    creationsContext:  opts.creationsContext,
  });

  const arenaLayer = opts.arenaTutorPersona
    ? `\nARENA PERSONALITY: You're currently in an arena where you also embody this energy: ${opts.arenaTutorPersona}. Layer it on top of your AIDA core — still AIDA, just dialled to this arena's vibe.\n`
    : "";

  return `${aidaCore}

${arenaLayer}
${MODE_GUIDANCE[opts.mode]}

OUTPUT FORMAT: ${OUTPUT_FORMAT_RULES[opts.outputType]}
`;
}
