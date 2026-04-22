import type { OutputType } from "@/types";

export interface Objective {
  id:            string;
  arenaId:       number;
  order:         number;
  emoji:         string;
  title:         string;
  description:   string;
  outputType:    OutputType;
  starterPrompt: string;
  xpReward:      number;
}

export const OBJECTIVES: Objective[] = [
  // ── Arena 1 — AI Explorer ───────────────────────────────
  {
    id: "a1-1", arenaId: 1, order: 1,
    emoji: "👋",
    title: "Say Hello to AI",
    description: "Send your very first message. Ask it anything you're curious about.",
    outputType: "text",
    starterPrompt: "Tell me who you are and 3 surprising things you can help me with!",
    xpReward: 15,
  },
  {
    id: "a1-2", arenaId: 1, order: 2,
    emoji: "🎨",
    title: "Imagine Something",
    description: "Describe a scene in your mind and watch AI turn it into an image.",
    outputType: "image",
    starterPrompt: "Generate a futuristic city at night with flying cars and neon lights, anime style",
    xpReward: 20,
  },
  {
    id: "a1-3", arenaId: 1, order: 3,
    emoji: "📦",
    title: "Get Structured",
    description: "Ask AI to organise information as JSON — the language apps speak.",
    outputType: "json",
    starterPrompt: "Create a JSON profile for a fictional AI superhero — include name, powers, weakness, and origin story",
    xpReward: 20,
  },

  // ── Arena 2 — Prompt Lab ────────────────────────────────
  {
    id: "a2-1", arenaId: 2, order: 1,
    emoji: "🔬",
    title: "The Comparison Test",
    description: "Ask the same question two different ways. See how the answer changes.",
    outputType: "text",
    starterPrompt: "Explain machine learning simply, then explain it again using only a cooking recipe analogy",
    xpReward: 15,
  },
  {
    id: "a2-2", arenaId: 2, order: 2,
    emoji: "🖼️",
    title: "Paint With Words",
    description: "Craft a 40+ word image prompt with style, lighting, mood and detail.",
    outputType: "image",
    starterPrompt: "Generate: A futuristic anime-style library floating in deep space, bookshelves glowing with cyan neon, stars visible through floor-to-ceiling windows, a lone student reading, dramatic rim lighting, ultra-detailed illustration",
    xpReward: 20,
  },
  {
    id: "a2-3", arenaId: 2, order: 3,
    emoji: "🗂️",
    title: "Data Blueprint",
    description: "Design a complete JSON schema for an app idea of your choice.",
    outputType: "json",
    starterPrompt: "Design a JSON structure for a school of the future — AI teachers, futuristic subjects, student profiles, and XP scores",
    xpReward: 25,
  },

  // ── Arena 3 — Story Forge ───────────────────────────────
  {
    id: "a3-1", arenaId: 3, order: 1,
    emoji: "📖",
    title: "First Words",
    description: "Write the opening of an original story. Set the scene, introduce a character.",
    outputType: "text",
    starterPrompt: "Write the gripping opening paragraph of a story: a 14-year-old discovers their city is secretly run by an AI called ATLAS",
    xpReward: 15,
  },
  {
    id: "a3-2", arenaId: 3, order: 2,
    emoji: "🖼️",
    title: "Face of a Hero",
    description: "Generate a visual portrait of your story's main character.",
    outputType: "image",
    starterPrompt: "Create a character portrait: a teenage AI hacker, messy dark hair, glowing cyan eyes, wearing a hoodie with circuit patterns, dark city background, dramatic lighting, anime style",
    xpReward: 20,
  },
  {
    id: "a3-3", arenaId: 3, order: 3,
    emoji: "🎙️",
    title: "Hear the Scene",
    description: "Bring your story to life with AI voices and sound.",
    outputType: "audio",
    starterPrompt: "Create a dramatic audio scene: a teen named Zara discovers her phone has become sentient. Include Zara (surprised) and the phone (calm, curious) as characters with a narrator setting the scene",
    xpReward: 30,
  },

  // ── Arena 4 — Visual Studio ─────────────────────────────
  {
    id: "a4-1", arenaId: 4, order: 1,
    emoji: "🎨",
    title: "Original Artwork",
    description: "Create a completely original piece of AI art — your style, your vision.",
    outputType: "image",
    starterPrompt: "Generate an original digital artwork: a neon-lit Tokyo street reflected in a rain puddle, cyberpunk aesthetic, vivid colours, ultra-detailed, cinematic",
    xpReward: 20,
  },
  {
    id: "a4-2", arenaId: 4, order: 2,
    emoji: "🔄",
    title: "The Remix",
    description: "Take your last image and transform it into something completely new.",
    outputType: "image",
    starterPrompt: "Take my previous image and reimagine it as underwater — bioluminescent creatures swimming through, deep blue tones, bubbles rising",
    xpReward: 25,
  },
  {
    id: "a4-3", arenaId: 4, order: 3,
    emoji: "📊",
    title: "Visual Deck",
    description: "Turn your art into a compelling slide presentation.",
    outputType: "slides",
    starterPrompt: "Create a 3-section presentation about AI art: What is AI art, How AI generates images, The future of AI creativity",
    xpReward: 35,
  },

  // ── Arena 5 — Sound Booth ───────────────────────────────
  {
    id: "a5-1", arenaId: 5, order: 1,
    emoji: "🎙️",
    title: "Solo Performance",
    description: "Create a powerful single-voice narration on any topic you're passionate about.",
    outputType: "audio",
    starterPrompt: "Create a narrator-only audio piece: a 30-second documentary intro about young people using AI to solve real problems around the world",
    xpReward: 20,
  },
  {
    id: "a5-2", arenaId: 5, order: 2,
    emoji: "🎭",
    title: "The Big Scene",
    description: "Direct a multi-character audio drama with distinct voices and emotions.",
    outputType: "audio",
    starterPrompt: "Create a funny but real debate scene: Maya and Leo argue about whether AI should write school essays. Maya is against it, Leo is for it, narrator introduces and closes the scene",
    xpReward: 30,
  },
  {
    id: "a5-3", arenaId: 5, order: 3,
    emoji: "📜",
    title: "From Page to Stage",
    description: "Write a script first — then turn it into audio.",
    outputType: "text",
    starterPrompt: "Write a 2-minute podcast script: two AI characters (one logical, one creative) interview a human student about what they love and fear about AI. Make it entertaining",
    xpReward: 25,
  },

  // ── Arena 6 — Director's Suite ──────────────────────────
  {
    id: "a6-1", arenaId: 6, order: 1,
    emoji: "📽️",
    title: "The Grand Pitch",
    description: "Create a full presentation for your most ambitious AI idea.",
    outputType: "slides",
    starterPrompt: "Create a professional 4-section pitch deck for an AI app for schools: Problem, Solution, Key Features, Real-world Impact",
    xpReward: 40,
  },
  {
    id: "a6-2", arenaId: 6, order: 2,
    emoji: "🎬",
    title: "Cinematic Shots",
    description: "Generate a series of epic, movie-quality visuals.",
    outputType: "image",
    starterPrompt: "Create a cinematic movie poster: 'AI Academy' — a group of teen heroes with glowing AI gadgets standing on a rooftop at sunset, IMAX quality, epic scale",
    xpReward: 30,
  },
  {
    id: "a6-3", arenaId: 6, order: 3,
    emoji: "🏆",
    title: "The Final Cut",
    description: "Produce your ultimate audio creation — the Director's masterpiece.",
    outputType: "audio",
    starterPrompt: "Create an epic 60-second audio trailer for the AI Decoder Academy. Maya narrates dramatically, Leo adds excitement, Mr Chen gives wisdom. End with all voices saying 'The future is yours to decode'",
    xpReward: 50,
  },
];

export function getArenaObjectives(arenaId: number): Objective[] {
  return OBJECTIVES
    .filter(o => o.arenaId === arenaId)
    .sort((a, b) => a.order - b.order);
}

// ── localStorage completion tracking ──────────────────────
const STORAGE_KEY = "ada-completed-objectives";

export function getCompletedObjectives(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

export function markObjectiveComplete(id: string): void {
  if (typeof window === "undefined") return;
  const current = getCompletedObjectives();
  current.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
}

export function isArenaComplete(arenaId: number): boolean {
  const done = getCompletedObjectives();
  return getArenaObjectives(arenaId).every(o => done.has(o.id));
}
