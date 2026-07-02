import { SeededThinkCard, LEARN_PATH_SEEDS } from "./learnSeeds";
export type { SeededThinkCard };

export interface LearnSection {
  id: string;
  title: string;
  description: string;
  topic: string;
  emoji: string;
  thinkCards?: SeededThinkCard[];
}

export interface LearnChapter {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  emoji: string;
  gradient: string;
  sections: LearnSection[];
}

export const LEARN_CHAPTERS: LearnChapter[] = [
  {
    id: "probability",
    title: "Probability",
    subject: "Mathematics",
    gradeLevel: "CBSE Class 10",
    emoji: "🎲",
    gradient: "135deg, #7C3AED 0%, #C026D3 100%",
    sections: [
      {
        id: "what-is-probability",
        title: "What is Probability?",
        description: "The language of chance — from coin flips to weather forecasts",
        topic: "Introduction to probability, random experiments, outcomes, sample space, and events in CBSE Class 10 Mathematics",
        emoji: "🪙",
      },
      {
        id: "types-of-events",
        title: "Types of Events",
        description: "Certain, impossible, and equally likely events",
        topic: "Types of events in probability: certain events, impossible events, equally likely events, and elementary events in CBSE Class 10",
        emoji: "🎯",
      },
      {
        id: "probability-formula",
        title: "The Probability Formula",
        description: "How to actually calculate the chance of something happening",
        topic: "Probability formula P(E) = Number of favourable outcomes / Total number of outcomes, theoretical probability in CBSE Class 10",
        emoji: "📐",
      },
      {
        id: "compound-events",
        title: "Compound Events",
        description: "When two things happen together — addition and complementary rules",
        topic: "Complementary events, P(not E) = 1 - P(E), mutually exclusive events, and addition rule in probability for CBSE Class 10",
        emoji: "🔀",
      },
      {
        id: "real-world-probability",
        title: "Probability in Real Life",
        description: "Weather apps, board games, and why doctors use probability",
        topic: "Real-world applications of probability: weather forecasting, card games, dice games, medical testing, insurance in CBSE Class 10",
        emoji: "🌍",
      },
    ],
  },
  {
    id: "ratio-and-proportion",
    title: "Ratio & Proportion",
    subject: "Mathematics",
    gradeLevel: "CBSE Class 8",
    emoji: "⚖️",
    gradient: "135deg, #0891B2 0%, #0E7490 100%",
    sections: [
      {
        id: "what-is-a-ratio",
        title: "What is a Ratio?",
        description: "Comparing quantities — from recipes to race results",
        topic: "Introduction to ratios in CBSE Class 8 Mathematics: comparing two quantities, writing ratios in simplest form, equivalent ratios, ratio notation",
        emoji: "📊",
        thinkCards: LEARN_PATH_SEEDS["what-is-a-ratio"],
      },
      {
        id: "equivalent-ratios",
        title: "Equivalent Ratios",
        description: "Same relationship, different numbers",
        topic: "Equivalent ratios in CBSE Class 8: finding equivalent ratios by multiplying or dividing, simplifying ratios, comparing ratios using common denominators",
        emoji: "🔢",
        thinkCards: LEARN_PATH_SEEDS["equivalent-ratios"],
      },
      {
        id: "what-is-proportion",
        title: "What is Proportion?",
        description: "When two ratios are equal — and how to use that",
        topic: "Proportion in CBSE Class 8: definition of proportion, four quantities in proportion, cross-multiplication method, unitary method",
        emoji: "⚖️",
        thinkCards: LEARN_PATH_SEEDS["what-is-proportion"],
      },
      {
        id: "direct-inverse-proportion",
        title: "Direct & Inverse Proportion",
        description: "How things grow together — or pull in opposite directions",
        topic: "Direct and inverse proportion in CBSE Class 8: direct variation, inverse variation, identifying which type applies, solving word problems",
        emoji: "↕️",
        thinkCards: LEARN_PATH_SEEDS["direct-inverse-proportion"],
      },
      {
        id: "ratio-real-world",
        title: "Ratio in Real Life",
        description: "Maps, recipes, speed, and why ratios are everywhere",
        topic: "Real-world applications of ratio and proportion in CBSE Class 8: map scales, recipe scaling, speed-time-distance, percentage as ratio",
        emoji: "🗺️",
        thinkCards: LEARN_PATH_SEEDS["ratio-real-world"],
      },
    ],
  },
];

export function getChapter(id: string): LearnChapter | undefined {
  return LEARN_CHAPTERS.find((c) => c.id === id);
}

export type PhaseId = 1 | 2 | 3 | 4;

export interface PhaseDefinition {
  id: PhaseId;
  label: string;
  emoji: string;
  color: string;
  colorDim: string;
  glow: string;
  bg: string;
  description: string;
}

export const PHASES: PhaseDefinition[] = [
  {
    id: 1,
    label: "Spark",
    emoji: "🔦",
    color: "#D97706",
    colorDim: "rgba(217,119,6,0.7)",
    glow: "rgba(217,119,6,0.25)",
    bg: "#FFFBEB",
    description: "Ignite your curiosity",
  },
  {
    id: 2,
    label: "Concept",
    emoji: "📖",
    color: "#4F46E5",
    colorDim: "rgba(79,70,229,0.7)",
    glow: "rgba(79,70,229,0.2)",
    bg: "#EEF2FF",
    description: "Master the ideas",
  },
  {
    id: 3,
    label: "Challenge",
    emoji: "⚡",
    color: "#DC2626",
    colorDim: "rgba(220,38,38,0.7)",
    glow: "rgba(220,38,38,0.2)",
    bg: "#FFF1F2",
    description: "Test your knowledge",
  },
  {
    id: 4,
    label: "Reflect",
    emoji: "✨",
    color: "#059669",
    colorDim: "rgba(5,150,105,0.7)",
    glow: "rgba(5,150,105,0.2)",
    bg: "#ECFDF5",
    description: "Lock it in",
  },
];

export type PhaseStatus = "locked" | "active" | "done";

export type ChapterProgress = Record<string, Record<string, PhaseStatus>>;

export function buildInitialProgress(chapter: LearnChapter): ChapterProgress {
  const prog: ChapterProgress = {};
  chapter.sections.forEach((sec, si) => {
    prog[sec.id] = {};
    PHASES.forEach((ph) => {
      if (si < 2) prog[sec.id][ph.id] = "done";
      else if (si === 2 && ph.id === 1) prog[sec.id][ph.id] = "active";
      else prog[sec.id][ph.id] = "locked";
    });
  });
  return prog;
}

const PROGRESS_VERSION = "v2";

export function loadProgress(chapterId: string, chapter: LearnChapter): ChapterProgress {
  try {
    const version = localStorage.getItem(`learn:${chapterId}:version`);
    if (version !== PROGRESS_VERSION) {
      localStorage.removeItem(`learn:${chapterId}:progress`);
      localStorage.setItem(`learn:${chapterId}:version`, PROGRESS_VERSION);
    }
    const raw = localStorage.getItem(`learn:${chapterId}:progress`);
    if (raw) return JSON.parse(raw) as ChapterProgress;
  } catch {}
  return buildInitialProgress(chapter);
}

export function saveProgress(chapterId: string, prog: ChapterProgress) {
  try {
    localStorage.setItem(`learn:${chapterId}:progress`, JSON.stringify(prog));
  } catch {}
}
