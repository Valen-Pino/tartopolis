import type { ScoringInputs } from "./achievement-scoring";

export type Participant = {
  id: string;
  full_name: string;
  nickname: string;
  slug: string;
  profile_confirmed_at: string | null;
};

export type RankingParticipant = Participant & {
  ovr: number;
  event_count: number;
};

export type ScoreEvent = {
  id: string;
  description: string;
  points: number;
  source_kind: "initial" | "imported" | "claim" | "manual";
  occurred_at: string;
};

export type Achievement = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "objective" | "subjective";
  polarity: "positive" | "negative";
  score_mode: "fixed" | "range";
  fixed_points: number | null;
  minimum_points: number | null;
  maximum_points: number | null;
  per_person_limit: number | null;
};

export type Claim = {
  id: string;
  details: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  assigned_points: number | null;
  scoring_inputs: ScoringInputs;
  eligible_voters: number;
  approval_count: number;
  rejection_count: number;
  resolved_points: number | null;
  created_at: string;
  achievement: Achievement;
  creator: Pick<Participant, "id" | "nickname" | "slug">;
  target: Pick<Participant, "id" | "nickname" | "slug">;
  my_vote?: {
    approve: boolean;
    proposed_points: number | null;
  } | null;
  partial_average?: number | null;
  scored_vote_count?: number;
};
