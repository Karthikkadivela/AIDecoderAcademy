export interface SeededThinkCardOption {
  text: string;
  hook: string;
}

export interface SeededThinkCard {
  question: string;
  imageUrl: string;        // populated after one-time generation via /api/learn/seed-images
  imagePrompt: string;     // used by seed-images route
  options: SeededThinkCardOption[];
}

export const LEARN_PATH_SEEDS: Record<string, SeededThinkCard[]> = {

  // ─── SECTION 1: What is a Ratio? ──────────────────────────────────────────
  "what-is-a-ratio": [
    {
      question: "A cake recipe calls for 2 cups of flour and 1 cup of sugar. How would you describe this relationship?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-a-ratio-0.png",
      imagePrompt: "Cute claymation kitchen scene with two large flour bags and one sugar bag on a counter, cheerful warm colors, overhead view, no text, cartoon style",
      options: [
        {
          text: "There's twice as much flour as sugar",
          hook: "You're already thinking in ratios! 'Twice as much' is exactly what 2:1 means. Every time you scale the recipe — 4 cups flour, 2 cups sugar — that relationship stays locked. That's the superpower of a ratio.",
        },
        {
          text: "The flour-to-sugar ratio is 2:1",
          hook: "Spot on! The colon ':' is the mathematical way of saying 'for every'. 2:1 is compact and powerful — it travels with any batch size. Triple the recipe? Still 2:1. That's why chefs and chemists love ratios.",
        },
        {
          text: "You just need more flour than sugar",
          hook: "True — and that instinct is the seed of ratio thinking! Ratios make 'more' precise. Not just more, but exactly 2× more. That precision is what separates a good recipe from a great one.",
        },
      ],
    },
    {
      question: "A class has 24 students — 16 girls and 8 boys. What's the most useful way to express this?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-a-ratio-1.png",
      imagePrompt: "Cheerful cartoon classroom with student desk figures, some representing girls, some boys, pastel warm colors, bright and friendly illustration, no text",
      options: [
        {
          text: "Girls outnumber boys 2 to 1",
          hook: "Perfect ratio instinct! '2 to 1' is the ratio 2:1. Dividing both numbers by 8 simplifies 16:8 into this clean form. Now compare any two classes of different sizes — ratios make it fair.",
        },
        {
          text: "16 out of 24 students are girls",
          hook: "That's a fraction (16/24) — and fractions ARE ratios! 16/24 simplifies to 2/3. So 2 out of every 3 students are girls. You were one step away from a ratio all along.",
        },
        {
          text: "There are 8 more girls than boys",
          hook: "That's a difference, not a ratio — and both are useful! But if the class had 240 students with 160 girls, the difference would be 80, yet the ratio stays 2:1. Ratios survive when numbers scale up.",
        },
      ],
    },
    {
      question: "A cricket team won 9 matches and lost 3 this season. How do you think about their record?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-a-ratio-2.png",
      imagePrompt: "Fun cartoon cricket scoreboard with tally marks showing wins and losses, bright stadium background, cheerful colorful illustration, no text",
      options: [
        {
          text: "They win 3 out of every 4 games",
          hook: "Brilliant! 9 wins out of 12 total games = 9:12 = 3:4. You converted a win:loss ratio into a win:total ratio naturally. Both are ratios — you just chose the more meaningful comparison.",
        },
        {
          text: "Their win-to-loss ratio is 3:1",
          hook: "Exactly right! 9:3 simplifies to 3:1 — for every loss, there are 3 wins. This ratio is powerful because it holds regardless of whether they play 12 games or 48. Ratios are scale-independent.",
        },
        {
          text: "They're winning 75% of the time",
          hook: "75% = 75:100 = 3:4. You just converted a ratio to a percentage without realising it! Percentages are ratios with denominator 100. You've been doing ratio maths this whole time.",
        },
      ],
    },
    {
      question: "An artist mixes 3 parts blue paint with 1 part white to make sky blue. She wants to make double the amount. What happens?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-a-ratio-3.png",
      imagePrompt: "Artistic cartoon illustration of paint tubes and mixing palettes with blue and white swirls, colorful cheerful artist studio scene, no text",
      options: [
        {
          text: "She uses 6 blue and 2 white — same colour!",
          hook: "Exactly! 6:2 = 3:1. Doubling both parts keeps the ratio intact — and keeps the colour identical. This is the magic of equivalent ratios. The quantity changes, the relationship doesn't.",
        },
        {
          text: "The ratio stays 3:1, just bigger amounts",
          hook: "You nailed it. The ratio is the recipe, not the quantity. 3:1 tells you the colour; the actual amounts tell you the batch size. Separating 'what' from 'how much' is what makes ratios so powerful.",
        },
        {
          text: "She needs to keep the same proportion",
          hook: "'Proportion' is exactly the word mathematicians use for this! When you scale up while keeping the ratio constant, the mixture is 'in proportion'. You just invented the next concept — and it has a name.",
        },
      ],
    },
  ],

  // ─── SECTION 2: Equivalent Ratios ────────────────────────────────────────
  "equivalent-ratios": [
    {
      question: "Your friend claims 2:3 is the same ratio as 4:6. Does that feel right to you? Why?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/equivalent-ratios-0.png",
      imagePrompt: "Two colourful cartoon pizzas side by side, one small divided into 5 equal slices with 2 slices one color and 3 another, the larger one mirroring the same pattern at double size, cheerful illustration, no text",
      options: [
        {
          text: "Yes — you just doubled both parts",
          hook: "Exactly! Multiply both terms of a ratio by the same number and you get an equivalent ratio. 2×2 : 3×2 = 4:6. The fraction 2/3 = 4/6 confirms it. This is why simplifying fractions and simplifying ratios are the same skill.",
        },
        {
          text: "It feels right but I'm not sure why",
          hook: "Your intuition is correct! The 'why' is: dividing 4:6 by 2 gives 2:3. Same relationship, different scale. Think of a photograph — 4×6 cm and 8×12 cm prints have the same proportions, just different sizes.",
        },
        {
          text: "No — bigger numbers must mean a different ratio",
          hook: "Common mistake — but ratios care about relationship, not size! 2:3 and 4:6 and 20:30 all say 'for every 2 of one thing, there are 3 of another'. The scale changes; the relationship doesn't.",
        },
      ],
    },
    {
      question: "Two maps of the same city have scales 1:50,000 and 2:100,000. Are they showing the same zoom level?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/equivalent-ratios-1.png",
      imagePrompt: "Two cute cartoon city maps side by side, one smaller and one larger, showing the same neighbourhood with buildings, roads and a park, illustrated in a friendly travel-guide style, no text",
      options: [
        {
          text: "Yes — both simplify to 1:50,000",
          hook: "Correct! 2:100,000 ÷ 2 = 1:50,000. They're equivalent ratios — the same zoom just written differently. This is crucial in geography: always simplify a map scale to check if two maps are comparable.",
        },
        {
          text: "No — the second map has bigger numbers so it's zoomed out more",
          hook: "Tricky! The numbers are bigger but the relationship is identical. 2 cm on the map still represents 100,000 cm = 1 km in reality. Always simplify ratios before comparing — raw numbers mislead you.",
        },
        {
          text: "They might be — ratios can be equivalent",
          hook: "Cautious but smart! You're right to check. 2:100,000 simplifies to 1:50,000 — confirmed equivalent. The habit of 'always simplify before comparing' is what professional cartographers use.",
        },
      ],
    },
    {
      question: "You have 15 red beads and 25 blue beads. Can you express this more simply?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/equivalent-ratios-2.png",
      imagePrompt: "Colourful cartoon of red and blue beads arranged on strings in a cheerful craft pattern, bright jewellery-making scene, warm background, no text",
      options: [
        {
          text: "Divide both by 5 to get 3:5",
          hook: "Perfect! The HCF of 15 and 25 is 5. Dividing gives 3:5 — the simplest form. Now you can instantly see that for every 3 red beads there are 5 blue ones, no matter how many beads you have.",
        },
        {
          text: "15:25 is already fine as it is",
          hook: "It works, but 3:5 is cleaner. Simplified ratios are easier to compare and reason with. If a friend has 9 red and 15 blue, you'd both struggle to spot they're the same until you simplify — both are 3:5!",
        },
        {
          text: "Just say red beads are fewer than blue",
          hook: "True, but how much fewer? 3:5 tells the complete story! 'Fewer' is a direction; a ratio is a destination. And once you know 3:5, you can reconstruct any equivalent batch: 6:10, 30:50, 300:500.",
        },
      ],
    },
    {
      question: "A smoothie needs 2 bananas for every 3 cups of milk. How many bananas for 9 cups of milk?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/equivalent-ratios-3.png",
      imagePrompt: "Cheerful cartoon kitchen with bananas and milk cartons near a blender, bright yellow and white colours, smoothie-making scene, no text",
      options: [
        {
          text: "6 bananas — because 9 cups is 3× the original",
          hook: "Exactly! 3 cups × 3 = 9 cups, so 2 bananas × 3 = 6 bananas. You found the equivalent ratio 2:3 = 6:9 by multiplying both parts by 3. This is the foundation of proportion calculations.",
        },
        {
          text: "I'd find the equivalent ratio: 2:3 = ?:9",
          hook: "Great systematic thinking! 3 × ? = 9, so ?= 3. Then 2 × 3 = 6. You used the definition of equivalent ratios directly. This 'find the multiplier' method is exactly how proportion problems are solved.",
        },
        {
          text: "Add 3 more bananas — same extra cups",
          hook: "Careful — that would give 5 bananas for 9 cups, breaking the 2:3 ratio. You'd end up with a different tasting smoothie! Ratios scale multiplicatively, not additively. That's the most common mistake in ratio problems.",
        },
      ],
    },
  ],

  // ─── SECTION 3: What is Proportion? ──────────────────────────────────────
  "what-is-proportion": [
    {
      question: "If 2:3 equals 4:6, we say these four numbers are 'in proportion'. What do you think this means?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-proportion-0.png",
      imagePrompt: "Cartoon balance scale perfectly level, each side holding colourful stacked blocks representing two different sized but proportional groups, cheerful illustration, no text",
      options: [
        {
          text: "Both ratios describe the exact same relationship",
          hook: "Yes! Four numbers a, b, c, d are in proportion when a:b = c:d. It means the relationship between the first pair is identical to the relationship between the second pair. Proportion is equality between ratios.",
        },
        {
          text: "They're like a balanced weighing scale",
          hook: "Beautiful analogy — and actually the origin of the word! 'Proportion' comes from Latin 'pro portione' meaning 'according to the share'. A balanced scale stays balanced when you multiply both sides equally — just like ratios.",
        },
        {
          text: "The numbers are connected by multiplication",
          hook: "Correct! If a:b = c:d, then c = a×k and d = b×k for the same multiplier k. The multiplication connection is what makes all equivalent ratios proportional — and why cross-multiplication works.",
        },
      ],
    },
    {
      question: "To check if 3:4 equals 9:12, you calculate 3×12 and 4×9. Both give 36. Why does this trick work?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-proportion-1.png",
      imagePrompt: "Fun maths diagram illustration showing two fraction bars with crossing arrows and multiplication symbols, colourful clean educational cartoon style, bright colours, no text",
      options: [
        {
          text: "If cross products are equal, the ratios are equal",
          hook: "That's the cross-multiplication theorem! If a/b = c/d, then a×d = b×c. It's provable: multiply both sides of a/b = c/d by b×d and simplify. It's a powerful shortcut that appears throughout maths.",
        },
        {
          text: "It's like checking two fractions are equivalent",
          hook: "Spot on! 3:4 is the fraction 3/4, and 9:12 is 9/12. To check 3/4 = 9/12, cross-multiply: 3×12 = 36, 4×9 = 36. Same number = same fraction = same ratio. Ratios and fractions are two faces of the same coin.",
        },
        {
          text: "It's just a formula — I use it without knowing why",
          hook: "Knowing the 'why' makes it unforgettable! 3:4 = 3/4. For two fractions a/b and c/d to be equal, a×d must equal b×c. This comes directly from multiplying both sides by bd. Now you own the trick, not just rent it.",
        },
      ],
    },
    {
      question: "A car travels 120 km in 2 hours at constant speed. How far in 5 hours? What's your first instinct?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-proportion-2.png",
      imagePrompt: "Cute cartoon car on a straight highway with distance markers and a bright blue sky, cheerful road trip illustration, green fields on both sides, no text",
      options: [
        {
          text: "60 km per hour × 5 hours = 300 km",
          hook: "The unitary method! You found the rate per 1 hour (60 km/h) and scaled up. This is the foundation of 'direct proportion' — when you find 1 unit and multiply. Fast, reliable, and works for every direct proportion problem.",
        },
        {
          text: "Set up 120:2 = ?:5 and solve by cross-multiplication",
          hook: "Perfect proportion setup! 120/2 = ?/5, so ? = (120×5)/2 = 300 km. Cross-multiplication gives the answer directly. This formal approach is essential when the 'per unit' step isn't obvious.",
        },
        {
          text: "2.5× the time, so 2.5× the distance = 300 km",
          hook: "Elegant scaling! 5 ÷ 2 = 2.5, so distance × 2.5 = 120×2.5 = 300 km. You intuitively used the proportionality constant. Distance is directly proportional to time — double the time, double the distance.",
        },
      ],
    },
    {
      question: "5 identical pens cost ₹35. Before calculating the cost of 8 pens, what's the smartest first step?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/what-is-proportion-3.png",
      imagePrompt: "Colourful cartoon stationery shop with rows of pens and price tags on a display shelf, cheerful retail illustration, bright and friendly style, no text",
      options: [
        {
          text: "Find the cost of 1 pen first — ₹35 ÷ 5 = ₹7",
          hook: "The unitary method! Once you know 1 pen costs ₹7, any quantity is easy: 8 pens = 8×₹7 = ₹56. This step — find the unit cost — is the single most useful tool in proportion problems.",
        },
        {
          text: "Set up 5:35 = 8:? and cross-multiply",
          hook: "Formal and correct! 5×? = 35×8, so ? = 280÷5 = ₹56. Cross-multiplication works every time and doesn't require you to find the unit cost. Both methods arrive at ₹56 — choose whichever feels faster.",
        },
        {
          text: "Multiply ₹35 by 8 then divide by 5",
          hook: "That's (35×8)÷5 = 280÷5 = ₹56 — correct! You've actually applied the cross-multiplication formula without naming it. Writing it as 5:35 = 8:? would make this pattern reusable for any proportion problem.",
        },
      ],
    },
  ],

  // ─── SECTION 4: Direct & Inverse Proportion ──────────────────────────────
  "direct-inverse-proportion": [
    {
      question: "You drive faster to reach a destination. Does the time needed go up or down?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/direct-inverse-proportion-0.png",
      imagePrompt: "Cartoon car speedometer with a fast-moving car on a road, speed arrows and a destination sign, bright dashboard illustration, cheerful cartoon style, no text",
      options: [
        {
          text: "Down — more speed means less time",
          hook: "Correct! Speed and time are inversely proportional. When one goes up, the other goes down — their product stays constant (distance = speed × time). Double the speed, halve the time. This is inverse proportion in motion.",
        },
        {
          text: "It depends on traffic and road conditions",
          hook: "Real-world thinking! In maths, we assume constant conditions — that's how we isolate the relationship. Under constant conditions, speed × time = distance (a constant), so they're inversely proportional. Real life adds noise; maths finds the pattern.",
        },
        {
          text: "This is inverse proportion — they pull in opposite directions",
          hook: "Nailed it! In inverse proportion, as one quantity increases, the other decreases such that their product remains fixed. Here: speed × time = distance (constant). This is the exact definition of inverse proportion.",
        },
      ],
    },
    {
      question: "4 painters can paint a house in 6 days. If you hire 8 painters working at the same speed, how long?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/direct-inverse-proportion-1.png",
      imagePrompt: "Cheerful cartoon illustration of house painters on scaffolding, some with rollers, some with brushes, a colourful house being painted, bright construction scene, no text",
      options: [
        {
          text: "3 days — double the painters, half the time",
          hook: "Exactly right! Painters × Days = 4×6 = 24 (total person-days needed). With 8 painters: 24÷8 = 3 days. Painters and days are inversely proportional — their product is constant (the total work).",
        },
        {
          text: "12 days — more people get in each other's way",
          hook: "Ha! In real life, maybe — but in maths problems we assume perfect efficiency. The inverse proportion relationship gives 3 days. Real-world 'coordination costs' are fascinating but beyond the scope of Class 8!",
        },
        {
          text: "They multiply to the same constant: 4×6 = 8×3 = 24",
          hook: "You just stated the law of inverse proportion! If xy = k (a constant), then x and y are inversely proportional. Here, painters × days = 24 for any valid combination. That constant 24 represents the total work.",
        },
      ],
    },
    {
      question: "You buy 3 notebooks for ₹45. Is the total cost directly proportional to the number of notebooks?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/direct-inverse-proportion-2.png",
      imagePrompt: "Colourful cartoon stationery shop display with stacks of notebooks in different colours and patterns, cheerful retail shelf illustration, bright and friendly, no text",
      options: [
        {
          text: "Yes — buy twice as many, pay twice as much",
          hook: "Correct! Cost = ₹15 × number of notebooks. The rate (₹15 each) stays constant, so cost and quantity increase together at the same rate — that's direct proportion. The ratio cost:notebooks = 15:1 always.",
        },
        {
          text: "Not necessarily — there might be bulk discounts",
          hook: "Sharp thinking! In the real world, bulk discounts break direct proportion. But in the maths problem, we assume a fixed price per notebook. Identifying when proportionality assumptions hold — and when they don't — is advanced mathematical literacy.",
        },
        {
          text: "Yes, because cost ÷ notebooks is always ₹15",
          hook: "That's the key test for direct proportion! If quantity_1 / quantity_2 is constant, they're directly proportional. Here ₹45÷3 = ₹90÷6 = ₹15. The constant ratio IS the price per notebook.",
        },
      ],
    },
    {
      question: "1 pipe fills a tank in 4 hours. Would 2 identical pipes (both open) fill it in 2 hours?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/direct-inverse-proportion-3.png",
      imagePrompt: "Cartoon diagram of a water tank with two inlet pipes, water flowing in, a gauge showing fill level, cheerful plumbing illustration in bright colours, no text",
      options: [
        {
          text: "Yes — twice the pipes, half the time",
          hook: "Correct! Pipes × Time = work done = 1 tank. With 2 pipes: 2×T = 1, so T = 0.5 hours? Wait — let's redo: 1 pipe fills in 4h, so in 1h it fills 1/4 tank. 2 pipes fill 2/4 = 1/2 tank per hour. Time = 1÷(1/2) = 2 hours. ✓",
        },
        {
          text: "Maybe — it depends on the pipe diameter",
          hook: "Real-world instinct! In maths, 'identical pipes' means same flow rate. Given that: 2 pipes = 2× the flow = half the time = 2 hours. In engineering, pipe diameter and pressure matter enormously — the maths simplification lets us see the proportional relationship.",
        },
        {
          text: "Yes! This is inverse proportion — pipes × time = constant",
          hook: "Perfect! Pipes × Time = 1 (full tank). As pipes increase, time decreases. 1×4 = 4, 2×2 = 4, 4×1 = 4 — the product is always 4. Inverse proportion is anywhere two quantities multiply to a constant.",
        },
      ],
    },
  ],

  // ─── SECTION 5: Ratio in Real Life ───────────────────────────────────────
  "ratio-real-world": [
    {
      question: "A map has scale 1:50,000. You measure 4 cm between two towns. What does your brain do first?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/ratio-real-world-0.png",
      imagePrompt: "Vintage-style colourful illustrated map with two small towns, winding roads, trees and a distance scale bar at the bottom, warm earthy illustration, no text",
      options: [
        {
          text: "Multiply 4 by 50,000 to get 200,000 cm",
          hook: "Correct calculation! 200,000 cm = 2,000 m = 2 km. The scale 1:50,000 means 1 cm on paper = 50,000 cm in reality. Once you convert to useful units (km), the distance is clear. Unit conversion is the real skill here.",
        },
        {
          text: "Think: 1 cm = 500 m, so 4 cm = 2 km",
          hook: "Brilliant shortcut! You converted the scale first: 50,000 cm = 500 m = 0.5 km per centimetre. Then 4 × 0.5 km = 2 km. Simplifying the scale before measuring is what experienced map-readers do.",
        },
        {
          text: "The towns are 2 km apart — using the unitary method",
          hook: "The unitary method strikes again! Scale = 50,000 cm per 1 cm. For 4 cm: 4 × 50,000 = 200,000 cm = 2 km. Map reading, recipe scaling, currency conversion — the unitary method is the universal proportion tool.",
        },
      ],
    },
    {
      question: "A cookie recipe for 12 cookies needs 300 g of butter. You want 20 cookies. What's your approach?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/ratio-real-world-1.png",
      imagePrompt: "Warm cozy cartoon kitchen with fresh cookies on a baking tray, butter block, measuring spoons and a mixing bowl, cheerful baking scene, golden and cream colours, no text",
      options: [
        {
          text: "Find butter per cookie (25 g), then multiply by 20",
          hook: "The unitary method! 300g ÷ 12 = 25g per cookie. Then 25 × 20 = 500g. Finding the 'per unit' value and scaling is the fastest mental maths approach for direct proportion. Chefs use this constantly.",
        },
        {
          text: "Set up 12:300 = 20:? and cross-multiply",
          hook: "Formal proportion! 12 × ? = 300 × 20 = 6000. So ? = 500g. Cross-multiplication works perfectly. Both methods give 500g — the formal approach is more systematic when the unit cost isn't obvious.",
        },
        {
          text: "20 is 5/3 of 12, so multiply 300 by 5/3",
          hook: "Elegant scaling! 20/12 = 5/3, so 300 × 5/3 = 500g. You found the scale factor directly. This is ratio thinking at its best: identify the multiplier, apply it. Works for any direct proportion problem.",
        },
      ],
    },
    {
      question: "Today ₹1 = 0.012 USD. How would you find dollars for ₹5,000?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/ratio-real-world-2.png",
      imagePrompt: "Colourful cartoon currency exchange booth with Indian rupee and dollar symbols on a board, friendly cashier character, bright travel-themed illustration, no text",
      options: [
        {
          text: "Multiply: 5,000 × 0.012 = $60",
          hook: "The fastest method! You recognised the direct proportion (more rupees = more dollars, at the same rate) and applied the unit rate. ₹1 → $0.012, so ₹5,000 → $60. Currency exchange is pure direct proportion.",
        },
        {
          text: "Set up 1:0.012 = 5,000:? and solve",
          hook: "Formal proportion! 1 × ? = 0.012 × 5,000 = 60. So ? = $60. This structure makes it clear WHY cross-multiplication works: if 1 rupee gives $0.012, then 5,000 rupees give 5,000× as many dollars.",
        },
        {
          text: "This is direct proportion — the exchange rate is constant",
          hook: "Exactly — the exchange rate IS the constant of proportionality. Dollars = 0.012 × Rupees. A straight-line graph through the origin. Every direct proportion has this structure: y = kx, where k is the ratio.",
        },
      ],
    },
    {
      question: "A bicycle gear with 48 teeth connects to one with 16 teeth. For every turn of the big gear, how many turns does the small one make?",
      imageUrl: "https://huovlleroikbuboulbmw.supabase.co/storage/v1/object/public/creations-media/learn-seeds/ratio-real-world-3.png",
      imagePrompt: "Technical but cheerful cartoon illustration of two interconnected bicycle gear wheels, one large and one small with a chain connecting them, bright mechanical diagram style, no text",
      options: [
        {
          text: "3 turns — the gear ratio 48:16 = 3:1",
          hook: "Perfect! 48÷16 = 3. The small gear spins 3 times for each turn of the big one. Gear ratios are inverse proportion: bigger driving gear → faster output. This is why low gear (small:big ratio) helps you climb hills.",
        },
        {
          text: "The small gear moves faster to keep up",
          hook: "Right instinct — and the reason is the gear ratio! 48:16 = 3:1 means the small gear spins 3× faster. This is inverse proportion: teeth (size) and speed are inversely proportional. Fewer teeth = faster spinning.",
        },
        {
          text: "Half a turn — it has fewer teeth so it's slower",
          hook: "Careful — fewer teeth means faster, not slower! The small gear must spin more to mesh with all 48 teeth of the big one. 48÷16 = 3 full turns. Inverse proportion: as gear size decreases, speed increases.",
        },
      ],
    },
  ],
};
