import { redirect } from "next/navigation";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getSessionParticipantId } from "@/lib/session";
import type { Participant } from "@/lib/types";

export async function getCurrentParticipant(): Promise<Participant | null> {
  if (!isSupabaseConfigured() || !process.env.SESSION_SECRET) return null;

  const participantId = await getSessionParticipantId();
  if (!participantId) return null;

  const { data, error } = await createAdminClient()
    .from("participants")
    .select("id, full_name, nickname, slug, profile_confirmed_at")
    .eq("id", participantId)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as Participant;
}

export async function requireParticipant() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/acceso");
  if (!participant.profile_confirmed_at) redirect("/bienvenida");
  return participant;
}
