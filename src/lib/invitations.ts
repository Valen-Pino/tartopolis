import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function invitationHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const supabase = createAdminClient();
  const { data: link, error } = await supabase.from("access_links")
    .select("participant_id, purpose, expires_at, revoked_at, consumed_at")
    .eq("token_hash", invitationHash(token)).single();
  if (error || !link || link.revoked_at || link.consumed_at || !link.expires_at ||
    new Date(link.expires_at) <= new Date() || !["register", "reset"].includes(link.purpose)) return null;
  const { data: participant } = await supabase.from("participants")
    .select("id, nickname, profile_confirmed_at")
    .eq("id", link.participant_id).eq("is_active", true).single();
  if (!participant) return null;
  return { participant, purpose: link.purpose as "register" | "reset" };
}
