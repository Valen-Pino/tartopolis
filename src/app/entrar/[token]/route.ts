import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = createAdminClient();

  const { data: access, error } = await supabase
    .from("access_links")
    .select("id, participant_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  const invalid = error || !access || access.revoked_at || (access.expires_at && new Date(access.expires_at) <= new Date());
  if (invalid) return NextResponse.redirect(new URL("/acceso?error=invalid", request.url));

  await supabase.from("access_links").update({ last_used_at: new Date().toISOString() }).eq("id", access.id);
  await createSession(access.participant_id);

  const { data: participant } = await supabase
    .from("participants")
    .select("profile_confirmed_at")
    .eq("id", access.participant_id)
    .single();

  return NextResponse.redirect(new URL(participant?.profile_confirmed_at ? "/" : "/bienvenida", request.url));
}
