import { withRankPositions } from "@/lib/ranking";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Achievement,
  Claim,
  Participant,
  RankingParticipant,
  ScoreEvent,
} from "@/lib/types";

export async function getRanking() {
  const { data, error } = await createAdminClient()
    .from("participant_ranking")
    .select("id, full_name, nickname, slug, ovr, event_count")
    .order("ovr", { ascending: false })
    .order("nickname", { ascending: true });
  if (error) throw error;
  return withRankPositions((data ?? []) as RankingParticipant[]);
}

export async function getParticipantProfile(slug: string) {
  const { data: participant, error } = await createAdminClient()
    .from("participant_ranking")
    .select("id, full_name, nickname, slug, ovr, event_count")
    .eq("slug", slug)
    .single();
  if (error) return null;

  const { data: events, error: eventsError } = await createAdminClient()
    .from("score_events")
    .select("id, description, points, source_kind, occurred_at")
    .eq("participant_id", participant.id)
    .order("occurred_at", { ascending: false });
  if (eventsError) throw eventsError;

  return {
    participant: participant as RankingParticipant,
    events: (events ?? []) as ScoreEvent[],
  };
}

export async function getParticipants() {
  const { data, error } = await createAdminClient()
    .from("participants")
    .select("id, full_name, nickname, slug, profile_confirmed_at")
    .eq("is_active", true)
    .order("nickname");
  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function getAchievements() {
  const { data, error } = await createAdminClient()
    .from("achievements")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

type RawClaim = {
  id: string;
  details: string;
  status: Claim["status"];
  assigned_points: number | null;
  scoring_inputs: Claim["scoring_inputs"];
  eligible_voters: number;
  approval_count: number;
  rejection_count: number;
  resolved_points: number | null;
  created_at: string;
  achievement: Achievement;
  creator: Claim["creator"];
  target: Claim["target"];
};

export async function getClaims(viewerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("achievement_claims")
    .select(`
      id, details, status, assigned_points, scoring_inputs, eligible_voters, approval_count, rejection_count,
      resolved_points, created_at,
      achievement:achievements(*),
      creator:participants!achievement_claims_created_by_fkey(id, nickname, slug),
      target:participants!achievement_claims_target_participant_id_fkey(id, nickname, slug)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const claimIds = (data ?? []).map((claim) => claim.id);
  const { data: votes, error: votesError } = claimIds.length
    ? await supabase
        .from("achievement_votes")
        .select("claim_id, voter_id, approve, proposed_points")
        .in("claim_id", claimIds)
    : { data: [], error: null };
  if (votesError) throw votesError;

  const voteByClaim = new Map(
    (votes ?? [])
      .filter((vote) => vote.voter_id === viewerId)
      .map((vote) => [vote.claim_id, vote]),
  );

  return ((data ?? []) as unknown as RawClaim[]).map((claim) => {
    const scoredVotes = (votes ?? []).filter(
      (vote) =>
        vote.claim_id === claim.id &&
        vote.approve &&
        vote.proposed_points !== null,
    );
    const partialAverage = scoredVotes.length
      ? scoredVotes.reduce((sum, vote) => sum + (vote.proposed_points ?? 0), 0) /
        scoredVotes.length
      : null;

    return {
      ...claim,
      my_vote: voteByClaim.get(claim.id) ?? null,
      partial_average: partialAverage,
      scored_vote_count: scoredVotes.length,
    };
  }) as Claim[];
}
