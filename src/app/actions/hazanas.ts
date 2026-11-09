"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipant } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAdditionalPoints, isCustom, optionsFor, type ScoringInputs } from "@/lib/achievement-scoring";
import { canDeleteClaim } from "@/lib/claim-permissions";

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
    supabase.from("achievements").select("id, slug, minimum_points, maximum_points").eq("id", result.data.achievementId).eq("is_active", true).single(),
  ]);
  if (!achievement) redirect("/hazanas?error=achievement");

  const scoringInputs: ScoringInputs = {};
  if (isCustom(achievement.slug)) {
    const value = formData.get("customPoints");
    const points = typeof value === "string" && /^-?\d{1,2}$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(points) || points < achievement.minimum_points || points > achievement.maximum_points) redirect("/hazanas?error=claim");
    scoringInputs.points = points;
  } else if (achievement.slug === "atraer-after") {
    for (const key of ["women", "men"] as const) {
      const value = formData.get(key);
      if (typeof value !== "string" || !/^\d{1,7}$/.test(value) || Number(value) > 1000000) {
        redirect("/hazanas?error=claim");
      }
      scoringInputs[key] = Number(value);
    }
  } else if (hasAdditionalPoints(achievement.slug)) {
    for (const { key } of optionsFor(achievement.slug)) scoringInputs[key] = formData.get(key) === "on";
    // Reject forbidden extras even when a request bypasses the form.
    if ((achievement.slug === "tartear" && formData.has("visiting")) ||
        (achievement.slug !== "detonacion" && formData.has("trio"))) redirect("/hazanas?error=claim");
  }

  const { error } = await supabase.from("achievement_claims").insert({
    achievement_id: result.data.achievementId,
    created_by: participant.id,
    target_participant_id: result.data.targetId,
    details: result.data.details,
    scoring_inputs: scoringInputs,
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
    ? Number(result.data.proposedPoints)
    : null;
  if (proposed !== null && !Number.isInteger(proposed)) redirect("/hazanas?error=vote");
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
  revalidatePath("/ranking/[slug]", "page");
}

export async function deleteClaim(formData: FormData) {
  const participant = await requireParticipant();
  const claimId = z.string().uuid().safeParse(formData.get("claimId"));
  if (!claimId.success) throw new Error("La votación no es válida.");

  const supabase = createAdminClient();
  const { data: claim, error: lookupError } = await supabase
    .from("achievement_claims").select("created_by").eq("id", claimId.data).single();
  if (lookupError || !claim || !canDeleteClaim(participant.id, claim.created_by)) {
    throw new Error("No podés eliminar esta votación.");
  }
  const { error } = await supabase.rpc("delete_achievement_claim", {
    p_claim_id: claimId.data,
    p_actor_id: participant.id,
  });
  if (error) throw new Error("No pudimos eliminar la votación. Volvé a intentarlo.");

  revalidatePath("/");
  revalidatePath("/hazanas");
  revalidatePath("/ranking");
  revalidatePath("/ranking/[slug]", "page");
}
