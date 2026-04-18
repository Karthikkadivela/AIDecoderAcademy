const STYLE_SUFFIX = `

GLOBAL STYLE LOCK:
- Art style: vibrant 2D animation — Pixar and Studio Ghibli inspired by default; adapt the style naturally if the prompt clearly calls for something different (e.g. sci-fi, gothic, abstract)
- Lighting: warm golden-hour light, soft shadows, bright and inviting atmosphere
- Color palette: warm saturated colors that match the mood of the scene
- Backgrounds: detailed illustrated backgrounds suited to the scene
- Avoid photorealism and low-quality 3D renders unless the prompt specifically asks for realism`;

const NEGATIVE_PROMPT = "photorealistic, 3D render, blurry, low quality, distorted faces, extra limbs, watermark, text overlay, wide-angle shot where characters appear tiny";

// ─── Intent detection — keywords that should NOT get animation style ──────────

const NO_STYLE_KEYWORDS = [
  // Logos & brands
  "logo", "brand", "icon", "emblem", "badge", "symbol",
  // Flags & maps
  "flag", "map", "geography", "country", "nation",
  // Diagrams & charts
  "diagram", "chart", "graph", "flowchart", "infographic", "timeline",
  "table", "schedule", "blueprint", "schematic", "wireframe",
  // Real objects & places
  "photograph", "photo", "realistic", "real", "actual",
  // UI / tech
  "screenshot", "interface", "ui", "ux", "app screen",
  // Specific real-world things kids might ask for
  "periodic table", "solar system", "anatomy", "skeleton", "cell diagram",
];

function shouldApplyStyle(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return !NO_STYLE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── Build the final prompt ───────────────────────────────────────────────────

function buildPrompt(prompt: string, forceStyle?: boolean): string {
  const apply = forceStyle !== undefined ? forceStyle : shouldApplyStyle(prompt);
  if (!apply) return prompt.trim();
  return prompt.trim() + STYLE_SUFFIX;
}

// ─── fal.ai configs ───────────────────────────────────────────────────────────

const FAL_CONFIGS: Record<string, { endpoint: string; fallback?: string; payload: Record<string, unknown> }> = {
  "fal-flux2pro": {
    endpoint: "fal-ai/flux-pro/v1.1",
    payload: {
      image_size: "landscape_16_9",
      output_format: "png",
      num_inference_steps: 28,
    },
  },
  "fal-img2img": {
    endpoint: "fal-ai/flux-pro/v1.1/redux",
    payload: {
      image_size: "landscape_16_9",
      output_format: "png",
      num_inference_steps: 28,
    },
  },
  "fal-juggernaut": {
    endpoint: "rundiffusion-fal/juggernaut-flux/pro",
    fallback: "fal-ai/flux-pro/v1.1",
    payload: {
      image_size: "landscape_16_9",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format: "png",
      negative_prompt: NEGATIVE_PROMPT,
    },
  },
};

export type ImageModel = "fal-flux2pro" | "fal-juggernaut" | "gpt-image-1";

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function generateFal(prompt: string, model: ImageModel, imageUrl?: string): Promise<Buffer> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY not set");

  const cfg     = FAL_CONFIGS[model] ?? FAL_CONFIGS["fal-flux2pro"];
  const headers = { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" };
  const clean   = prompt.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();

  let resp: Response | null = null;
  // Use dedicated img2img endpoint when a source image is provided
  const img2imgCfg = FAL_CONFIGS["fal-img2img"];
  let endpoint = imageUrl ? img2imgCfg.endpoint : cfg.endpoint;
  const activePayload = imageUrl ? img2imgCfg.payload : cfg.payload;

  for (let i = 0; i < 3; i++) {
    try {
      const body: Record<string, unknown> = { prompt: clean, ...activePayload };
      if (imageUrl) {
        // flux-pro/v1.1/redux uses image_url for the reference image
        body.image_url = imageUrl;
        body.strength  = 0.8; // how much to follow the prompt vs preserve original
      }
      resp = await fetch(`https://queue.fal.run/${endpoint}`, {
        method: "POST", headers,
        body: JSON.stringify(body),
      });
      if (resp.status < 500) break;
      await sleep(2 ** i * 1000);
    } catch { await sleep(2 ** i * 1000); }
  }

  if ((!resp || resp.status >= 500) && cfg.fallback) {
    endpoint = cfg.fallback;
    const fallbackBody: Record<string, unknown> = { prompt: clean, ...FAL_CONFIGS["fal-flux2pro"].payload };
    if (imageUrl) { fallbackBody.image_url = imageUrl; fallbackBody.strength = 0.75; }
    resp = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: "POST", headers,
      body: JSON.stringify(fallbackBody),
    });
  }

  if (!resp || !resp.ok) throw new Error(`fal.ai submit failed: ${resp?.status}`);

  const result = await resp.json();

  if (result.images?.[0]?.url) return downloadBuffer(result.images[0].url);

  const { status_url, response_url } = result;
  if (!status_url) throw new Error("No status_url from fal.ai");

  for (let i = 0; i < 120; i++) {
    await sleep(2000);
    const s = await (await fetch(status_url, { headers })).json();
    if (s.status === "COMPLETED") {
      const final = await (await fetch(response_url, { headers })).json();
      if (final.error) throw new Error(`fal.ai model error: ${final.error}`);
      const url = final.images?.[0]?.url;
      if (url) return downloadBuffer(url);
      throw new Error("No image URL in completed response");
    }
    if (s.status === "FAILED") throw new Error(`fal.ai job failed: ${s.error ?? "unknown"}`);
  }
  throw new Error("fal.ai timed out");
}

async function generateOpenAI(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1536x1024", quality: "low", n: 1 }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message ?? "OpenAI image failed");

  const img = data.data?.[0];
  if (img?.url)      return downloadBuffer(img.url);
  if (img?.b64_json) return Buffer.from(img.b64_json, "base64");
  throw new Error("No image data from OpenAI");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateImage(
  prompt: string,
  model: ImageModel = "fal-flux2pro",
  applyStyle = true,
  imageUrl?: string,         // if provided, do image-to-image refinement
): Promise<Buffer> {
  // Intent detection always wins over the caller's applyStyle flag
  // Exception: if caller explicitly passes false, always skip style
  const finalPrompt = applyStyle
    ? buildPrompt(prompt)     // smart detection
    : prompt.trim();          // caller said no style

  console.log(`[imageGenerator] style=${applyStyle && shouldApplyStyle(prompt)} model=${model}`);
  console.log(`[imageGenerator] prompt: ${finalPrompt.slice(0, 120)}...`);

  if (model === "gpt-image-1") return generateOpenAI(finalPrompt);
  return generateFal(finalPrompt, model, imageUrl);
}