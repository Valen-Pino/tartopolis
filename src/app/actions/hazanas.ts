"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipant } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const postgresUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

const claimSchema = z.object({
  achievementId: z.string().uuid(),
  targetId: postgresUuid,
  details: z.string().trim().min(3).max(240),
});

export async function createClaim(formData: FormData) {
  const participant = await requireParticipant();
  const result = claimSchema.safeParse({
    achievementId: formData.get("achievementId"),
    targetId: formData.get("targetId"),
    details: formData.get("details"),
  });
  if (!result.success) redirect("/hazanas?error=claim");
  if (result.data.targetId === participant.id) redirect("/hazanas?error=self");

  const supabase = createAdminClient();
  const [{ count }, { data: achievement }] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("achievements").select("id").eq("id", result.data.achievementId).eq("is_active", true).single(),
  ]);
  if (!achievement) redirect("/hazanas?error=achievement");

  const { error } = await supabase.from("achievement_claims").insert({
    achievement_id: result.data.achievementId,
    created_by: participant.id,
    target_participant_id: result.data.targetId,
    details: result.data.details,
    eligible_voters: count ?? 0,
  });
  if (error) throw error;

  revalidatePath("/hazanas");
  redirect("/hazanas?created=1");
}

const voteSchema = z.object({
  claimId: z.string().uuid(),
  approve: z.enum(["true", "false"]),
  proposedPoints: z.string().optional(),
});

export async function castVote(formData: FormData) {
  const participant = await requireParticipant();
  const result = voteSchema.safeParse({
    claimId: formData.get("claimId"),
    approve: formData.get("approve"),
    proposedPoints: formData.get("proposedPoints")?.toString(),
  });
  if (!result.success) redirect("/hazanas?error=vote");

  const proposed = result.data.proposedPoints?.length
    ? Number.parseInt(result.data.proposedPoints, 10)
    : null;
  const { error } = await createAdminClient().rpc("cast_achievement_vote", {
    p_claim_id: result.data.claimId,
    p_voter_id: participant.id,
    p_approve: result.data.approve === "true",
    p_proposed_points: Number.isNaN(proposed) ? null : proposed,
  });
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/hazanas");
  revalidatePath("/ranking");
}
