# AI Decoder Academy — Claude Context File

A creative AI learning platform for students aged 11–16 (Gen Z / Gen Alpha). Students work through a 6-week curriculum, earning XP to unlock themed "arenas". Each arena has its own visual skin, AI tutor persona, and tool emphasis. Everything created is saved to a personal library, and the AI remembers past creations across sessions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 — App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Auth | Clerk (email + Google OAuth) |
| Database | Supabase (PostgreSQL + Storage) |
| AI — Chat | OpenAI `gpt-4o-mini` (SSE streaming) |
| AI — Image | fal.ai `flux-pro/v1.1` (text→image) + `flux-pro/v1.1/redux` (image→image) |
| AI — Audio | OpenAI `gpt-4o-mini` (script) + AWS Polly neural TTS |
| AI — Slides | OpenAI `gpt-4o-mini` (structure) + fal.ai (scene images) + pptxgenjs |
| Vector DB | Pinecone (integrated embedding, cosine, per-child namespace) |
| Icons | Lucide React |
| Markdown | react-markdown |
| PPTX | pptxgenjs |

---

## Environment Variables (`.env.local`)

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/profile
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/profile

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENAI_API_KEY=
FAL_KEY=

# AWS Polly
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=ai-decoder-academy
```

---

## Project Structure

```
app/
  auth/
    sign-in/[[...sign-in]]/page.tsx
    sign-up/[[...sign-up]]/page.tsx
    sso-callback/page.tsx
  dashboard/
    layout.tsx                        — dark nav: logo + nav links + XP bar + level badge + streak
    playground/page.tsx               — main AI studio: arena skin, chat, output selector, gamification
    profile/page.tsx                  — dual mode: onboarding wizard (new) OR trophy room (returning)
    progress/page.tsx                 — My Creations library with dark cards, per-type hover glow
  api/
    chat/route.ts                     — OpenAI SSE streaming + Pinecone context + attachment meta encoding
    context/route.ts                  — GET top-K relevant creations from Pinecone
    creations/route.ts                — CRUD + Pinecone upsert/delete
    generate-image/route.ts           — fal.ai image gen (text→img or img→img via redux endpoint)
    generate-audio/route.ts           — OpenAI script + AWS Polly + modification mode
    generate-ppt/route.ts             — OpenAI structure + fal.ai images + pptxgenjs + modification mode
    sessions/route.ts                 — session CRUD (lazy creation, 10-chat sidebar limit)
    sessions/[id]/messages/route.ts   — load messages for session restore
    sessions/messages-save/route.ts   — save media messages (image/audio/slides)
    profile/route.ts                  — profile CRUD
    profile/photo/route.ts            — photo upload to Supabase Storage
    projects/route.ts                 — project folder CRUD
    xp/route.ts                       — award XP, detect level-up, check badges, update streak
    arena/route.ts                    — PATCH active_arena on profile

components/
  playground/
    useChat.ts                        — chat hook: sendMessage/sendImage/sendAudio/sendSlides, attachment meta encoding/decoding
    MessageBubble.tsx                 — renders text/image/audio/slides per outputType + save footer + attachment badge
    SaveCreationModal.tsx             — save dialog: title, project, tags, output type badge
    AudioPlayer.tsx                   — MP3 player with waveform visualiser + script toggle
    SlideCarousel.tsx                 — slide preview with nav dots + PPTX download
    CreationPicker.tsx                — popover to inject saved creations as context into prompt
    PlaygroundWorld.tsx               — per-arena animated game world behind chat transcript
    PlaygroundFlyers.tsx              — ambient animated elements (rockets, particles per arena)
  gamification/
    LevelUpModal.tsx                  — 2-step full-screen: "Level Up!" celebrate → arena unlock reveal
    ArenaSelector.tsx                 — grid of all 6 arenas (locked ones dimmed), switch modal
    XPFlash.tsx                       — "+N XP ⚡" micro-animation, fixed bottom-right
    XPBar.tsx                         — animated XP progress bar (compact or full)
    CelebrationOverlay.tsx            — confetti burst on level-up (52 coloured pieces)
    BadgeUnlockToast.tsx              — auto-dismissing toast when a badge is earned
    StreakMeter.tsx                   — sidebar streak count with milestone ticks
  dashboard/
    ArenaEnvironment.tsx              — full-viewport atmospheric layer: CSS terrain motion per arena preset + pointer parallax

lib/
  arenas.ts                           — MASTER arena config: 6 arenas, XP thresholds, badges, helpers
  useXP.ts                            — client hook: awardXP(), onLevelUp callback, onBadge callback
  prompts.ts                          — age-adaptive system prompts (4 tiers × 5 modes)
  supabase.ts                         — Supabase client helpers (browser + server + admin)
  utils.ts                            — cn(), formatDate(), truncate(), INTEREST_OPTIONS
  imageGenerator.ts                   — fal.ai flux with img2img support, intent detection (no style on logos)
  audioGenerator.ts                   — AWS Polly, character→voice map, SSML emotions, MP3 merge
  pptGenerator.ts                     — pptxgenjs slide builder (title + section + scene)
  pinecone.ts                         — upsertCreation(), deleteCreation(), queryContext()
  gameAudio.ts                        — optional Web Audio SFX: arena transitions + level-up fanfare

types/index.ts                        — all shared TypeScript types (Profile includes gamification fields)
supabase/migrations/001_phase1_schema.sql
supabase/gamification_migration.sql   — run this second in Supabase SQL editor
```

---

## Database Schema

```sql
-- Core tables
profiles         — id, clerk_user_id, display_name, avatar_emoji, avatar_url, age_group, interests,
                   xp, level, active_arena, streak_days, last_active_date, badges (jsonb)
sessions         — id, profile_id, mode, title, message_count, started_at, ended_at
chat_messages    — id, session_id, profile_id, role, content, output_type, created_at
creations        — id, profile_id, project_id, title, type, output_type, content,
                   prompt_used, file_url, tags, is_favourite, session_id
projects         — id, profile_id, name, creation_count

-- Gamification
xp_events        — id, profile_id, event_type, xp_earned, meta (jsonb), created_at
```

**Run order:** `001_phase1_schema.sql` first, then `gamification_migration.sql`.

**Supabase Storage bucket:** `creations-media` (public) — images, audio MP3s, profile avatars.

**Helper functions:**
```sql
increment_message_count(sid uuid)   -- increments sessions.message_count
level_from_xp(total_xp int)        -- returns 1-6 based on XP
```

---

## Gamification System

### XP Rewards
| Action | XP |
|---|---|
| Generate text | 5 |
| Generate image | 10 |
| Generate audio | 15 |
| Generate slides | 20 |
| Save creation | 8 |
| Daily streak bonus | 20 |

### Level → Arena Mapping
| Level | XP Threshold | Arena | Accent |
|---|---|---|---|
| 1 | 0 | AI Explorer Arena | `#7C3AED` purple |
| 2 | 100 | Prompt Lab | `#00D4FF` cyan |
| 3 | 300 | Story Forge | `#FF6B2B` orange |
| 4 | 600 | Visual Studio | `#00FF94` green |
| 5 | 1000 | Sound Booth | `#FF2D78` pink |
| 6 | 1500 | Director's Suite | `#C8FF00` volt |

### Badges (13 total)
`first_creation`, `image_maker`, `voice_actor`, `slide_master`, `streak_3`, `streak_7`, `librarian` (10 saves), `prolific` (25 saves), `all_tools`, `prompt_lab`, `story_forge`, `visual_studio`, `sound_booth`, `directors_suite`

### Arena Switcher
- Students can switch to any previously unlocked arena
- `active_arena` stored on `profiles` table (int, 1-6)
- Switching calls `PATCH /api/arena` → updates DB → `setActiveArenaId()` in playground state
- Arena skin applies: background gradient glow, accent color on buttons/pills/sidebar/nav

---

## Key Architecture

### Output Type Routing
```
User sends message
  ├── outputType === "image"  → sendImage()  → /api/generate-image → fal.ai
  ├── outputType === "audio"  → sendAudio()  → /api/generate-audio → OpenAI + Polly
  ├── outputType === "slides" → sendSlides() → /api/generate-ppt   → OpenAI + fal.ai + pptxgenjs
  └── default (text/json)    → sendMessage() → /api/chat          → OpenAI SSE stream
```

### Creation Context Injection (My Creations → Playground)
Students can click `+` in the input area to open `CreationPicker` and inject saved creations as context. When sent:
- `buildCreationContext()` formats them as `[Image titled "X": url]`, `[Audio titled "X": Narrator: ...]` etc.
- The enriched prompt goes to the API; only the student's original text shows in their message bubble
- Output type auto-switches to match the injected creation type

### Auto-Inject Previous Output
When a student sends a message with `outputType === "image"/"audio"/"slides"` and no manual creation injected, `buildPreviousOutputContext()` automatically finds the last assistant message of that type and injects it — enabling "make it darker" / "add more detail" without manual selection.

### Modification Mode
All three generation routes detect existing content in the context string and switch to modification mode:
- **Image:** detects `[Image titled "...": https://...]` → extracts URL → passes as `image_url` to `fal-ai/flux-pro/v1.1/redux` with `strength: 0.8`
- **Audio:** detects `[Audio titled "...": Narrator: ...]` → sends existing script to GPT with modification instructions
- **Slides:** detects `[Slides titled "...": section summaries]` → sends summary + modification request to GPT

### Attachment Meta (Badge on Reload)
When a user sends a message with file attachments, the attachment types are encoded as a marker appended to the saved content: `"user text\n__attach:image,audio__"`. On session reload, `decodeFromDB()` strips the marker and sets `attachmentMeta` on the Message, which `MessageBubble` renders as small badges inside the user's bubble.

### Single vs Multi-Character Audio
- Multi-character triggered by keywords: dialogue, conversation, scene, character names (maya, leo, etc.)
- Single-character forced by: "only one", "solo", "one voice", "just narrator" etc.
- `requestsSingleCharacter()` overrides `needsMultipleCharacters()` when both match
- Characters: Maya (Ivy voice), Leo (Kevin), Mr Chen (Matthew), Joey (Kevin)
- Emotions: happy, sad, curious, excited, frustrated, neutral, confident, realization, awestruck, proud

### Image Style Intent Detection
`shouldApplyStyle(prompt)` checks against `NO_STYLE_KEYWORDS` list (logo, flag, diagram, chart, map, etc.). If matched, Ghibli/Pixar style suffix is NOT appended — ensures logos and diagrams render accurately.

### Sessions
- Created lazily — DB row only created on first real message
- `message_count = 0` sessions filtered from sidebar
- Sessions stored per `profile_id`, max 10 shown in sidebar (grouped Today/Yesterday/Earlier)
- `__init__` message shows static welcome text, zero API calls

### Pinecone
- Index: `ai-decoder-academy`, integrated embedding, cosine similarity
- Namespace = `profile_id` (per-child isolation)
- Context injected into every chat as `PAST CREATIONS` block in system prompt
- Use `as any` on `.upsertRecords()` / `.searchRecordsByText()` — SDK types lag behind integrated embedding API

---

## Design System

### Color Tokens
```
--background:   #08080F   near-black base
--surface-1:    #0F0F1A   nav, sidebar
--surface-2:    #161625   cards, dropdowns
--surface-3:    #1E1E30   inputs
--volt:         #C8FF00   primary CTA (Level 6 arena accent also)
--plasma:       #7C3AED   secondary / Level 1 arena accent
--text-primary: #FFFFFF
--text-muted:   rgba(255,255,255,0.3)
--border:       rgba(255,255,255,0.08)
```

### Typography
- Display/headings: `Syne` weight 800–900, tight tracking
- Body: `DM Sans` weight 400–600
- Mono/badges: `JetBrains Mono`

### Per-Type Colors (My Creations cards)
- Image → `#00D4FF` cyan glow on hover
- Audio → `#FF2D78` pink glow on hover
- Slides → `#7C3AED` purple glow on hover
- Text/JSON → neutral purple glow

### Layout
- All dashboard pages: `height: calc(100vh - 57px)` (nav is 57px)
- Sidebar: `w-56 bg-[#0F0F1A]`
- Cards: `bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl`
- Button transitions: `cubic-bezier(0.16,1,0.3,1)` ease

---

## Arena Environment Presets
Each arena has an `environmentPreset` used by `ArenaEnvironment.tsx`:
- `nebula` — AI Explorer: deep space drift
- `circuit` — Prompt Lab: scrolling grid
- `ember` — Story Forge: warm rising haze
- `canvas` — Visual Studio: paint-field drift
- `soundwave` — Sound Booth: lateral wave scan
- `cinema` — Director's Suite: film vignette pulse

`ArenaEnvironment` supports pointer parallax and respects `prefers-reduced-motion`.

`PlaygroundWorld` renders a per-arena animated scene behind the chat transcript (distinct from the full-dashboard environment).

`gameAudio.ts` provides optional Web Audio SFX for arena transitions and level-up. Toggled via `localStorage` key `ada-arena-sfx`.

---

## Profile Page — Dual Mode
The profile page (`app/dashboard/profile/page.tsx`) has two modes:
1. **Onboarding** (`OnboardingFlow`) — shown when profile is incomplete. 2-step: photo upload, then board/grade/interests. Dark themed. Redirects to playground on save.
2. **Trophy Room** (`TrophyRoom`) — shown for returning students. Shows: hero card with XP bar, stats row, arenas panel (all 6, locked ones dimmed), XP journey bar chart, badges grid (13 badges, earned glow / unearned dimmed), interests tags. Arena-aware: background glow + accent colors adapt to active arena.

---

## My Creations — Card Hover Glow Per Type
Each creation card gets a type-specific colored drop shadow on hover via Tailwind class variants:
- Image → `hover:shadow-[0_16px_48px_-12px_rgba(0,212,255,0.28)]`
- Audio → `hover:shadow-[0_16px_48px_-12px_rgba(255,45,120,0.22)]`
- Slides → `hover:shadow-[0_16px_48px_-12px_rgba(124,58,237,0.28)]`
- Text → `hover:shadow-[0_12px_40px_-12px_rgba(124,58,237,0.15)]`

---

## Navigation Bar
`app/dashboard/layout.tsx` — fetches profile on mount, shows:
- Logo: "AI" + "Decoder" in arena accent color
- Nav links: active link uses arena accent background + glow
- Right side: level badge (emoji + "Lv N"), XP progress bar (24px wide), streak fire + count
- All arena-reactive — updates when `active_arena` changes

---

## Phases

| Phase | Status | Summary |
|---|---|---|
| Phase 1 | ✅ Complete | Auth, profiles, AI playground, all 5 output types, My Creations, projects, sessions, Pinecone |
| Phase 2 | ✅ Complete | Context injection, creation picker, auto-inject previous output, modification mode for all types, attachment meta badges |
| Phase 3 | ✅ Complete | XP engine, 6 arenas, badges, streaks, LevelUpModal, ArenaSelector, XPFlash, XPBar, CelebrationOverlay, BadgeUnlockToast, StreakMeter, arena skin (nav + playground + my creations), trophy room profile, ArenaEnvironment, PlaygroundWorld, gameAudio |
| Phase 4 | 🔲 Pending | Teacher/admin dashboard — view all students' levels, XP, creations, streak, last active |
| Phase 5 | 🔲 Pending | Weekly curriculum challenges per arena, guided prompts per week |
| Phase 6 | 🔲 Pending | Film assembly (Week 6 Director's Suite), parent dashboard, multi-child, time limits |

---

## Common Gotchas

- **fal.ai img2img:** use `fal-ai/flux-pro/v1.1/redux` NOT `flux-pro/v1.1` — the standard endpoint doesn't support `image_url`
- **Regex with `/s` flag:** Node doesn't support `dotAll` in some contexts — use `indexOf` to slice the target string before running regex
- **`welcomeMsg` is a function** — cannot be serialized to JSON. XP route returns only `unlocked_arena_id` (int); `LevelUpModal` looks up the full arena client-side from `lib/arenas.ts`
- **Pinecone SDK types:** use `as any` on `.upsertRecords()` / `.searchRecordsByText()` — SDK lags behind integrated embedding REST API
- **Supabase Storage:** must be set to **public** for image/audio URLs to work in `<img>` and `<audio>` tags
- **`next.config.mjs`** needs `remotePatterns` for `**.supabase.co`, `img.clerk.com`, `**.fal.media`, `fal.media`
- **Dashboard height:** all pages use `style={{ height: "calc(100vh - 57px)" }}` — nav is 57px tall
- **pptxgenjs:** `pptx.write("nodebuffer" as "nodebuffer")` or cast via `as any`
- **AWS Polly voices:** Gregory (narrator), Ivy (Maya), Kevin (Leo/Joey), Matthew (Mr Chen)
- **`overflow-hidden` on parent clips dropdowns** — remove from card wrappers when menus need to escape
- **`active_arena`** defaults to `1` if null — always use `profile.active_arena ?? 1` and `getArena(activeArenaId ?? 1)`
- **XP events are non-blocking** — `awardXP()` is called with `.then()` after generation, never `await`ed before response
- **Gamification migration** must be run AFTER Phase 1 schema — adds `xp`, `level`, `active_arena`, `streak_days`, `last_active_date`, `badges` columns + `xp_events` table