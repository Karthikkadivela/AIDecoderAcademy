# AI Decoder Academy — Claude Context File

A safe, AI-powered learning platform for children aged 5–16. Children create stories, code, images, audio scenes, and slide decks through an AI playground. Everything they make is saved to a personal library and the AI remembers their past creations across sessions.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2.4 — App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Auth | Clerk (email + Google OAuth) |
| Database | Supabase (PostgreSQL + Storage) |
| AI — Chat | Google Gemini 2.5 Flash (`@google/genai`) |
| AI — Image | fal.ai Flux Dev (`fal-ai/flux/dev`) + Gemini Imagen 3 (fallback) |
| AI — Audio | AWS Polly neural TTS (`@aws-sdk/client-polly`) |
| AI — Slides | Gemini (scripting) + fal.ai (scene images) + pptxgenjs |
| Vector DB | Pinecone (integrated embedding — llama-text-embed-v2, 768 dims, cosine) |
| Icons | Lucide React |
| Markdown | react-markdown |
| PPTX | pptxgenjs |

---

## Environment variables (`.env.local`)

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/profile
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/profile

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://fzihxfyezjtkmztmvtdv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI services
GEMINI_API_KEY=...
FAL_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX=ai-decoder-academy
```

---

## Project structure

```
app/
  auth/
    layout.tsx
    sign-in/[[...sign-in]]/page.tsx     — custom Clerk sign-in (setActive fix)
    sign-up/[[...sign-up]]/page.tsx     — custom Clerk sign-up + board/grade step
    sso-callback/page.tsx               — Google OAuth callback
  dashboard/
    layout.tsx                          — top nav (Playground / My Creations / Profile)
    playground/page.tsx                 — main AI chat + output format selector
    profile/page.tsx                    — onboarding wizard (photo + board + grade)
    progress/page.tsx                   — My Creations library + projects sidebar
  api/
    chat/route.ts                       — Gemini SSE streaming + Pinecone context injection
    context/route.ts                    — GET top-K relevant past creations from Pinecone
    creations/route.ts                  — CRUD for creations + Pinecone upsert/delete
    sessions/route.ts                   — session CRUD (lazy creation, 10-chat limit)
    sessions/[id]/messages/route.ts     — load past chat messages for session restore
    sessions/messages/route.ts          — save messages (audio/slides paths)
    profile/route.ts                    — profile CRUD
    profile/photo/route.ts              — photo upload to Supabase Storage
    projects/route.ts                   — project folder CRUD
    generate-image/route.ts             — fal.ai image generation + Supabase upload
    generate-ppt/route.ts               — Gemini script + fal.ai images + pptxgenjs
    generate-audio/route.ts             — Gemini script + AWS Polly + Supabase upload

components/playground/
  useChat.ts                            — chat hook (lazy sessions, sendImage, sendStaticMessage)
  MessageBubble.tsx                     — renders text/JSON/image/audio/slides per outputType
  SaveCreationModal.tsx                 — save dialog with project + tags + output type badge
  AudioPlayer.tsx                       — MP3 player with waveform + transcript toggle
  SlideCarousel.tsx                     — slide preview with nav dots + PPTX download

lib/
  prompts.ts                            — age-adaptive system prompts (4 tiers × 5 modes)
  supabase.ts                           — Supabase client helpers (browser + server + admin)
  utils.ts                              — cn(), formatDate(), truncate(), AVATAR_OPTIONS, INTEREST_OPTIONS
  imageGenerator.ts                     — fal.ai + Gemini Imagen + Ghibli/Pixar style lock
  audioGenerator.ts                     — AWS Polly, character→voice map, SSML emotions
  pptGenerator.ts                       — pptxgenjs slide builder (title + section + scene slides)
  pinecone.ts                           — upsertCreation(), deleteCreation(), queryContext()

types/index.ts                          — all shared TypeScript types
middleware.ts                           — Clerk route protection
```

---

## Database schema (Supabase)

```sql
profiles         — id, clerk_user_id, display_name, avatar_emoji, avatar_url, age_group, interests
sessions         — id, profile_id, mode, title, message_count, started_at, ended_at
chat_messages    — id, session_id, profile_id, role, content, created_at
creations        — id, profile_id, project_id, title, type, output_type, content,
                   prompt_used, file_url, tags, is_favourite, session_id
projects         — id, profile_id, name, created_at
```

**Supabase Storage bucket:** `creations-media` (public) — stores images, audio MP3s, profile avatars.

**Helper function:**
```sql
create or replace function increment_message_count(sid uuid)
returns void language sql as $$
  update sessions set message_count = message_count + 1 where id = sid;
$$;
```

---

## Key architectural decisions

**Sessions are lazy** — a DB session row is created only when the child sends their first real message, not on page load. This prevents empty session accumulation. Sessions with `message_count = 0` are filtered out of the sidebar.

**`__init__` is static** — the welcome message when the playground loads is generated locally from a static string map (no Gemini API call). Only real user messages hit the API.

**Pinecone uses integrated embedding** — the index uses llama-text-embed-v2 (768 dims, cosine). We send raw text on upsert; Pinecone embeds it automatically. Namespace = `profile_id` so each child's vectors are isolated. Use `as any` type assertion on `.upsertRecords()` and `.searchRecordsByText()` due to SDK typing lag.

**Context injection** — on every chat message, `queryContext()` retrieves top-5 semantically relevant past creations and injects them into the Gemini system prompt as a `PAST CREATIONS` block. Fails silently — context is enhancement, not a dependency.

**Output types** — `text`, `json`, `image`, `audio`, `slides` are all live. `video` is greyed "soon". Each output type has its own rendering path in `MessageBubble.tsx`.

**Image style lock** — all image generation (fal.ai and Gemini Imagen) appends a Pixar/Studio Ghibli 2D animation style suffix to every prompt. This keeps all images age-appropriate and visually consistent.

**Audio is multi-character** — Gemini writes a scene script (narrator + character dialogues with emotions). AWS Polly synthesises each part separately using SSML, then all MP3 buffers are concatenated with raw byte merge.

**PPTX preview** — slides are not downloaded directly. The API returns JSON (structure + base64 images + base64 PPTX). The `SlideCarousel` renders a 16:9 preview inline. Download PPTX button decodes the base64 client-side.

**Profile completeness check** — `isProfileComplete(profile)` returns true if `display_name` and `age_group` are set. Google OAuth users are redirected to the profile wizard after sign-in so they always complete board + grade + interests.

---

## Age groups and modes

**Age groups:** `5-7` · `8-10` · `11-13` · `14+`

**Playground modes:** `free` · `story` · `code` · `art` · `quiz`

Each combination has a distinct system prompt in `lib/prompts.ts`. Child-safety rules are permanently appended to every prompt regardless of mode.

---

## Design system

- Brand color: `#6C47FF` (purple)
- Background: `#F5F6FF`
- Dark navy: `#1a1a2e`
- Purple light: `#EEF0FF`
- All pages use `calc(100vh - 57px)` for height since the top nav is 57px tall
- Framer Motion for card animations (initial opacity 0 → 1, y 16 → 0)
- No emoji — use SVG icons inside components

---

## Output format routing (playground)

```
User sends message
  ├── outputType === "image"  → handleImageGenerate() → /api/generate-image → fal.ai
  ├── outputType === "slides" → handleSlidesGenerate() → /api/generate-ppt → Gemini + fal.ai + pptxgenjs
  ├── outputType === "audio"  → handleAudioGenerate() → /api/generate-audio → Gemini + Polly
  └── default (text/json)    → sendMessage() → /api/chat → Gemini SSE stream
```

---

## Pinecone index config

- Index name: `ai-decoder-academy`
- Model: llama-text-embed-v2 (NVIDIA hosted)
- Dimensions: 768
- Metric: cosine
- Integrated embedding field: `text`
- Namespace: `profile_id` (per-child isolation)

---

## npm packages installed

```
@clerk/nextjs
@google/genai
@aws-sdk/client-polly
@pinecone-database/pinecone
@supabase/ssr
@supabase/supabase-js
framer-motion
lucide-react
pptxgenjs
react-markdown
zod
```

---

## Phases

| Phase | Status | Summary |
|---|---|---|
| Phase 1 | Complete | Auth · profiles · AI playground · all output types · My Creations · projects |
| Phase 2 | Complete | Pinecone vector store · context injection · session restore |
| Phase 3 | Pending | Streaks · achievements · gamification · enhanced profile |
| Phase 4 | Pending | Parent dashboard · multi-child · time limits · weekly summaries |

---

## Common gotchas

- `pptxgenjs` write API: use `pptx.write("nodebuffer" as "nodebuffer")` or cast via `as any`
- Pinecone `upsertRecords` / `searchRecordsByText`: use `as any` on the namespace — SDK types lag behind integrated embedding API
- Supabase Storage must be set to **public** for image/audio URLs to work in `<img>` and `<audio>` tags
- `next.config.mjs` needs `remotePatterns` for `**.supabase.co`, `img.clerk.com`, `**.fal.media`, `fal.media`, `storage.googleapis.com`
- Clerk `setActive({ session: result.createdSessionId })` must be called after `signIn.create()` or redirect never happens
- Dashboard layout is `h-screen flex flex-col` — each page uses `style={{ height: "calc(100vh - 57px)" }}`
- Gemini Imagen and fal.ai both require billing enabled — free tier is very limited
- AWS Polly neural voices: Gregory (narrator), Kevin (Leo/boy), Ivy (Maya/girl), Matthew (teacher)
- `overflow-hidden` anywhere in a parent clips absolute-positioned dropdowns — remove it from card wrappers