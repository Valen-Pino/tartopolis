"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { castVote, deleteClaim } from "@/app/actions/hazanas";
import type { Claim } from "@/lib/types";

export function ClaimControls({ claim, mode }: { claim: Claim; mode: "vote" | "delete" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const achievement = claim.achievement;
  const range = achievement.score_mode === "range";
  const negative = achievement.polarity === "negative";
  const values = range ? Array.from(
    { length: (achievement.maximum_points ?? 0) - (achievement.minimum_points ?? 0) + 1 },
    (_, index) => (achievement.minimum_points ?? 0) + index,
  ) : [];

  function openDialog() {
    setError(null);
    dialog.current?.showModal();
  }

  function submit(approve: boolean, formData = new FormData()) {
    formData.set("claimId", claim.id);
    formData.set("approve", String(approve));
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "delete") await deleteClaim(formData);
        else await castVote(formData);
        dialog.current?.close();
      } catch {
        setError(mode === "delete"
          ? "No pudimos eliminar la votación. Volvé a intentarlo."
          : "No pudimos guardar tu voto. Volvé a intentarlo.");
      }
    });
  }

  function voteClass(approve: boolean) {
    if (!claim.my_vote) return "vote-button";
    if (claim.my_vote.approve !== approve) return "vote-button vote-muted";
    return `vote-button ${approve ? "vote-for" : "vote-against"}`;
  }

  return <>
    {mode === "delete" ? (
      <button type="button" onClick={openDialog} className="delete-claim-button" aria-label={`Eliminar votación: ${achievement.title}`} title="Eliminar votación">
        <Trash2 size={19} />
      </button>
    ) : (
      <div className="border-t border-[var(--line)] bg-black/20 p-4" aria-busy={busy}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} aria-pressed={claim.my_vote?.approve === false} onClick={() => submit(false)} className={voteClass(false)}><X size={17} /> EN CONTRA</button>
          <button type="button" disabled={busy} aria-pressed={claim.my_vote?.approve === true} onClick={() => range ? openDialog() : submit(true)} className={voteClass(true)}><Check size={17} /> A FAVOR</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-[var(--red)]">{error}</p>}
      </div>
    )}

    {(mode === "delete" || range) && <dialog ref={dialog} className="claim-dialog" aria-labelledby={titleId}>
      <form action={(formData) => submit(true, formData)} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 id={titleId} className="text-xl font-black tracking-tight">
            {mode === "delete" ? "¿Eliminar esta votación?" : `¿Cuántos puntos querés ${negative ? "restarle" : "sumarle"}?`}
          </h3>
          <button type="button" className="dialog-close" disabled={busy} aria-label="Cerrar" onClick={() => dialog.current?.close()}><X size={20} /></button>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{achievement.title}</p>
        {mode === "delete" ? (
          <p className="mt-4 text-sm leading-6 text-[#c2c5ce]">Se eliminarán la votación y sus votos{claim.status === "approved" ? ", y se revertirán los puntos que generó" : ""}. Esta acción no se puede deshacer.</p>
        ) : (
          <label className="mt-5 block text-sm font-bold">
            Puntaje de tu voto
            <select key={`${claim.id}-${claim.my_vote?.proposed_points}`} name="proposedPoints" className="field mt-2" required defaultValue={claim.my_vote?.approve ? claim.my_vote.proposed_points ?? "" : ""}>
              <option value="" disabled>Elegí cuántos puntos</option>
              {values.map((value) => <option key={value} value={value}>{value > 0 ? "+" : ""}{value} OVR</option>)}
            </select>
          </label>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-[var(--red)]">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} className="secondary-button" onClick={() => dialog.current?.close()}>Cancelar</button>
          <button type="submit" disabled={busy} className={mode === "delete" ? "vote-button vote-against" : "primary-button"}>{busy ? "Guardando…" : mode === "delete" ? "Eliminar" : "Confirmar voto"}</button>
        </div>
      </form>
    </dialog>}
  </>;
}
