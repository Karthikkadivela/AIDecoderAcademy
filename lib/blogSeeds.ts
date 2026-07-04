// Seeded blog content for the Concept phase.
// Each section has concept cards (explanation phase) + key facts + 3 step-by-step problems.

// ─── Concept Card types ───────────────────────────────────────────────────────

export type ConceptVisual =
  | { type: "ratio-dots";        groups: { count: number; color: string; label: string }[] }
  | { type: "ratio-forms";       a: number; b: number }
  | { type: "factor-grid";       a: number; b: number }
  | { type: "simplify";          from: [number, number]; hcf: number; to: [number, number] }
  | { type: "scale-chain";       base: [number, number]; steps: number[] }
  | { type: "cross-check";       p: [number, number]; q: [number, number] }
  | { type: "missing-val";       known: [number, number]; target: number; scale: number; answer: number }
  | { type: "probability-bar";   favourable: number; total: number; label: string }
  | { type: "sample-space-grid"; items: string[]; highlighted: number[]; label: string }
  | { type: "venn-complement";   eventLabel: string; complementLabel: string; pEvent: string; pComplement: string }
  | { type: "number-line-prob";  points: { label: string; value: number; color: string }[] }
  | { type: "event-tree";        root: string; branches: { label: string; prob: string; color: string }[] };

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

  // ─── PROBABILITY SECTIONS ────────────────────────────────────────────────────

  "what-is-probability": {
    cards: [
      {
        title: "What is Probability?",
        hook: "Probability measures how likely something is — on a scale from 0 (impossible) to 1 (certain).",
        body: [
          "Every day we face uncertainty: will it rain? Will I get a 6 in Ludo? Will Swiggy arrive on time? Probability is the mathematical tool that turns these vague feelings into precise numbers between 0 and 1.",
          "P = 0 means the event cannot happen. P = 1 means it must happen. Every other event sits somewhere between these extremes. A fair coin flip sits exactly at P = 0.5 — perfectly balanced between happening and not happening.",
        ],
        visual: {
          type: "number-line-prob",
          points: [
            { label: "Impossible (never)", value: 0, color: "#DC2626" },
            { label: "Unlikely", value: 0.2, color: "#F97316" },
            { label: "Even chance", value: 0.5, color: "#F59E0B" },
            { label: "Likely", value: 0.8, color: "#10B981" },
            { label: "Certain (always)", value: 1, color: "#059669" },
          ],
        },
        tip: "P = 0 is 'impossible', NOT 'very unlikely'. P = 1 is 'certain', NOT 'very likely'. These are the only two exact boundaries — everything else is strictly between them.",
        imagePrompt: "Colourful horizontal probability number line from 0 to 1 with five clear markers: a red X at 0 (impossible), a confused face at 0.2, a balanced scale at 0.5, a thumbs up at 0.8, a green check at 1 (certain), bright educational poster style, no text",
        imageUrl: "/learn-seeds/concept-what-is-probability-0.png",
      },
      {
        title: "Random Experiments and Sample Space",
        hook: "A random experiment is any action where the outcome is uncertain — and the sample space is the complete list of all possible results.",
        body: [
          "Rolling a Ludo die is a random experiment. Its sample space is S = {1, 2, 3, 4, 5, 6} — exactly 6 equally likely outcomes. Picking a numbered chit from a bowl of 10 chits (numbered 1–10) at a school lucky draw is another random experiment with S = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}.",
          "Defining the sample space is always Step 1 in any probability problem. Miss it and you'll miscalculate. A Ludo die with a chipped face, or a bowl with missing chits, would shrink the sample space — and change every probability calculation with it.",
        ],
        visual: {
          type: "sample-space-grid",
          items: ["1", "2", "3", "4", "5", "6"],
          highlighted: [1, 3, 5],
          label: "Ludo die outcomes — even numbers highlighted",
        },
        tip: "Always write out S = {...} at the start of any probability problem. Skipping this step is the most common source of errors — especially in word problems that quietly change the conditions.",
        imagePrompt: "Cartoon illustration of a colourful Ludo board game die next to a grid showing all six outcomes in bright colored circles, a glowing box labelled Sample Space S surrounding all six, three even-numbered circles highlighted in gold, cheerful educational style, no text",
        imageUrl: "/learn-seeds/concept-what-is-probability-1.png",
      },
      {
        title: "Events and Favourable Outcomes",
        hook: "An event is a specific outcome (or group of outcomes) you are interested in — and P(E) counts how many of the total outcomes qualify.",
        body: [
          "A teacher picks one student at random from a class of 30 to read out the answer. Define Event E = 'a girl is picked' and there are 18 girls. E has 18 favourable outcomes out of 30 total. P(E) = 18/30 = 3/5. The event IS the subset you care about; probability is how large that subset is compared to the whole.",
          "An elementary event has exactly one outcome (e.g. 'Kavya is picked' — one specific student). A compound event has more than one (e.g. 'a girl is picked' — 18 possibilities). All probability calculations reduce to: how many elementary events fit inside your compound event?",
        ],
        visual: {
          type: "probability-bar",
          favourable: 18,
          total: 30,
          label: "P(girl picked from class of 30) = 18/30 = 3/5",
        },
        tip: "Favourable outcomes ≠ good outcomes. 'Favourable' just means the outcomes that satisfy your event definition. P(Kavya is picked) = 1/30 — one favourable outcome, not a value judgement about Kavya.",
        imagePrompt: "Educational cartoon showing a classroom grid of 30 student faces, 18 girls highlighted in bright purple as favourable outcomes and 12 boys dimmed, a fraction bar below showing 18 over 30, cheerful flat illustration, no text",
        imageUrl: "/learn-seeds/concept-what-is-probability-2.png",
      },
    ],
  },

  "types-of-events": {
    cards: [
      {
        title: "Certain and Impossible Events",
        hook: "P = 1 means it MUST happen. P = 0 means it CANNOT happen. Nothing in between is either.",
        body: [
          "Your CBSE board test is out of 50 marks. P(scoring somewhere between 0 and 50) = 1 — a certain event, because every result must land in this range. P(scoring 55) = 0 — an impossible event, because 55 doesn't exist in S = {0, 1, 2 … 50}.",
          "Certain events (P = 1) and impossible events (P = 0) are the two anchors of the probability scale. Every real experiment with genuine uncertainty has probabilities strictly between 0 and 1. If P = 0 or P = 1, the outcome was never truly uncertain.",
        ],
        visual: {
          type: "number-line-prob",
          points: [
            { label: "P(score > 50 on 50-mark test) = 0", value: 0, color: "#DC2626" },
            { label: "P(score 0–50) = 1", value: 1, color: "#059669" },
          ],
        },
        tip: "Don't confuse 'very unlikely' with impossible. P = 0.001 is very unlikely but not impossible. Only P = 0 is truly impossible. A common exam mistake: calling a low-probability event impossible.",
        imagePrompt: "Two cartoon panels side by side: left panel shows a red X over a student writing 55 on a test paper marked out of 50 (impossible score), right panel shows a green checkmark with a score between 0 and 50 fitting perfectly inside the test range (certain), bright clean educational style, no text",
        imageUrl: "/learn-seeds/concept-types-of-events-0.png",
      },
      {
        title: "Equally Likely Events",
        hook: "Events are equally likely when every individual outcome has the same probability — and this only happens when the experiment is perfectly fair.",
        body: [
          "The IPL coin toss gives two equally likely outcomes: Heads and Tails — P(H) = P(T) = 1/2. Rolling a fair Ludo die gives six equally likely outcomes — P(1) = P(2) = ... = P(6) = 1/6. 'Equally likely' is an assumption that only holds when no outcome is physically favoured.",
          "Most CBSE probability problems assume equal likelihood — but real life often doesn't. A worn Ludo die, a bent cricket coin, or a spinner with unequal sections all break this assumption. When outcomes aren't equally likely, you need actual frequency data rather than the formula.",
        ],
        visual: {
          type: "sample-space-grid",
          items: ["H", "T"],
          highlighted: [0, 1],
          label: "IPL toss — both outcomes equally likely",
        },
        tip: "You cannot assume equally likely outcomes just because there are two options. India vs a very weak cricket team is NOT 50-50 — the outcomes aren't equally likely even though there are only two results (win/lose).",
        imagePrompt: "Cheerful cartoon of an IPL umpire tossing a gold coin high in the air above a cricket pitch, two equal probability bars below labeled Heads and Tails each showing P equals half, bright stadium background, flat educational illustration, no text",
        imageUrl: "/learn-seeds/concept-types-of-events-1.png",
      },
      {
        title: "Elementary vs Compound Events",
        hook: "An elementary event is exactly one outcome. A compound event is a collection of elementary events.",
        body: [
          "A teacher picks one student from a class of 40. 'Riya is picked' — that's an elementary event: P = 1/40. 'A girl is picked' — that's a compound event containing every girl (say 24 girls): P = 24/40 = 3/5. One specific student is elementary; any member of a group is compound.",
          "Every probability calculation ultimately reduces to: count the elementary events inside your compound event, then divide by the total. Compound events are just subsets of the sample space. The bigger the subset, the higher the probability.",
        ],
        visual: {
          type: "probability-bar",
          favourable: 24,
          total: 40,
          label: "P(girl picked from class of 40) = 24/40 = 3/5",
        },
        tip: "In any experiment, the probabilities of ALL elementary events must add to 1. Use this as a check: if your individual probabilities don't sum to 1, you've either missed a student or miscounted the class.",
        imagePrompt: "Cartoon of a classroom with 40 student figures, 24 girl figures highlighted in gold while 16 boy figures are dimmed, a fraction 24 over 40 displayed prominently below, cheerful educational flat illustration, no text",
        imageUrl: "/learn-seeds/concept-types-of-events-2.png",
      },
    ],
  },

  "probability-formula": {
    cards: [
      {
        title: "The Probability Formula",
        hook: "P(E) = (Number of favourable outcomes) / (Total number of outcomes) — the foundation of all theoretical probability.",
        body: [
          "Every probability problem reduces to this formula. Count the outcomes that satisfy your event (favourable), count all possible outcomes (total), divide. P(rolling a multiple of 3 on a Ludo die) = 2/6 = 1/3. P(picking a girl from 40 students with 16 girls) = 16/40 = 2/5. The formula is the same; only the numbers change.",
          "The formula assumes two things: all outcomes are equally likely, and the sample space is finite. These two conditions make the formula work. When either condition fails — a biased Ludo die, an unequal class — the formula needs adjustment.",
        ],
        visual: {
          type: "probability-bar",
          favourable: 2,
          total: 6,
          label: "P(multiple of 3 on Ludo die) = 2 favourable ÷ 6 total = 1/3",
        },
        tip: "Simplify the fraction! P = 2/6 and P = 1/3 are the same answer, but 1/3 is simpler. Examiners expect the simplest form. Always divide by HCF after computing the fraction.",
        imagePrompt: "Clean educational poster showing the probability formula illustrated with a Ludo die where faces 3 and 6 are glowing gold as multiples of 3, and the other four faces are dimmed, bright clear mathematical illustration style, no text",
        imageUrl: "/learn-seeds/concept-probability-formula-0.png",
      },
      {
        title: "Computing P(E) Step by Step",
        hook: "List the sample space, circle the favourable outcomes, count both, divide — every time, without exception.",
        body: [
          "Step 1: Write the sample space S. Step 2: Identify event E (the outcomes you want). Step 3: Count |E| (favourable) and |S| (total). Step 4: P(E) = |E|/|S|. Example: P(vowel when a letter is chosen randomly from 'PROBABILITY') — first list all letters, mark the vowels, count, divide.",
          "For the word PROBABILITY: letters are P,R,O,B,A,B,I,L,I,T,Y — 11 letters total. Vowels are O, A, I, I — 4 vowels. P(vowel) = 4/11. Notice: the two I's count separately because each letter position is a separate outcome.",
        ],
        visual: {
          type: "sample-space-grid",
          items: ["P","R","O","B","A","B","I","L","I","T","Y"],
          highlighted: [2, 4, 6, 8],
          label: "Vowels in PROBABILITY highlighted",
        },
        tip: "Count individual positions, not unique letters! In PROBABILITY, 'I' appears twice — each I is a separate favourable outcome. P(I) = 2/11, not 1/11. This is the most common mistake in word probability problems.",
        imagePrompt: "Cartoon illustration of the word PROBABILITY written in large block letters, with the vowels O, A, I, I highlighted in bright gold while consonants stay grey, a fraction 4 over 11 shown below, cheerful educational style, no text",
        imageUrl: "/learn-seeds/concept-probability-formula-1.png",
      },
      {
        title: "P(E) + P(E') = 1 — The Complement Rule",
        hook: "The probability of an event happening plus the probability of it NOT happening always equals exactly 1.",
        body: [
          "If P(rain today) = 0.35, then P(no rain) = 1 - 0.35 = 0.65. This isn't a coincidence — it's a mathematical certainty. 'Rain' and 'no rain' together cover every possibility. One of them must happen. So their probabilities must sum to 1, always.",
          "This rule is powerful because it's often easier to count what you DON'T want. P(at least one head in 3 coin flips) is easier to find as 1 - P(no heads) = 1 - (1/2)³ = 1 - 1/8 = 7/8 than by listing all favourable outcomes directly.",
        ],
        visual: {
          type: "venn-complement",
          eventLabel: "E: Rain",
          complementLabel: "E': No Rain",
          pEvent: "P(E) = 0.35",
          pComplement: "P(E') = 0.65",
        },
        tip: "Use the complement when counting 'at least one', 'at least two', or 'not X' — these are always easier via 1 - P(opposite). This technique appears in every CBSE board exam.",
        imagePrompt: "Two adjacent rectangles inside a universe box, left rectangle in indigo labeled E showing rain cloud icon and 0.35, right rectangle in slate labeled E-prime showing sunshine icon and 0.65, plus sign between them and equals 1 below, clean mathematical illustration, no text",
        imageUrl: "/learn-seeds/concept-probability-formula-2.png",
      },
    ],
  },

  "compound-events": {
    cards: [
      {
        title: "Complementary Events",
        hook: "E and E' (not E) are complementary — they cover the entire sample space with no overlap, so P(E) + P(E') = 1 always.",
        body: [
          "In a class of 40 students, 25 are girls. P(girl selected) = 25/40 = 5/8. P(NOT girl) = P(boy) = 1 - 5/8 = 3/8. Check: 25 girls + 15 boys = 40. P(girl) + P(boy) = 5/8 + 3/8 = 1. ✓",
          "Complementary events are the most useful shortcut in probability. Whenever you find yourself thinking 'I need P(at least one...)' or 'P(not all...)' — that's your signal to compute 1 minus the complement. It almost always involves fewer cases to count.",
        ],
        visual: {
          type: "venn-complement",
          eventLabel: "Girl selected",
          complementLabel: "Boy selected",
          pEvent: "P(E) = 25/40 = 5/8",
          pComplement: "P(E') = 15/40 = 3/8",
        },
        tip: "P(E) + P(E') = 1 is always true, no exceptions. If your numbers don't add to 1, check your count of favourable outcomes or total outcomes — one of them is wrong.",
        imagePrompt: "Two colourful rectangles inside a sample space box, left rectangle in purple labeled Girl with 25 small figure icons, right rectangle in teal labeled Boy with 15 figure icons, fractions shown inside, arrows showing they sum to 1, educational flat illustration, no text",
        imageUrl: "/learn-seeds/concept-compound-events-0.png",
      },
      {
        title: "Mutually Exclusive Events",
        hook: "Two events are mutually exclusive if they cannot both happen at the same time — their intersection is empty.",
        body: [
          "Picking a red ball and picking a blue ball in one draw from a bag are mutually exclusive — one ball can't be two colours. From a bag of 5 red, 3 blue, 2 green balls: P(red or blue) = P(red) + P(blue) = 5/10 + 3/10 = 8/10 = 4/5.",
          "Mutually exclusive is different from complementary! Complementary events must cover everything (P = 1 together). Mutually exclusive events just can't overlap — they might not cover everything. Red and non-red are both mutually exclusive AND complementary. Red and blue are mutually exclusive but NOT complementary (green balls exist too).",
        ],
        visual: {
          type: "venn-complement",
          eventLabel: "Red ball (5/10)",
          complementLabel: "Blue ball (3/10)",
          pEvent: "P(Red) = 1/2",
          pComplement: "P(Blue) = 3/10",
        },
        tip: "Mutually exclusive ≠ complementary. Complementary events always add to 1. Mutually exclusive events add to less than 1 (unless they also happen to be complementary). Check: does P(A) + P(B) = 1? If yes, complementary. If < 1, mutually exclusive only.",
        imagePrompt: "Two completely separate non-overlapping circles inside a rectangle universe, left circle in red shows 5 red ball icons, right circle in blue shows 3 blue ball icons, remaining space in green shows 2 green ball icons, fractions labeled inside each circle, clear educational diagram, no text",
        imageUrl: "/learn-seeds/concept-compound-events-1.png",
      },
      {
        title: "The Addition Rule",
        hook: "P(A or B) = P(A) + P(B) for mutually exclusive events — because the two groups share no outcomes to double-count.",
        body: [
          "In a class quiz final with 6 equally-matched students, only one can win. P(Arjun wins OR Priya wins) = P(Arjun) + P(Priya) = 1/6 + 1/6 = 2/6 = 1/3. The addition rule works perfectly here — only one winner is possible, so the events share no outcomes.",
          "When events ARE NOT mutually exclusive, a correction is needed: P(A or B) = P(A) + P(B) - P(A and B). The subtraction removes the overlap counted twice. For CBSE Class 10, most problems involve mutually exclusive events, so the simple addition rule applies.",
        ],
        visual: {
          type: "probability-bar",
          favourable: 2,
          total: 6,
          label: "P(Arjun or Priya wins) = 1/6 + 1/6 = 2/6 = 1/3",
        },
        tip: "The addition rule P(A or B) = P(A) + P(B) works ONLY when A and B are mutually exclusive. If they can overlap, you must subtract the intersection or you'll over-count. Check for overlap before adding.",
        imagePrompt: "Cartoon of six students standing in a row for a quiz final, two students (a boy and a girl) highlighted in bright gold with a plus sign between them, the other four students dimmed, a fraction 2 over 6 shown below, cheerful classroom illustration, no text",
        imageUrl: "/learn-seeds/concept-compound-events-2.png",
      },
    ],
  },

  "real-world-probability": {
    cards: [
      {
        title: "Experimental vs Theoretical Probability",
        hook: "Theoretical probability is calculated from logic. Experimental probability is measured from actual trials. They get closer as trials increase.",
        body: [
          "Theoretical P(India wins an IPL coin toss) = 1/2. But in a 20-match series, India might win 13 tosses. Experimental probability: 13/20 = 0.65. India isn't 'lucky' — small samples always deviate from theory. Across 500 IPL matches, the toss win rate settles very close to 0.5.",
          "Experimental probability = (number of times event occurred) / (total number of trials). This is how insurance companies, Swiggy's delivery algorithm, and BCCI analysts work — they observe millions of real events to estimate probabilities, because real life is too complex for pure theoretical formulas.",
        ],
        visual: {
          type: "probability-bar",
          favourable: 13,
          total: 20,
          label: "Experimental P(India wins toss) over 20 matches = 13/20 ≠ 1/2 theoretical",
        },
        tip: "Experimental probability approaches theoretical probability as the number of trials increases — this is the Law of Large Numbers. Never call a team 'toss-lucky' from 20 matches. You need hundreds of trials before experimental results are meaningful.",
        imagePrompt: "Split illustration showing left side an IPL coin toss with theoretical P equals 1/2 label and right side a tally chart of 20 IPL matches showing 13 India wins and 7 losses with experimental P equals 13/20 label, an arrow showing these converge with more matches, educational flat illustration, no text",
        imageUrl: "/learn-seeds/concept-real-world-probability-0.png",
      },
      {
        title: "Probability in Daily Life",
        hook: "Every percentage, every 'X in Y chance', every forecast is probability in action — you use it without realising.",
        body: [
          "Weather apps, insurance premiums, cricket win predictions, medical test results, stock market forecasts — all of these are probability estimates. When Zomato says '30 min delivery time', the app is computing P(delivery ≤ 30 min) from millions of past orders and giving you a probability, not a guarantee.",
          "Understanding probability protects you from being misled. '95% accurate test' doesn't mean 95% chance you're sick. '1 in 5 scratch cards wins' doesn't mean you're owed 2 wins in 10 tries. Probability literacy is the difference between rational decisions and gut-feeling mistakes.",
        ],
        visual: {
          type: "event-tree",
          root: "Today's outcome",
          branches: [
            { label: "Rain", prob: "P = 0.30", color: "#6366F1" },
            { label: "No Rain", prob: "P = 0.70", color: "#10B981" },
          ],
        },
        tip: "Probability describes populations, not individuals. 'P(rain) = 30%' doesn't say YOUR day will be 30% rainy. It says: of all days with this weather pattern, 30% result in rain. You either get rain or you don't — but the probability predicts the pattern across many such days.",
        imagePrompt: "Cheerful cartoon collage of Indian daily life scenes: a Zomato delivery timer, a weather app showing percentage, a cricket scorecard with win probability, a doctor with a test result percentage, all connected by a probability symbol in the centre, bright colorful flat illustration, no text",
        imageUrl: "/learn-seeds/concept-real-world-probability-1.png",
      },
      {
        title: "Why Probability Matters for Good Decisions",
        hook: "Good decisions aren't about certainty — they're about choosing the option with the best probability given what you know.",
        body: [
          "A cricketer facing a bowler with a 60% wicket rate on short-pitch deliveries should play differently than against one with a 20% rate — even though individual deliveries are uncertain. Probability doesn't tell you what WILL happen; it tells you what's SMARTER to expect and plan for.",
          "Gambler's Fallacy is the opposite of good probabilistic thinking: believing past outcomes change future probabilities for independent events. In IPL, if India has won 5 coin tosses in a row, fans shout 'they're due to lose the next one!' But P(winning toss) = 1/2 on every single toss — the coin has no memory of the last five outcomes.",
        ],
        visual: {
          type: "event-tree",
          root: "IPL Toss (always independent)",
          branches: [
            { label: "Heads", prob: "P = 1/2", color: "#7C3AED" },
            { label: "Tails", prob: "P = 1/2", color: "#0891B2" },
          ],
        },
        tip: "Independent events have no memory. A coin tossed at an IPL match doesn't know it landed Heads the last five times. P stays constant per toss no matter what happened before. This is why 'we're due for a Tails' is always a fallacy — never a strategy.",
        imagePrompt: "Cartoon IPL umpire tossing a coin with five previous Heads results shown in speech bubbles above, the sixth toss showing a large question mark with P equals 1/2 label for both outcomes, fans in stadium background looking uncertain, bright educational flat illustration, no text",
        imageUrl: "/learn-seeds/concept-real-world-probability-2.png",
      },
    ],
  },

  // ─── RATIO SECTIONS ──────────────────────────────────────────────────────────

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

  // ─── PROBABILITY SECTIONS ────────────────────────────────────────────────────

  "what-is-probability": {
    keyFacts: {
      what: "Probability measures how likely an event is to occur. It is always a number between 0 (impossible) and 1 (certain), with 0.5 representing an equal chance.",
      formula: "P(E) = Number of favourable outcomes / Total number of outcomes. All probabilities in a sample space sum to 1.",
      example: "A bag has 3 red and 2 blue balls. P(red) = 3/5 = 0.6. P(blue) = 2/5 = 0.4. Check: 0.6 + 0.4 = 1 ✓",
      tip: "Always verify your probabilities sum to 1. If they don't, you've miscounted the sample space or the favourable outcomes.",
    },
    problems: [
      {
        title: "Bag of Marbles — Finding P(red)",
        problem: "A bag contains 4 red marbles, 3 blue marbles, and 3 green marbles. A marble is drawn at random. Find the probability that it is red.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify total marbles and the event",
            visual: { type: "bars", bars: [{ value: 4, label: "Red", color: "purple" }, { value: 3, label: "Blue", color: "cyan" }, { value: 3, label: "Green", color: "green" }] },
            why: "We have 4 red, 3 blue, 3 green — 10 marbles total. Event E = 'drawing a red marble'. We need P(E).",
          },
          {
            method: "WRITE THE SAMPLE SPACE",
            instruction: "Count total outcomes",
            visual: { type: "equation", lines: [[{ text: "Total marbles  =  4 + 3 + 3  =  " }, { text: "10", bold: true, color: "accent" }]] },
            why: "Each marble is equally likely to be drawn. Total outcomes in sample space = 10.",
          },
          {
            method: "COUNT FAVOURABLE OUTCOMES",
            instruction: "How many marbles satisfy event E?",
            visual: { type: "equation", lines: [[{ text: "Favourable outcomes (red)  =  " }, { text: "4", bold: true, color: "accent" }]] },
            why: "Only red marbles are favourable. There are 4 of them.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(E) = favourable / total",
            visual: { type: "equation", lines: [[{ text: "P(red)  =  4/10  =  " }, { text: "2/5", bold: true, color: "success" }]] },
            why: "P(red) = 4 ÷ 10. Simplify: HCF(4,10) = 2, so 4/10 = 2/5.",
          },
          {
            method: "VERIFY",
            instruction: "Check all probabilities sum to 1",
            visual: { type: "equation", lines: [
              [{ text: "P(red) + P(blue) + P(green)" }],
              [{ text: "=  2/5 + 3/10 + 3/10  =  4/10 + 3/10 + 3/10  =  " }, { text: "10/10 = 1  ✓", bold: true, color: "success" }],
            ]},
            why: "The three probabilities sum to 1 — confirming our answer. For every 5 draws, roughly 2 will be red.",
          },
        ],
      },
      {
        title: "Die Roll — P(prime number)",
        problem: "A fair six-sided die is rolled once. Find the probability of getting a prime number.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "List the sample space",
            visual: { type: "equation", lines: [
              [{ text: "S  =  {1, 2, 3, 4, 5, 6}" }],
              [{ text: "Total outcomes  =  " }, { text: "6", bold: true, color: "accent" }],
            ]},
            why: "A die has 6 equally likely outcomes. We define Event E = 'rolling a prime number'.",
          },
          {
            method: "IDENTIFY PRIME NUMBERS",
            instruction: "Which outcomes are prime?",
            visual: { type: "equation", lines: [
              [{ text: "2 → prime  " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "3 → prime  " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "5 → prime  " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "1, 4, 6  →  NOT prime" }],
            ]},
            why: "A prime has exactly 2 factors: 1 and itself. 1 has only 1 factor. 4 = 2×2 and 6 = 2×3. So E = {2, 3, 5}.",
          },
          {
            method: "COUNT FAVOURABLE OUTCOMES",
            instruction: "How many primes?",
            visual: { type: "equation", lines: [[{ text: "Favourable outcomes (primes 2, 3, 5)  =  " }, { text: "3", bold: true, color: "accent" }]] },
            why: "Exactly 3 of the 6 faces show prime numbers.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(prime) = 3/6",
            visual: { type: "equation", lines: [[{ text: "P(prime)  =  3/6  =  " }, { text: "1/2", bold: true, color: "success" }]] },
            why: "P(prime) = 3 ÷ 6 = 1/2. Exactly half the die faces are prime — the same probability as a coin flip.",
          },
          {
            method: "ANSWER",
            instruction: "State the final probability",
            visual: { type: "equation", lines: [[{ text: "P(prime number)  =  " }, { text: "1/2", bold: true, color: "success" }]] },
            why: "For every 2 rolls of the die, on average 1 will show a prime. Rolling a prime is as likely as getting heads on a coin toss.",
          },
        ],
      },
      {
        title: "Word Letters — P(consonant from MATHEMATICS)",
        problem: "One letter is chosen at random from the word MATHEMATICS. Find the probability that it is a consonant.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "List all letters in MATHEMATICS",
            visual: { type: "equation", lines: [
              [{ text: "M - A - T - H - E - M - A - T - I - C - S" }],
              [{ text: "Total letters  =  " }, { text: "11", bold: true, color: "accent" }],
            ]},
            why: "MATHEMATICS has 11 letters. Each position is a separate outcome, even if the same letter repeats.",
          },
          {
            method: "IDENTIFY VOWELS AND CONSONANTS",
            instruction: "Mark each letter",
            visual: { type: "equation", lines: [
              [{ text: "Vowels: A, E, A, I  →  " }, { text: "4 vowels", bold: true, color: "accent" }],
              [{ text: "Consonants: M, T, H, M, T, C, S  →  " }, { text: "7 consonants", bold: true, color: "highlight" }],
            ]},
            why: "Vowels are A, E, I, O, U. A appears twice (positions 2 and 7), E once, I once. All others are consonants.",
          },
          {
            method: "COUNT FAVOURABLE OUTCOMES",
            instruction: "Favourable = consonants",
            visual: { type: "equation", lines: [[{ text: "Favourable outcomes (consonants)  =  " }, { text: "7", bold: true, color: "accent" }]] },
            why: "7 of the 11 letter positions are consonants. Each is an equally likely outcome.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(consonant) = 7/11",
            visual: { type: "equation", lines: [[{ text: "P(consonant)  =  " }, { text: "7/11", bold: true, color: "success" }]] },
            why: "P(consonant) = 7 ÷ 11. Since 7 and 11 share no common factor, this is already in simplest form.",
          },
          {
            method: "ANSWER",
            instruction: "State final answer and check",
            visual: { type: "equation", lines: [
              [{ text: "P(consonant)  =  " }, { text: "7/11", bold: true, color: "success" }],
              [{ text: "P(vowel)  =  4/11" }],
              [{ text: "Check: 7/11 + 4/11  =  " }, { text: "11/11 = 1  ✓", bold: true, color: "success" }],
            ]},
            why: "Consonants are more common in MATHEMATICS than vowels. The check confirms our answer: 7/11 + 4/11 = 1.",
          },
        ],
      },
    ],
  },

  "types-of-events": {
    keyFacts: {
      what: "Events can be: impossible (P=0), certain (P=1), equally likely (all outcomes have equal probability), elementary (single outcome), or compound (multiple outcomes).",
      formula: "P(impossible event) = 0. P(certain event) = 1. For equally likely outcomes, P(elementary event) = 1/n where n = total outcomes.",
      example: "Die roll: P(7) = 0 [impossible]. P(number ≤ 6) = 1 [certain]. P(any single face) = 1/6 [elementary, equally likely].",
      tip: "Read questions carefully — 'impossible' means P = 0 exactly, not just 'very unlikely'. Same for 'certain': P = 1 means the event covers the entire sample space.",
    },
    problems: [
      {
        title: "Classifying Events — Card Draw",
        problem: "A card is drawn from a standard deck of 52 cards. Classify: (a) drawing a red card, (b) drawing a 'rainbow' card, (c) drawing any card from the deck.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Understand the sample space",
            visual: { type: "equation", lines: [
              [{ text: "S  =  52 cards" }],
              [{ text: "26 red (Hearts + Diamonds)  |  26 black (Clubs + Spades)" }],
            ]},
            why: "The sample space has 52 equally likely outcomes — one per card in the deck.",
          },
          {
            method: "EVENT (a): RED CARD",
            instruction: "Is drawing a red card impossible, certain, or neither?",
            visual: { type: "equation", lines: [
              [{ text: "Red cards  =  26" }],
              [{ text: "P(red)  =  26/52  =  " }, { text: "1/2", bold: true, color: "accent" }],
            ]},
            why: "P = 1/2 — neither impossible nor certain. This is a compound event with 26 favourable outcomes.",
          },
          {
            method: "EVENT (b): RAINBOW CARD",
            instruction: "Is there a rainbow card in the deck?",
            visual: { type: "equation", lines: [
              [{ text: "Rainbow cards in standard deck  =  0" }],
              [{ text: "P(rainbow)  =  0/52  =  " }, { text: "0  → IMPOSSIBLE", bold: true, color: "highlight" }],
            ]},
            why: "A standard deck has no rainbow cards. P = 0 — this is an impossible event.",
          },
          {
            method: "EVENT (c): ANY CARD",
            instruction: "What is P(drawing any card from the deck)?",
            visual: { type: "equation", lines: [
              [{ text: "P(any card)  =  52/52  =  " }, { text: "1  → CERTAIN", bold: true, color: "success" }],
            ]},
            why: "Every possible draw gives you a card from the deck. P = 1 — this is a certain event.",
          },
          {
            method: "CLASSIFY ALL THREE",
            instruction: "Summarise the event types",
            visual: { type: "equation", lines: [
              [{ text: "(a) Red card:  P = 1/2 — compound event" }],
              [{ text: "(b) Rainbow:  P = 0 — " }, { text: "impossible", bold: true, color: "highlight" }],
              [{ text: "(c) Any card:  P = 1 — " }, { text: "certain", bold: true, color: "success" }],
            ]},
            why: "Three event types in one problem. P = 0 impossible, P = 1 certain, 0 < P < 1 everything else.",
          },
        ],
      },
      {
        title: "Equally Likely Events — Spinner",
        problem: "A spinner has 8 equal sectors numbered 1 to 8. Are all outcomes equally likely? Find P(multiple of 3).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Check equal likelihood",
            visual: { type: "equation", lines: [
              [{ text: "S  =  {1, 2, 3, 4, 5, 6, 7, 8}" }],
              [{ text: "Equal sectors  →  each outcome equally likely" }],
              [{ text: "P(any single number)  =  " }, { text: "1/8", bold: true, color: "accent" }],
            ]},
            why: "All 8 sectors are equal in size, so each number is equally likely to be landed on.",
          },
          {
            method: "IDENTIFY MULTIPLES OF 3",
            instruction: "Which numbers in S are multiples of 3?",
            visual: { type: "equation", lines: [
              [{ text: "Multiples of 3 in {1..8}:  " }, { text: "3, 6", bold: true, color: "accent" }],
              [{ text: "Favourable outcomes  =  2" }],
            ]},
            why: "3×1=3 and 3×2=6 are within range. 3×3=9 is outside. Exactly 2 favourable outcomes.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(multiple of 3)",
            visual: { type: "equation", lines: [[{ text: "P(multiple of 3)  =  2/8  =  " }, { text: "1/4", bold: true, color: "success" }]] },
            why: "2 favourable out of 8 total. Simplify: 2/8 = 1/4.",
          },
          {
            method: "VERIFY WITH COMPLEMENT",
            instruction: "Check using P(not multiple of 3)",
            visual: { type: "equation", lines: [
              [{ text: "P(not multiple of 3)  =  6/8  =  3/4" }],
              [{ text: "1/4 + 3/4  =  " }, { text: "1  ✓", bold: true, color: "success" }],
            ]},
            why: "The complement has 6 outcomes {1,2,4,5,7,8}. 6/8 = 3/4. Adding 1/4 + 3/4 = 1 confirms our answer.",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(multiple of 3)  =  " }, { text: "1/4", bold: true, color: "success" }]] },
            why: "On a fair 8-sector spinner, exactly 1 in 4 spins lands on a multiple of 3.",
          },
        ],
      },
      {
        title: "Elementary Events — Letter Selection",
        problem: "A letter is randomly selected from the English alphabet (26 letters). Find: (a) P('Z'), (b) P(vowel), (c) P(neither vowel nor consonant).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Define sample space",
            visual: { type: "equation", lines: [
              [{ text: "S  =  all 26 letters of English alphabet" }],
              [{ text: "Total outcomes  =  26, all equally likely" }],
            ]},
            why: "Each letter has P = 1/26 (elementary event). The full alphabet is our sample space.",
          },
          {
            method: "EVENT (a): LETTER 'Z'",
            instruction: "P(Z) — elementary event",
            visual: { type: "equation", lines: [
              [{ text: "Favourable outcomes  =  1  (only 'Z')" }],
              [{ text: "P(Z)  =  " }, { text: "1/26", bold: true, color: "accent" }],
            ]},
            why: "There is exactly one 'Z' in the alphabet. This is an elementary event — a single outcome.",
          },
          {
            method: "EVENT (b): VOWEL",
            instruction: "P(vowel) — compound event",
            visual: { type: "equation", lines: [
              [{ text: "Vowels: A, E, I, O, U  →  " }, { text: "5 vowels", bold: true, color: "accent" }],
              [{ text: "P(vowel)  =  " }, { text: "5/26", bold: true, color: "success" }],
            ]},
            why: "There are 5 vowels. This is a compound event (5 elementary events grouped). P = 5/26.",
          },
          {
            method: "EVENT (c): NEITHER VOWEL NOR CONSONANT",
            instruction: "Is there such a letter?",
            visual: { type: "equation", lines: [
              [{ text: "Every English letter is either a vowel or a consonant" }],
              [{ text: "P(neither)  =  0/26  =  " }, { text: "0  → IMPOSSIBLE", bold: true, color: "highlight" }],
            ]},
            why: "In standard English, every letter is either a vowel or a consonant. P = 0 — impossible event!",
          },
          {
            method: "SUMMARISE ALL THREE",
            instruction: "Final answers",
            visual: { type: "equation", lines: [
              [{ text: "(a) P(Z)  =  1/26 — elementary event" }],
              [{ text: "(b) P(vowel)  =  5/26 — compound event" }],
              [{ text: "(c) P(neither)  =  0 — impossible event" }],
              [{ text: "Check: 5/26 + 21/26  =  " }, { text: "26/26 = 1  ✓", bold: true, color: "success" }],
            ]},
            why: "One problem demonstrated three event types. P(vowel) + P(consonant) = 5/26 + 21/26 = 1.",
          },
        ],
      },
    ],
  },

  "probability-formula": {
    keyFacts: {
      what: "P(E) = Number of favourable outcomes / Total number of equally likely outcomes. The result is always between 0 and 1 inclusive.",
      formula: "P(E) = n(E) / n(S) where n(E) = count of outcomes in event E, n(S) = count of outcomes in sample space S.",
      example: "Drawing a face card from 52: face cards = 12 (4 Jacks + 4 Queens + 4 Kings). P(face card) = 12/52 = 3/13.",
      tip: "The formula only works for equally likely outcomes. Always check this condition before applying P(E) = n(E)/n(S). If outcomes aren't equally likely, you need actual frequency data instead.",
    },
    problems: [
      {
        title: "Card Draw — Face Card",
        problem: "A card is drawn at random from a well-shuffled deck of 52 playing cards. Find the probability of drawing a face card (Jack, Queen, or King).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify what 'face card' means",
            visual: { type: "equation", lines: [
              [{ text: "Face cards  =  Jack, Queen, King" }],
              [{ text: "Each comes in 4 suits  →  3 × 4  =  " }, { text: "12 face cards", bold: true, color: "accent" }],
            ]},
            why: "Jack, Queen, and King are the three face cards. With 4 suits each, there are 12 face cards in a deck of 52.",
          },
          {
            method: "SAMPLE SPACE",
            instruction: "State total outcomes",
            visual: { type: "equation", lines: [[{ text: "n(S)  =  " }, { text: "52", bold: true, color: "accent" }, { text: "  (all cards equally likely)" }]] },
            why: "A well-shuffled deck means every card is equally likely to be drawn.",
          },
          {
            method: "COUNT FAVOURABLE OUTCOMES",
            instruction: "n(E) = face cards",
            visual: { type: "equation", lines: [[{ text: "n(E)  =  " }, { text: "12", bold: true, color: "accent" }, { text: "  (Jacks + Queens + Kings across 4 suits)" }]] },
            why: "12 face cards are our favourable outcomes — drawing any one of these 12 satisfies Event E.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(face card) = 12/52",
            visual: { type: "equation", lines: [[{ text: "P(face card)  =  12/52  =  " }, { text: "3/13", bold: true, color: "success" }]] },
            why: "12/52 simplifies: HCF(12,52) = 4. So 12/52 = 3/13. In every 13 draws (on average), 3 will be face cards.",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(face card)  =  " }, { text: "3/13  ≈  0.231", bold: true, color: "success" }]] },
            why: "About 23% chance per draw — roughly 1 in 4.3 cards drawn will be a face card.",
          },
        ],
      },
      {
        title: "Bag of Balls — P(not yellow)",
        problem: "A bag has 5 red balls, 4 yellow balls, and 3 green balls. Find the probability of NOT drawing a yellow ball.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify total and yellow balls",
            visual: { type: "bars", bars: [{ value: 5, label: "Red", color: "purple" }, { value: 4, label: "Yellow", color: "orange" }, { value: 3, label: "Green", color: "green" }] },
            why: "5 red + 4 yellow + 3 green = 12 balls total. We want P(NOT yellow) — the complement of P(yellow).",
          },
          {
            method: "FIND P(YELLOW) FIRST",
            instruction: "P(yellow) = 4/12 = 1/3",
            visual: { type: "equation", lines: [[{ text: "P(yellow)  =  4/12  =  " }, { text: "1/3", bold: true, color: "accent" }]] },
            why: "4 yellow balls out of 12 total. Simplify: HCF(4,12) = 4, so P(yellow) = 1/3.",
          },
          {
            method: "APPLY COMPLEMENT RULE",
            instruction: "P(not yellow) = 1 - P(yellow)",
            visual: { type: "equation", lines: [[{ text: "P(not yellow)  =  1 - 1/3  =  " }, { text: "2/3", bold: true, color: "success" }]] },
            why: "Using P(E') = 1 - P(E). This is faster than counting: 5 red + 3 green = 8 non-yellow out of 12 = 8/12 = 2/3.",
          },
          {
            method: "VERIFY BY COUNTING",
            instruction: "Count non-yellow balls directly",
            visual: { type: "equation", lines: [
              [{ text: "Non-yellow  =  5 (red) + 3 (green)  =  8" }],
              [{ text: "P(not yellow)  =  8/12  =  " }, { text: "2/3  ✓", bold: true, color: "success" }],
            ]},
            why: "Both the complement method and direct counting give 2/3. This cross-check confirms the answer.",
          },
          {
            method: "ANSWER",
            instruction: "Final probability",
            visual: { type: "equation", lines: [[{ text: "P(not yellow)  =  " }, { text: "2/3", bold: true, color: "success" }]] },
            why: "2 out of every 3 draws will not be yellow. The complement rule saves time — especially useful when there are many ball types.",
          },
        ],
      },
      {
        title: "Coins — P(at least one head in 2 flips)",
        problem: "Two fair coins are flipped simultaneously. Find the probability of getting at least one Head.",
        steps: [
          {
            method: "LIST THE SAMPLE SPACE",
            instruction: "All outcomes when 2 coins are flipped",
            visual: { type: "equation", lines: [
              [{ text: "S  =  {HH, HT, TH, TT}" }],
              [{ text: "Total equally likely outcomes  =  " }, { text: "4", bold: true, color: "accent" }],
            ]},
            why: "Each flip is H or T. Two coins give 2×2 = 4 outcomes. We list all so we don't miss any.",
          },
          {
            method: "IDENTIFY FAVOURABLE OUTCOMES",
            instruction: "Which outcomes have at least one H?",
            visual: { type: "equation", lines: [
              [{ text: "HH → 2 Heads  " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "HT → 1 Head   " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "TH → 1 Head   " }, { text: "✓", bold: true, color: "success" }],
              [{ text: "TT → 0 Heads  ✗" }],
              [{ text: "Favourable  =  3" }],
            ]},
            why: "'At least one Head' means one OR two Heads. Three outcomes qualify: HH, HT, TH.",
          },
          {
            method: "APPLY THE FORMULA",
            instruction: "P(at least one H) = 3/4",
            visual: { type: "equation", lines: [[{ text: "P(at least one H)  =  " }, { text: "3/4", bold: true, color: "success" }]] },
            why: "3 favourable outcomes out of 4 total. Already simplified.",
          },
          {
            method: "VERIFY WITH COMPLEMENT",
            instruction: "P(at least one H) = 1 - P(no heads)",
            visual: { type: "equation", lines: [
              [{ text: "P(no heads)  =  P(TT)  =  1/4" }],
              [{ text: "P(at least one H)  =  1 - 1/4  =  " }, { text: "3/4  ✓", bold: true, color: "success" }],
            ]},
            why: "The complement of 'at least one H' is 'no Heads at all' = TT. P(TT) = 1/4. So P(at least one H) = 3/4. Matches!",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(at least one Head)  =  " }, { text: "3/4", bold: true, color: "success" }]] },
            why: "In 3 out of every 4 double-flips, at least one Head appears. 'At least one' problems are almost always easiest via complement.",
          },
        ],
      },
    ],
  },

  "compound-events": {
    keyFacts: {
      what: "Complementary events: P(E) + P(E') = 1. Mutually exclusive events cannot occur simultaneously. Addition rule for mutually exclusive events: P(A or B) = P(A) + P(B).",
      formula: "P(E') = 1 - P(E). For mutually exclusive A and B: P(A ∪ B) = P(A) + P(B). For non-mutually exclusive: P(A ∪ B) = P(A) + P(B) - P(A ∩ B).",
      example: "Die: P(even) = 3/6 = 1/2. P(odd) = 1 - 1/2 = 1/2. P(even OR odd) = 1/2 + 1/2 = 1 [complementary + mutually exclusive].",
      tip: "For 'at least one' problems, always use the complement: 1 - P(none). For 'A or B' problems, first check if they're mutually exclusive before adding probabilities.",
    },
    problems: [
      {
        title: "Complement — P(not drawing a Spade)",
        problem: "A card is drawn from a deck of 52. Find the probability that it is NOT a Spade.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify P(Spade) first",
            visual: { type: "bars", bars: [{ value: 13, label: "Spades", color: "purple" }, { value: 39, label: "Others (H+D+C)", color: "cyan" }] },
            why: "There are 13 Spades in a deck of 52. P(Spade) = 13/52 = 1/4. We want the complement.",
          },
          {
            method: "APPLY COMPLEMENT RULE",
            instruction: "P(not Spade) = 1 - P(Spade)",
            visual: { type: "equation", lines: [[{ text: "P(not Spade)  =  1 - 1/4  =  " }, { text: "3/4", bold: true, color: "success" }]] },
            why: "Using P(E') = 1 - P(E). The complement of Spades is all non-Spade cards.",
          },
          {
            method: "VERIFY BY COUNTING",
            instruction: "Count non-Spade cards directly",
            visual: { type: "equation", lines: [
              [{ text: "Non-Spade  =  13 Hearts + 13 Diamonds + 13 Clubs  =  39" }],
              [{ text: "P(not Spade)  =  39/52  =  " }, { text: "3/4  ✓", bold: true, color: "success" }],
            ]},
            why: "Direct count gives 39/52 = 3/4. Matches the complement rule.",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(not Spade)  =  " }, { text: "3/4", bold: true, color: "success" }]] },
            why: "3 out of every 4 cards drawn will not be a Spade. Identifying this as a complement problem makes the calculation instant.",
          },
        ],
      },
      {
        title: "Mutually Exclusive — Die Roll Events",
        problem: "A die is rolled. Event A = getting a number less than 3. Event B = getting a number greater than 4. Find P(A or B).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Define events A and B",
            visual: { type: "equation", lines: [
              [{ text: "S  =  {1, 2, 3, 4, 5, 6}" }],
              [{ text: "Event A  =  {1, 2}  (less than 3)" }],
              [{ text: "Event B  =  {5, 6}  (greater than 4)" }],
            ]},
            why: "List both events from the sample space. A and B clearly don't share any outcomes.",
          },
          {
            method: "CHECK MUTUAL EXCLUSIVITY",
            instruction: "Can A and B both happen?",
            visual: { type: "equation", lines: [
              [{ text: "A ∩ B  =  {}  (empty — no overlap)" }],
              [{ text: "A and B are  " }, { text: "mutually exclusive  ✓", bold: true, color: "success" }],
            ]},
            why: "No outcome is both less than 3 AND greater than 4. Intersection is empty, confirming mutual exclusivity.",
          },
          {
            method: "COMPUTE P(A) AND P(B)",
            instruction: "Find individual probabilities",
            visual: { type: "equation", lines: [
              [{ text: "P(A)  =  2/6  =  " }, { text: "1/3", bold: true, color: "accent" }],
              [{ text: "P(B)  =  2/6  =  " }, { text: "1/3", bold: true, color: "accent" }],
            ]},
            why: "2 outcomes in A out of 6, and 2 in B out of 6. Each has probability 1/3.",
          },
          {
            method: "APPLY ADDITION RULE",
            instruction: "P(A or B) = P(A) + P(B)",
            visual: { type: "equation", lines: [[{ text: "P(A or B)  =  1/3 + 1/3  =  " }, { text: "2/3", bold: true, color: "success" }]] },
            why: "Since A and B are mutually exclusive, we simply add. No overlap to subtract.",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(less than 3 or greater than 4)  =  " }, { text: "2/3", bold: true, color: "success" }]] },
            why: "4 out of 6 outcomes satisfy the condition. The addition rule for mutually exclusive events gives 2/3 cleanly.",
          },
        ],
      },
      {
        title: "P(at least one tail) in 3 coin flips",
        problem: "Three fair coins are flipped. Find the probability of getting at least one Tail.",
        steps: [
          {
            method: "LIST THE SAMPLE SPACE",
            instruction: "All outcomes for 3 coins",
            visual: { type: "equation", lines: [
              [{ text: "S  =  {HHH, HHT, HTH, THH, HTT, THT, TTH, TTT}" }],
              [{ text: "n(S)  =  " }, { text: "8", bold: true, color: "accent" }],
            ]},
            why: "3 coins give 2³ = 8 outcomes.",
          },
          {
            method: "IDENTIFY THE COMPLEMENT",
            instruction: "What is the complement of 'at least one T'?",
            visual: { type: "equation", lines: [
              [{ text: "Complement  =  'no Tails at all'  =  {HHH}" }],
              [{ text: "P(no Tails)  =  " }, { text: "1/8", bold: true, color: "accent" }],
            ]},
            why: "'At least one Tail' fails ONLY when all three coins show Heads — just one outcome: HHH.",
          },
          {
            method: "APPLY COMPLEMENT RULE",
            instruction: "P(at least one T) = 1 - P(no T)",
            visual: { type: "equation", lines: [[{ text: "P(at least one T)  =  1 - 1/8  =  " }, { text: "7/8", bold: true, color: "success" }]] },
            why: "1 - 1/8 = 7/8. Far easier than listing all 7 favourable outcomes individually.",
          },
          {
            method: "VERIFY BY COUNTING",
            instruction: "Count directly to confirm",
            visual: { type: "equation", lines: [
              [{ text: "HHT, HTH, THH, HTT, THT, TTH, TTT  =  7 outcomes" }],
              [{ text: "P  =  7/8  " }, { text: "✓", bold: true, color: "success" }],
            ]},
            why: "7 of 8 outcomes have at least one Tail. Matches 7/8.",
          },
          {
            method: "ANSWER",
            instruction: "Final probability",
            visual: { type: "equation", lines: [[{ text: "P(at least one Tail)  =  " }, { text: "7/8", bold: true, color: "success" }]] },
            why: "7 out of 8 triple-flips will contain at least one Tail. The complement method is the fastest approach for all 'at least one' problems.",
          },
        ],
      },
    ],
  },

  "real-world-probability": {
    keyFacts: {
      what: "Experimental probability = frequency of event / total trials. Theoretical probability = n(E)/n(S). As trials increase, experimental probability approaches theoretical probability (Law of Large Numbers).",
      formula: "P(E) experimental = (Number of times E occurred) / (Total number of trials). This approaches P(E) theoretical as trials → infinity.",
      example: "A coin is flipped 200 times and Heads appears 94 times. P(H) experimental = 94/200 = 47/100 = 0.47. Theoretical = 0.5. Close because of large sample size.",
      tip: "Never judge a random process as biased from a small number of trials. You need a large sample size before experimental probability is meaningful. Small samples are noisy — large samples reveal the true pattern.",
    },
    problems: [
      {
        title: "Experimental Probability — Tossing a Coin",
        problem: "A coin was tossed 500 times. Heads appeared 230 times and Tails appeared 270 times. Find the experimental probability of getting Heads.",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify trial count and favourable frequency",
            visual: { type: "bars", bars: [{ value: 230, label: "Heads (230)", color: "purple" }, { value: 270, label: "Tails (270)", color: "cyan" }] },
            why: "Total trials = 500. Heads appeared 230 times. Experimental probability uses actual observed frequencies.",
          },
          {
            method: "APPLY EXPERIMENTAL P FORMULA",
            instruction: "P(H) exp = frequency / total",
            visual: { type: "equation", lines: [[{ text: "P(H) exp  =  230/500  =  " }, { text: "23/50", bold: true, color: "success" }]] },
            why: "Experimental P(E) = number of times E occurred ÷ total trials. 230 ÷ 500 = 23/50. HCF(230,500) = 10.",
          },
          {
            method: "COMPARE TO THEORETICAL",
            instruction: "Compare with P(H) = 1/2",
            visual: { type: "equation", lines: [
              [{ text: "Theoretical P(H)  =  1/2  =  0.5" }],
              [{ text: "Experimental P(H)  =  23/50  =  0.46" }],
              [{ text: "Difference  =  0.04  (small — expected for 500 trials)" }],
            ]},
            why: "The experimental result (0.46) is close to the theoretical value (0.5). Small gap is normal random variation.",
          },
          {
            method: "FIND P(TAILS) EXPERIMENTAL",
            instruction: "Use the complement",
            visual: { type: "equation", lines: [
              [{ text: "P(T) exp  =  270/500  =  27/50  =  0.54" }],
              [{ text: "Check: 23/50 + 27/50  =  " }, { text: "50/50 = 1  ✓", bold: true, color: "success" }],
            ]},
            why: "The two experimental probabilities must sum to 1 since every trial gives either Heads or Tails.",
          },
          {
            method: "ANSWER",
            instruction: "State experimental probability of Heads",
            visual: { type: "equation", lines: [[{ text: "P(Heads) experimental  =  " }, { text: "23/50  =  0.46", bold: true, color: "success" }]] },
            why: "Based on 500 trials, experimental probability is 0.46 — close to theoretical 0.5. No significant bias observed.",
          },
        ],
      },
      {
        title: "Survey Data — Student Preferences",
        problem: "In a survey of 200 students, 80 prefer cricket, 70 prefer football, and 50 prefer badminton. A student is picked at random. Find P(prefers football).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Identify total students and categories",
            visual: { type: "bars", bars: [{ value: 80, label: "Cricket (80)", color: "purple" }, { value: 70, label: "Football (70)", color: "orange" }, { value: 50, label: "Badminton (50)", color: "green" }] },
            why: "Total students = 80 + 70 + 50 = 200. This is a survey — we use experimental probability based on observed frequencies.",
          },
          {
            method: "IDENTIFY FAVOURABLE COUNT",
            instruction: "Football preference = 70 students",
            visual: { type: "equation", lines: [[{ text: "Favourable outcomes  =  " }, { text: "70", bold: true, color: "accent" }, { text: "  (football fans)" }]] },
            why: "70 students prefer football. In experimental probability, 'favourable' means 'the outcome occurred'.",
          },
          {
            method: "APPLY FORMULA",
            instruction: "P(football) = 70/200",
            visual: { type: "equation", lines: [[{ text: "P(football)  =  70/200  =  " }, { text: "7/20", bold: true, color: "success" }]] },
            why: "70 ÷ 200 = 7/20. HCF(70,200) = 10. This is the experimental probability based on the survey data.",
          },
          {
            method: "VERIFY ALL PROBABILITIES SUM TO 1",
            instruction: "Check P(cricket) + P(football) + P(badminton)",
            visual: { type: "equation", lines: [
              [{ text: "P(cricket)  =  80/200  =  2/5" }],
              [{ text: "P(football)  =  70/200  =  7/20" }],
              [{ text: "P(badminton)  =  50/200  =  1/4" }],
              [{ text: "8/20 + 7/20 + 5/20  =  " }, { text: "20/20 = 1  ✓", bold: true, color: "success" }],
            ]},
            why: "All three probabilities sum to 1, confirming our answer.",
          },
          {
            method: "ANSWER",
            instruction: "State final probability",
            visual: { type: "equation", lines: [[{ text: "P(prefers football)  =  " }, { text: "7/20  =  0.35", bold: true, color: "success" }]] },
            why: "Based on the survey, a randomly selected student has a 35% chance of preferring football.",
          },
        ],
      },
      {
        title: "Combined — Bag Draw Three Ways",
        problem: "A bag has 6 balls: 2 red, 3 blue, 1 green. Find: (a) P(red), (b) P(not blue), (c) P(red or green).",
        steps: [
          {
            method: "READ THE PROBLEM",
            instruction: "Set up sample space",
            visual: { type: "bars", bars: [{ value: 2, label: "Red (2)", color: "purple" }, { value: 3, label: "Blue (3)", color: "cyan" }, { value: 1, label: "Green (1)", color: "green" }] },
            why: "6 balls total. Each equally likely to be drawn. Three separate probability calculations needed.",
          },
          {
            method: "EVENT (a): P(RED)",
            instruction: "Apply formula",
            visual: { type: "equation", lines: [[{ text: "P(red)  =  2/6  =  " }, { text: "1/3", bold: true, color: "success" }]] },
            why: "2 red balls out of 6 total. Simplify: 2/6 = 1/3.",
          },
          {
            method: "EVENT (b): P(NOT BLUE)",
            instruction: "Use complement rule",
            visual: { type: "equation", lines: [
              [{ text: "P(blue)  =  3/6  =  1/2" }],
              [{ text: "P(not blue)  =  1 - 1/2  =  " }, { text: "1/2", bold: true, color: "success" }],
            ]},
            why: "3 blue balls → P(blue) = 1/2. Complement: P(not blue) = 1 - 1/2 = 1/2. Verify: 2 red + 1 green = 3 non-blue = 3/6 = 1/2. ✓",
          },
          {
            method: "EVENT (c): P(RED OR GREEN)",
            instruction: "Addition rule — are they mutually exclusive?",
            visual: { type: "equation", lines: [
              [{ text: "Red ∩ Green  =  {}  → mutually exclusive" }],
              [{ text: "P(red or green)  =  2/6 + 1/6  =  " }, { text: "3/6 = 1/2", bold: true, color: "success" }],
            ]},
            why: "A ball can't be both red and green — mutually exclusive. Simply add: 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2.",
          },
          {
            method: "ANSWER ALL THREE",
            instruction: "State final probabilities",
            visual: { type: "equation", lines: [
              [{ text: "(a) P(red)  =  " }, { text: "1/3", bold: true, color: "success" }],
              [{ text: "(b) P(not blue)  =  " }, { text: "1/2", bold: true, color: "success" }],
              [{ text: "(c) P(red or green)  =  " }, { text: "1/2", bold: true, color: "success" }],
            ]},
            why: "One problem, three techniques: direct formula, complement rule, addition rule — the three core tools for all Class 10 probability problems.",
          },
        ],
      },
    ],
  },

  // ─── RATIO SECTIONS ──────────────────────────────────────────────────────────

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
