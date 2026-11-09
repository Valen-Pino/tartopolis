import Link from "next/link";
import { Check, X } from "lucide-react";
import { ClaimControls } from "@/components/claim-controls";
import { canDeleteClaim } from "@/lib/claim-permissions";
import { formatPoints, optionsFor } from "@/lib/achievement-scoring";
import type { Claim } from "@/lib/types";

export function ClaimCard({ claim, viewerId }: { claim: Claim; viewerId: string }) {
  const pending = claim.status === "pending";
  const achievement = claim.achievement;

  return (
    <article className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">{achievement.title}</h3>
          </div>
          {canDeleteClaim(viewerId, claim.creator.id) ? <ClaimControls claim={claim} mode="delete" /> : !pending && (claim.status === "approved" ? <Check className="shrink-0 text-[var(--green)]" /> : <X className="shrink-0 text-[var(--red)]" />)}
        </div>
        {claim.scoring_inputs?.women !== undefined && <p className="mt-3 text-sm text-[var(--muted)]">Minas: {claim.scoring_inputs.women} · Pibes: {claim.scoring_inputs.men}</p>}
        {optionsFor(achievement.slug).some(({ key }) => claim.scoring_inputs?.[key]) && <p className="mt-3 text-sm text-[var(--muted)]">{optionsFor(achievement.slug).filter(({ key }) => claim.scoring_inputs?.[key]).map(({ label }) => label).join(" · ")}</p>}
        <p className="mt-3 text-sm leading-5 text-[#c2c5ce]">{claim.details}</p>
        <p className="mt-4 text-xs text-[var(--muted)]"><Link className="font-black text-white" href={`/ranking/${claim.target.slug}`}>{claim.target.nickname}</Link> fue señalado por <span className="font-bold text-white">{claim.creator.nickname}</span></p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#10261b] px-3 py-2 text-xs font-bold text-[var(--green)]"><Check className="mr-1 inline" size={14} /> {claim.approval_count} a favor</div>
          <div className="rounded-lg bg-[#30191e] px-3 py-2 text-xs font-bold text-[var(--red)]"><X className="mr-1 inline" size={14} /> {claim.rejection_count} en contra</div>
        </div>
        {achievement.score_mode === "range" && claim.assigned_points === null && pending && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <p className="text-xs font-bold text-[var(--muted)]">Promedio parcial</p>
            {claim.partial_average !== null && claim.partial_average !== undefined ? (
              <p className="shrink-0 text-xl font-black tabular-nums text-[var(--gold)]">
                {Math.round(claim.partial_average) > 0 ? "+" : ""}{Math.round(claim.partial_average)} OVR
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">Sin puntaje aún</p>
            )}
          </div>
        )}
        {pending && claim.assigned_points !== null && <p className={`mt-4 text-center text-sm font-black ${achievement.polarity === "positive" ? "score-positive" : "score-negative"}`}>Puntaje en votación · {formatPoints(claim.assigned_points)} OVR</p>}
        {!pending && <p className={`mt-4 text-center text-sm font-black uppercase ${claim.status === "approved" ? "score-positive" : "score-negative"}`}>{claim.status === "approved" ? `Aprobada · ${(claim.resolved_points ?? 0) > 0 ? "+" : ""}${claim.resolved_points} OVR` : "Rechazada · sin cambios"}</p>}
      </div>

      {pending && <ClaimControls claim={claim} mode="vote" />}
    </article>
  );
}
