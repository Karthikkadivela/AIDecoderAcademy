import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

async function getProfileId(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles").select("id").eq("clerk_user_id", userId).single();
  return data?.id ?? null;
}

// GET /api/sessions — list last 10 sessions for sidebar
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ sessions: [] });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, mode, message_count, started_at, ended_at")
    .eq("profile_id", profileId)
    .gt("message_count", 0)
    .order("started_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// POST /api/sessions — start new session
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profileId = await getProfileId(userId);
  if (!profileId) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { mode } = await req.json();
  const supabase = createAdminClient();

  // Enforce 10 chat limit — delete oldest if over
  // Only count sessions with actual messages toward the 10 limit
  const { data: existing } = await supabase
    .from("sessions")
    .select("id, started_at")
    .eq("profile_id", profileId)
    .gt("message_count", 0)
    .order("started_at", { ascending: true });

  if (existing && existing.length >= 10) {
    const toDelete = existing.slice(0, existing.length - 9);
    await supabase.from("sessions").delete()
      .in("id", toDelete.map((s: { id: string }) => s.id));
  }

  // Also clean up any abandoned empty sessions older than 1 hour
  await supabase.from("sessions")
    .delete()
    .eq("profile_id", profileId)
    .eq("message_count", 0)
    .lt("started_at", new Date(Date.now() - 3600000).toISOString());

  const { data, error } = await supabase
    .from("sessions")
    .insert({ profile_id: profileId, mode })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}

// PATCH /api/sessions — update title or close session
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, title, ended_at } = await req.json();
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (title) updates.title = title;
  if (ended_at) updates.ended_at = new Date().toISOString();

  const { error } = await supabase
    .from("sessions").update(updates).eq("id", session_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}