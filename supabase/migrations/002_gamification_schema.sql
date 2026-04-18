-- ══════════════════════════════════════════════════
--  AI Decoder Academy — Gamification Schema
--  Run this AFTER 001_phase1_schema.sql
-- ══════════════════════════════════════════════════

-- ─── Add gamification columns to profiles ─────────
alter table profiles
  add column if not exists avatar_url       text,
  add column if not exists xp               integer default 0,
  add column if not exists level            integer default 1,
  add column if not exists active_arena     integer default 1,
  add column if not exists streak_days      integer default 0,
  add column if not exists last_active_date date,
  add column if not exists badges           jsonb default '[]'::jsonb;

-- ─── Add missing columns to sessions ──────────────
alter table sessions
  add column if not exists title text;

-- ─── Add missing columns to chat_messages ─────────
alter table chat_messages
  add column if not exists output_type text default 'text';

-- ─── Add missing columns to creations ─────────────
alter table creations
  add column if not exists output_type  text default 'text',
  add column if not exists project_id   uuid,
  add column if not exists prompt_used  text;

-- ─── projects table ────────────────────────────────
create table if not exists projects (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid references profiles(id) on delete cascade not null,
  name            text not null,
  creation_count  integer default 0,
  created_at      timestamptz default now()
);

create index if not exists idx_projects_profile on projects(profile_id);

alter table projects enable row level security;
create policy "projects_own" on projects for all using (true);

-- ─── xp_events table ──────────────────────────────
create table if not exists xp_events (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references profiles(id) on delete cascade not null,
  event_type  text not null,
  xp_earned   integer not null,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_xp_events_profile on xp_events(profile_id);
create index if not exists idx_xp_events_created on xp_events(created_at desc);

alter table xp_events enable row level security;
create policy "xp_events_own" on xp_events for all using (true);
