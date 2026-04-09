import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const ProfileSchema = z.object({
  display_name: z.string().min(1).max(32),
  avatar_emoji: z.string(),
  avatar_url:   z.string().nullable().optional(),
  age_group:    z.enum(["5-7", "8-10", "11-13", "14+"]),
  interests:    z.array(z.string()).max(8),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (error && error.code !== "PGRST116")
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data ?? null });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ clerk_user_id: userId, ...parsed.data }, { onConflict: "clerk_user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}