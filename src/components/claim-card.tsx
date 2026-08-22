import Link from "next/link";
import { Check, Clock3, Scale, X } from "lucide-react";
import { castVote } from "@/app/actions/hazanas";
import type { Claim } from "@/lib/types";

function pointsLabel(claim: Claim) {
  const item = claim.achievement;
  if (item.score_mode === "fixed") return `${(item.fixed_points ?? 0) > 0 ? "+" : ""}${item.fixed_points} OVR`;
  return `${(item.minimum_points ?? 0) > 0 ? "+" : ""}${item.minimum_points} a ${(item.maximum_points ?? 0) > 0 ? "+" : ""}${item.maximum_points} OVR`;
}

export function ClaimCard({ claim }: { claim: Claim }) {
  const pending = claim.status === "pending";
  const achievement = claim.achievement;
  const values = achievement.score_mode === "range"
    ? Array.from({ length: (achievement.maximum_points ?? 0) - (achievement.minimum_points ?? 0) + 1 }, (_, index) => (achievement.minimum_points ?? 0) + index)
    : [];

  return (
    <article className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-[0.58rem] font-black uppercase tracking-wider ${achievement.polarity === "positive" ? "bg-[#173725] text-[var(--green)]" : "bg-[#411f25] text-[var(--red)]"}`}>{pointsLabel(claim)}</span>
              <span className="text-[0.6rem] font-black uppercase tracking-wider text-[#707685]">{achievement.kind === "objective" ? "Objetiva" : "Subjetiva"}</span>
            </div>
            <h3 className="mt-3 text-xl font-black uppercase tracking-tight">{achievement.title}</h3>
          </div>
          {pending ? <Clock3 className="shrink-0 text-[var(--gold)]" size={19} /> : claim.status === "approved" ? <Check className="shrink-0 text-[var(--green)]" /> : <X className="shrink-0 text-[var(--red)]" />}
        </div>
        <p className="mt-3 text-sm leading-5 text-[#c2c5ce]">{claim.details}</p>
        <p className="mt-4 text-xs text-[var(--muted)]"><Link className="font-black text-white" href={`/ranking/${claim.target.slug}`}>{claim.target.nickname}</Link> fue señalado por <span className="font-bold text-white">{claim.creator.nickname}</span></p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-[#10261b] px-3 py-2 text-xs font-bold text-[var(--green)]"><Check className="mr-1 inline" size={14} /> {claim.approval_count} a favor</div>
          <div className="rounded-lg bg-[#30191e] px-3 py-2 text-xs font-bold text-[var(--red)]"><X className="mr-1 inline" size={14} /> {claim.rejection_count} en contra</div>
        </div>
        {achievement.score_mode === "range" && pending && (
          <div className="mt-3 rounded-xl border border-[#34303e] bg-[#17131d] p-3 text-center">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#898291]">Promedio parcial</p>
            {claim.partial_average !== null && claim.partial_average !== undefined ? (
              <p className="mt-1 text-xl font-black text-[var(--gold)]">
                {Math.round(claim.partial_average) > 0 ? "+" : ""}{Math.round(claim.partial_average)} OVR
                <span className="ml-2 text-[0.65rem] font-bold text-[var(--muted)]">({claim.scored_vote_count} {claim.scored_vote_count === 1 ? "voto" : "votos"})</span>
              </p>
            ) : (
              <p className="mt-1 text-xs font-bold text-[var(--muted)]">Todavía no hay votos favorables con puntaje.</p>
            )}
          </div>
        )}
        {claim.my_vote && pending && <p className="mt-3 text-center text-[0.65rem] font-bold uppercase tracking-wider text-[#7f8492]">Tu voto actual: {claim.my_vote.approve ? "a favor" : "en contra"} · Podés cambiarlo</p>}
        {!pending && <p className={`mt-4 text-center text-sm font-black uppercase ${claim.status === "approved" ? "score-positive" : "score-negative"}`}>{claim.status === "approved" ? `Aprobada · ${(claim.resolved_points ?? 0) > 0 ? "+" : ""}${claim.resolved_points} OVR` : "Rechazada · sin cambios"}</p>}
      </div>

      {pending && (
        <div className="border-t border-[var(--line)] bg-black/20 p-4">
          <div className="grid grid-cols-2 gap-2">
            <form action={castVote} className="contents">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="approve" value="false" />
              <button type="submit" className="secondary-button text-[var(--red)]"><X size={17} /> No</button>
            </form>
            <form action={castVote} className="flex gap-2">
              <input type="hidden" name="claimId" value={claim.id} />
              <input type="hidden" name="approve" value="true" />
              {values.length > 0 && (
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Puntaje</span>
                  <Scale className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#8f95a2]" size={15} />
                  <select name="proposedPoints" className="field h-12 appearance-none py-0 pl-7 pr-1 text-center text-xs font-black" defaultValue={claim.my_vote?.proposed_points ?? values[Math.floor(values.length / 2)]}>
                    {values.map((value) => <option key={value} value={value}>{value > 0 ? "+" : ""}{value}</option>)}
                  </select>
                </label>
              )}
              <button type="submit" className="primary-button flex-1"><Check size={17} /> Sí</button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
