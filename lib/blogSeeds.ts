// Seeded blog content for the Concept phase.
// Each section has concept cards (explanation phase) + key facts + 3 step-by-step problems.

// ─── Concept Card types ───────────────────────────────────────────────────────

export type ConceptVisual =
  | { type: "ratio-dots";   groups: { count: number; color: string; label: string }[] }
  | { type: "ratio-forms";  a: number; b: number }
  | { type: "factor-grid";  a: number; b: number }
  | { type: "simplify";     from: [number, number]; hcf: number; to: [number, number] }
  | { type: "scale-chain";  base: [number, number]; steps: number[] }
  | { type: "cross-check";  p: [number, number]; q: [number, number] }
  | { type: "missing-val";  known: [number, number]; target: number; scale: number; answer: number };

export interface ConceptCard {
  title: string;
  hook: string;        // 1 punchy sentence shown large
  body: string[];      // 1–3 explanation paragraphs
  visual: ConceptVisual;
  tip?: string;        // optional amber tip box
  imagePrompt?: string; // prompt used to generate the card image
  imageUrl?: string;    // populated after one-time generation via /api/learn/seed-concept-images
}

export interface SectionConceptCards {
  cards: ConceptCard[];
}

export const CONCEPT_SEEDS: Record<string, SectionConceptCards> = {

  "what-is-a-ratio": {
    cards: [
      {
        title: "What is a Ratio?",
        hook: "A ratio compares two quantities by asking: for every ___ of this, how many of that?",
        body: [
          "Imagine a jar with 2 red marbles and 3 blue marbles. Instead of listing both numbers every time, we write the ratio 2 : 3. It means \"for every 2 red, there are 3 blue\".",
          "Ratios show up everywhere — recipes (2 cups flour : 1 cup sugar), maps (1 cm : 5 km), and speed (60 km : 1 hour). The key idea: a ratio captures a relationship, not just a count.",
        ],
        visual: { type: "ratio-dots", groups: [{ count: 2, color: "#7C3AED", label: "Red" }, { count: 3, color: "#00D4FF", label: "Blue" }] },
        tip: "The ORDER matters! Red to Blue (2:3) is different from Blue to Red (3:2). Always write in the order the question asks.",
        imagePrompt: "A glass jar with 2 glowing red marbles and 3 glowing blue marbles clearly visible inside, sitting on a wooden table. The number 2 floats above the red marbles and 3 floats above the blue marbles with a bold colon between them forming 2:3. Warm cheerful lighting, vibrant colours.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-0.png",
      },
      {
        title: "Three Ways to Write a Ratio",
        hook: "2 : 3, ²⁄₃, and \"2 to 3\" all mean exactly the same thing.",
        body: [
          "Ratios have three equivalent notations. You'll mostly see the colon form (2:3) in word problems, but fraction form is useful when you're comparing to a total.",
          "Whichever form you use, the value is the same. Simplify by dividing both numbers by their HCF — a concept we'll cover next!",
        ],
        visual: { type: "ratio-forms", a: 2, b: 3 },
        imagePrompt: "Three large colourful cards floating in the air side by side. Left card in violet shows '2 : 3' with label colon form. Middle card in teal shows '2/3' with label fraction form. Right card in amber shows '2 to 3' with label word form. Bright clean illustration, cheerful style.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-1.png",
      },
      {
        title: "What is HCF?",
        hook: "HCF is the biggest number that divides into BOTH numbers without leaving a remainder.",
        body: [
          "HCF stands for Highest Common Factor. To find it, list all factors of each number, spot the ones they share (common factors), and pick the largest.",
          "Example: Factors of 12 → 1, 2, 3, 4, 6, 12. Factors of 18 → 1, 2, 3, 6, 9, 18. Common factors: 1, 2, 3, 6. The highest is 6. So HCF(12, 18) = 6.",
        ],
        visual: { type: "factor-grid", a: 12, b: 18 },
        tip: "Quick shortcut: keep dividing both numbers by small primes (2, 3, 5…) until no common factor remains. Multiply those divisors to get the HCF.",
        imagePrompt: "Two overlapping circles forming a Venn diagram. Left circle labelled 12 contains factor chips: 4 and 12. Right circle labelled 18 contains factor chips: 9 and 18. The overlapping centre glows gold and contains chips for 1, 2, 3, 6, with 6 highlighted in a golden star. Colourful educational style.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-2.png",
      },
      {
        title: "Simplifying a Ratio Using HCF",
        hook: "Divide BOTH terms by their HCF and you get the simplest form — same relationship, smaller numbers.",
        body: [
          "12 : 18 looks complicated, but it's the same relationship as 2 : 3. How? Divide both by HCF(12, 18) = 6. Both terms shrink, but the ratio stays identical.",
          "Think of it like zooming out on a map. The distances change, but the proportions are preserved. Simplified ratios are easier to compare, communicate, and work with.",
        ],
        visual: { type: "simplify", from: [12, 18], hcf: 6, to: [2, 3] },
        tip: "After simplifying, check: do the two numbers share any common factor other than 1? If yes, divide again. If no, you're done!",
        imagePrompt: "A before-and-after transformation scene. On the left a large stone tablet shows 12:18 looking heavy and complicated. A magic wand divides both by 6 with sparkles. On the right the same tablet glows green showing 2:3 looking clean and simple. Fun whimsical illustration.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-what-is-a-ratio-3.png",
      },
    ],
  },

  "equivalent-ratios": {
    cards: [
      {
        title: "What are Equivalent Ratios?",
        hook: "Equivalent ratios are the same comparison — just at a different scale.",
        body: [
          "2:3, 4:6, 6:9, and 10:15 all describe the same relationship: for every 2 of one thing, there are 3 of the other. They're equivalent, just like ½ = 2/4 = 5/10.",
          "Think of a recipe: a pancake recipe for 2 people uses 1 cup oats and 2 cups milk (1:2). For 4 people you'd use 2 cups oats and 4 cups milk (2:4). Same ratio, bigger batch — that's equivalent ratios in action!",
        ],
        visual: { type: "scale-chain", base: [1, 2], steps: [2, 3, 4] },
        tip: "To create equivalent ratios, multiply OR divide BOTH terms by the same number. Changing only one term breaks the relationship.",
        imagePrompt: "Three bowls of pancake batter lined up in a row showing recipe scaling. Small bowl labelled 2 people with 1 scoop oats and 2 cups milk. Medium bowl labelled 4 people with 2 scoops and 4 cups. Large bowl labelled 6 people with 3 scoops and 6 cups. Arrows between bowls show the scaling. Warm kitchen illustration style.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-0.png",
      },
      {
        title: "The Cross-Multiplication Test",
        hook: "If a×d = b×c, then a:b and c:d are equivalent. It's a one-step check.",
        body: [
          "To verify 2:3 and 4:6, cross-multiply: 2×6 = 12 and 3×4 = 12. They match — so the ratios are equivalent!",
          "This works because equivalent ratios produce equal cross-products. If the products differ, the ratios are NOT equivalent. This test is used all through algebra and trigonometry.",
        ],
        visual: { type: "cross-check", p: [2, 3], q: [4, 6] },
        imagePrompt: "Two ratio boxes side by side. Left box in purple shows 2:3 and right box in orange shows 4:6. Two bold diagonal arrows cross between them forming an X shape. Top arrow is labelled 2 times 6 equals 12 and bottom arrow is labelled 3 times 4 equals 12. A big green equals sign glows in the centre between them. Clean educational diagram style.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-1.png",
      },
      {
        title: "Finding a Missing Value",
        hook: "Spot the scale factor, then apply it to find the mystery number.",
        body: [
          "If 2:3 = ?:12, how do we find '?'? The second term went from 3 to 12 — that's ×4. So the first term must also be ×4: 2×4 = 8. The answer is 8.",
          "This 'scale factor' idea is the heart of proportion problems. Identify how one term changed, apply the same multiplier to the other, and you're done.",
        ],
        visual: { type: "missing-val", known: [2, 3], target: 12, scale: 4, answer: 8 },
        tip: "Always check with cross-multiplication: 2×12 = 24 and 3×8 = 24. ✓",
        imagePrompt: "A mystery puzzle scene with a magnifying glass and question mark. Shows the proportion 2:3 equals question mark:12. A detective character points to an arrow from 3 to 12 labelled times 4. Another arrow shows 2 times 4 equals 8 and the question mark box lights up revealing 8 in gold. Fun adventurous illustration for students.",
        imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/concept-equivalent-ratios-2.png",
      },
    ],
  },
};

export interface BarData {
  value: number;
  label: string;
  color: "purple" | "cyan" | "orange" | "green";
}

// Each TextPart[] is one display line; a BlogVisual can be multiple lines of parts.
export type TextPart = {
  text: string;
  bold?: boolean;
  color?: "accent" | "success" | "highlight";
};

export type BlogVisual =
  | { type: "bars"; bars: BarData[] }
  | { type: "equation"; lines: TextPart[][] };

export interface BlogStep {
  method: string;
  instruction: string;
  visual: BlogVisual;
  why: string;
}

export interface BlogProblem {
  title: string;
  problem: string;
  steps: BlogStep[];
}

export interface SectionBlogContent {
  keyFacts: {
    what: string;
    formula: string;
    example: string;
    tip: string;
  };
  problems: BlogProblem[];
}

export const BLOG_SEEDS: Record<string, SectionBlogContent> = {

  // ─── SECTION 1: What is a Ratio? ─────────────────────────────────────────
  "what-is-a-ratio": {
    keyFacts: {
      what: "A ratio compares two quantities of the same kind by division. It tells you how many times one quantity contains another.",
      formula: "Ratio of a to b = a : b. To simplify, divide both terms by their HCF (Highest Common Factor).",
      example: "6 red, 9 blue marbles → Ratio = 6:9. HCF(6,9) = 3. Simplest form = 2:3.",
      tip: "Always write the ratio in the ORDER the question asks! 'Red to blue' ≠ 'Blue to red'.",
    },
    problems: [
      {
        title: "Marble Jar — 12 : 18",
        problem: "A jar has 12 red marbles and 18 blue marbles. Express the ratio of red to blue marbles in its simplest form.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Spot the two quantities",
            visual: {
              type: "bars",
              bars: [
                { value: 12, label: "Red marbles", color: "purple" },
                { value: 18, label: "Blue marbles", color: "cyan" },
              ],
            },
            why: "We have 12 red marbles and 18 blue marbles. The question asks for red TO blue — red goes first.",
          },
          {
            method: "WRITE THE RATIO",
            instruction: "Put red first, blue second",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Red : Blue  =  " }, { text: "12", bold: true, color: "accent" }, { text: "  :  " }, { text: "18", bold: true, color: "accent" }],
              ],
            },
            why: "The question asks for red TO blue, so red comes first. Writing 18:12 would give a completely different ratio!",
          },
          {
            method: "FIND THE HCF",
            instruction: "What's the biggest number that divides both 12 and 18?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Factors of 12 → 1, 2, 3, 4, " }, { text: "6", bold: true, color: "success" }, { text: ", 12" }],
                [{ text: "Factors of 18 → 1, 2, 3, " }, { text: "6", bold: true, color: "success" }, { text: ", 9, 18" }],
                [{ text: "HCF(12, 18)  =  " }, { text: "6", bold: true, color: "success" }],
              ],
            },
            why: "The HCF is the largest number that divides both terms evenly. Factors of 12 and 18 share 1, 2, 3, 6 — the largest is 6.",
          },
          {
            method: "DIVIDE BOTH TERMS",
            instruction: "Divide both by 6 — the ratio stays identical",
            visual: {
              type: "equation",
              lines: [
                [{ text: "12  ÷  6  =  " }, { text: "2", bold: true, color: "accent" }],
                [{ text: "18  ÷  6  =  " }, { text: "3", bold: true, color: "accent" }],
              ],
            },
            why: "Dividing both terms by the same number keeps the ratio identical. 12:18 and 2:3 describe exactly the same relationship.",
          },
          {
            method: "SIMPLEST FORM",
            instruction: "Write the final answer",
            visual: {
              type: "equation",
              lines: [
                [{ text: "12 : 18  =  " }, { text: "2 : 3", bold: true, color: "success" }],
              ],
            },
            why: "For every 2 red marbles there are exactly 3 blue marbles — no matter how many marbles are in the jar. That's the power of a ratio!",
          },
        ],
      },

      {
        title: "Classroom — Boys : Girls",
        problem: "A class has 24 girls and 16 boys. Find the ratio of boys to girls in its simplest form.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Spot the quantities AND the order",
            visual: {
              type: "bars",
              bars: [
                { value: 16, label: "Boys", color: "purple" },
                { value: 24, label: "Girls", color: "cyan" },
              ],
            },
            why: "16 boys and 24 girls. The question says BOYS to GIRLS — so boys come first, even though there are fewer!",
          },
          {
            method: "WRITE THE RATIO",
            instruction: "Boys first — exactly as the question asks",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Boys : Girls  =  " }, { text: "16", bold: true, color: "accent" }, { text: "  :  " }, { text: "24", bold: true, color: "accent" }],
              ],
            },
            why: "Writing 24:16 would give the girls-to-boys ratio — a different answer entirely. Order matters in every ratio problem.",
          },
          {
            method: "FIND THE HCF",
            instruction: "What's the biggest number dividing both 16 and 24?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Factors of 16 → 1, 2, 4, " }, { text: "8", bold: true, color: "success" }, { text: ", 16" }],
                [{ text: "Factors of 24 → 1, 2, 3, 4, 6, " }, { text: "8", bold: true, color: "success" }, { text: ", 12, 24" }],
                [{ text: "HCF(16, 24)  =  " }, { text: "8", bold: true, color: "success" }],
              ],
            },
            why: "The largest number that divides both 16 and 24 exactly is 8.",
          },
          {
            method: "DIVIDE BOTH TERMS",
            instruction: "Divide both by 8",
            visual: {
              type: "equation",
              lines: [
                [{ text: "16  ÷  8  =  " }, { text: "2", bold: true, color: "accent" }],
                [{ text: "24  ÷  8  =  " }, { text: "3", bold: true, color: "accent" }],
              ],
            },
            why: "Dividing both by 8 simplifies the ratio while keeping the relationship perfectly intact.",
          },
          {
            method: "SIMPLEST FORM",
            instruction: "Write the final answer",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Boys : Girls  =  " }, { text: "2 : 3", bold: true, color: "success" }],
              ],
            },
            why: "For every 2 boys there are 3 girls. Whether the class has 10 students or 1,000, this ratio holds — that's what makes ratios so useful.",
          },
        ],
      },

      {
        title: "Fruit Basket — Apples : Total",
        problem: "A basket has 15 apples and 25 oranges. Find the ratio of apples to total fruits in simplest form.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "We need apples vs TOTAL — not oranges!",
            visual: {
              type: "bars",
              bars: [
                { value: 15, label: "Apples", color: "orange" },
                { value: 25, label: "Oranges", color: "green" },
              ],
            },
            why: "This question asks for apples out of EVERYTHING. So we need to find the total first before writing the ratio.",
          },
          {
            method: "FIND THE TOTAL",
            instruction: "Add all fruits together",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Total  =  15  +  25  =  " }, { text: "40", bold: true, color: "accent" }],
              ],
            },
            why: "15 apples + 25 oranges = 40 fruits total. The ratio will be apples compared to this total.",
          },
          {
            method: "WRITE THE RATIO",
            instruction: "Apples to Total",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Apples : Total  =  " }, { text: "15", bold: true, color: "accent" }, { text: "  :  " }, { text: "40", bold: true, color: "accent" }],
              ],
            },
            why: "We compare 15 apples against 40 total fruits.",
          },
          {
            method: "FIND THE HCF",
            instruction: "What divides both 15 and 40?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Factors of 15 → 1, 3, " }, { text: "5", bold: true, color: "success" }, { text: ", 15" }],
                [{ text: "Factors of 40 → 1, 2, 4, " }, { text: "5", bold: true, color: "success" }, { text: ", 8, 10, 20, 40" }],
                [{ text: "HCF(15, 40)  =  " }, { text: "5", bold: true, color: "success" }],
              ],
            },
            why: "The HCF of 15 and 40 is 5.",
          },
          {
            method: "DIVIDE BOTH TERMS",
            instruction: "Divide both by 5",
            visual: {
              type: "equation",
              lines: [
                [{ text: "15  ÷  5  =  " }, { text: "3", bold: true, color: "accent" }],
                [{ text: "40  ÷  5  =  " }, { text: "8", bold: true, color: "accent" }],
              ],
            },
            why: "Dividing both by 5 gives us the simplest form.",
          },
          {
            method: "SIMPLEST FORM",
            instruction: "3 out of every 8 fruits are apples!",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Apples : Total  =  " }, { text: "3 : 8", bold: true, color: "success" }],
              ],
            },
            why: "3:8 means that out of every 8 fruits, exactly 3 are apples. Much neater than 15:40 — and it tells the same story!",
          },
        ],
      },
    ],
  },

  // ─── SECTION 2: Equivalent Ratios ────────────────────────────────────────
  "equivalent-ratios": {
    keyFacts: {
      what: "Equivalent ratios represent the same comparison at different scales — like equivalent fractions. 2:3, 4:6, and 10:15 all say the same thing.",
      formula: "a:b = (a×k):(b×k) for any k≠0. To CHECK: cross-multiply. If a×d = b×c, then a:b and c:d are equivalent.",
      example: "Is 6:9 = 10:15? Cross-multiply: 6×15 = 90, 9×10 = 90. Equal! ✓ Both simplify to 2:3.",
      tip: "Simplify both ratios to their lowest terms — if they match, they're equivalent!",
    },
    problems: [
      {
        title: "Equal or Not? — 4:6 vs 10:15",
        problem: "Verify whether the ratios 4:6 and 10:15 are equivalent using cross-multiplication.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Two ratios — are they the same relationship?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Ratio 1  →  " }, { text: "4 : 6", bold: true, color: "accent" }],
                [{ text: "Ratio 2  →  " }, { text: "10 : 15", bold: true, color: "highlight" }],
                [{ text: "Are they equivalent?" }],
              ],
            },
            why: "We have two ratios: 4:6 and 10:15. We need to test if they describe the exact same relationship.",
          },
          {
            method: "SET UP CROSS-MULTIPLICATION",
            instruction: "Multiply diagonally across the two ratios",
            visual: {
              type: "equation",
              lines: [
                [{ text: "4 : 6   =   10 : 15" }],
                [{ text: "↘              ↗" }],
                [{ text: "4 × 15    and    6 × 10", bold: true, color: "accent" }],
              ],
            },
            why: "For a:b and c:d, we check if a×d = b×c. Here a=4, b=6, c=10, d=15.",
          },
          {
            method: "CALCULATE BOTH PRODUCTS",
            instruction: "Work out each multiplication",
            visual: {
              type: "equation",
              lines: [
                [{ text: "4  ×  15  =  " }, { text: "60", bold: true, color: "accent" }],
                [{ text: "6  ×  10  =  " }, { text: "60", bold: true, color: "accent" }],
              ],
            },
            why: "First diagonal: 4 × 15 = 60. Second diagonal: 6 × 10 = 60.",
          },
          {
            method: "COMPARE THE PRODUCTS",
            instruction: "Are the cross-products equal?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "60  =  " }, { text: "60  ✓", bold: true, color: "success" }],
                [{ text: "Cross-products match!", bold: true, color: "success" }],
              ],
            },
            why: "Both cross-products are 60, so the ratios ARE equivalent!",
          },
          {
            method: "CONFIRM BY SIMPLIFYING",
            instruction: "Both reduce to the same simplest form",
            visual: {
              type: "equation",
              lines: [
                [{ text: "4:6  ÷ 2  =  " }, { text: "2:3", bold: true, color: "success" }],
                [{ text: "10:15  ÷ 5  =  " }, { text: "2:3", bold: true, color: "success" }],
                [{ text: "Same lowest form  →  Equivalent! ✓", bold: true, color: "success" }],
              ],
            },
            why: "4:6 simplified = 2:3. 10:15 simplified = 2:3. Same lowest form confirms they are definitely equivalent.",
          },
        ],
      },

      {
        title: "Missing Value — 2:3 = ?:12",
        problem: "Find the missing number so that the ratios are equivalent:  2 : 3  =  ? : 12",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Find the value that makes both ratios equal",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  :  3   =   " }, { text: "?", bold: true, color: "accent" }, { text: "  :  12" }],
              ],
            },
            why: "We need to find '?' so that both ratios describe the same relationship. We look for a pattern.",
          },
          {
            method: "FIND THE SCALE FACTOR",
            instruction: "How did the second term change from 3 to 12?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "3  ×  " }, { text: "4", bold: true, color: "accent" }, { text: "  =  12" }],
                [{ text: "Scale factor  =  " }, { text: "4", bold: true, color: "accent" }],
              ],
            },
            why: "12 ÷ 3 = 4. The second term was multiplied by 4. For equivalent ratios, we must multiply BOTH terms by the same number.",
          },
          {
            method: "APPLY TO FIRST TERM",
            instruction: "Multiply the first term by 4 as well",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  ×  " }, { text: "4", bold: true, color: "accent" }, { text: "  =  " }, { text: "8", bold: true, color: "success" }],
              ],
            },
            why: "BOTH terms must be multiplied by the same factor. So 2 × 4 = 8. The missing value is 8.",
          },
          {
            method: "VERIFY WITH CROSS-MULTIPLICATION",
            instruction: "Cross-check the answer",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  ×  12  =  " }, { text: "24", bold: true, color: "accent" }],
                [{ text: "3  ×   8  =  " }, { text: "24  ✓", bold: true, color: "success" }],
              ],
            },
            why: "2×12 = 3×8 = 24. The cross-products match, so 2:3 and 8:12 are equivalent.",
          },
          {
            method: "WRITE THE ANSWER",
            instruction: "The missing value is 8",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  :  3   =   " }, { text: "8  :  12", bold: true, color: "success" }],
              ],
            },
            why: "? = 8. To scale any ratio up, multiply BOTH terms by the same factor. Here, factor = 4.",
          },
        ],
      },

      {
        title: "Smoothie Scale-Up — 2:3 → ?:9",
        problem: "A smoothie needs 2 bananas for every 3 cups of milk. How many bananas are needed for 9 cups of milk?",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Write the original ratio",
            visual: {
              type: "bars",
              bars: [
                { value: 2, label: "Bananas", color: "orange" },
                { value: 3, label: "Cups of milk", color: "cyan" },
              ],
            },
            why: "Bananas : Milk = 2 : 3. We need to scale this recipe up to 9 cups of milk.",
          },
          {
            method: "SET UP THE PROPORTION",
            instruction: "Create the equivalent ratio equation",
            visual: {
              type: "equation",
              lines: [
                [{ text: "Bananas : Milk" }],
                [{ text: "2  :  3   =   " }, { text: "?", bold: true, color: "accent" }, { text: "  :  9" }],
              ],
            },
            why: "We want the equivalent ratio where milk = 9. The '?' is the number of bananas needed.",
          },
          {
            method: "FIND THE SCALE FACTOR",
            instruction: "How did 3 become 9?",
            visual: {
              type: "equation",
              lines: [
                [{ text: "3  ×  " }, { text: "3", bold: true, color: "accent" }, { text: "  =  9" }],
                [{ text: "Scale factor  =  " }, { text: "3", bold: true, color: "accent" }, { text: "   (tripling the recipe!)" }],
              ],
            },
            why: "9 ÷ 3 = 3. We're tripling the recipe. The scale factor is 3.",
          },
          {
            method: "SCALE THE BANANAS",
            instruction: "Multiply bananas by the same factor",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  ×  " }, { text: "3", bold: true, color: "accent" }, { text: "  =  " }, { text: "6", bold: true, color: "success" }],
              ],
            },
            why: "Both terms must be multiplied by 3. So 2 × 3 = 6 bananas.",
          },
          {
            method: "WRITE THE ANSWER",
            instruction: "6 bananas for 9 cups of milk!",
            visual: {
              type: "equation",
              lines: [
                [{ text: "2  :  3   =   " }, { text: "6  :  9", bold: true, color: "success" }],
                [{ text: "→  6 bananas needed!", bold: true, color: "success" }],
              ],
            },
            why: "The smoothie will taste exactly the same because the ratio 2:3 is preserved — just at a larger scale!",
          },
        ],
      },
    ],
  },
};
