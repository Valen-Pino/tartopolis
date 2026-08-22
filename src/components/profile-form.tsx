import { UserRound } from "lucide-react";
import { updateNickname } from "@/app/actions/profile";
import type { Participant } from "@/lib/types";

export function ProfileForm({ participant, firstVisit = false }: { participant: Participant; firstVisit?: boolean }) {
  return (
    <form action={updateNickname} className="card p-6">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#282032] text-[var(--gold)]"><UserRound /></div>
      <p className="eyebrow mt-6">{firstVisit ? "Primer ingreso" : "Tu perfil"}</p>
      <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">
        {firstVisit ? `Bienvenido, ${participant.nickname}` : participant.full_name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {firstVisit
          ? "Antes de entrar, confirmá tu apodo o cambialo. Después también vas a poder editarlo desde tu perfil."
          : "Este es el nombre que ven los demás en el ranking, las acusaciones y los votos."}
      </p>
      <label className="mt-6 block text-xs font-black uppercase tracking-wider text-[#b9bdc8]" htmlFor="nickname">Apodo</label>
      <input className="field mt-2" id="nickname" name="nickname" defaultValue={participant.nickname} autoFocus={firstVisit} required minLength={2} maxLength={24} />
      <p className="mt-2 text-xs text-[#747987]">Nombre real: {participant.full_name}</p>
      <button className="primary-button mt-6 w-full" type="submit">{firstVisit ? "Confirmar y entrar" : "Guardar apodo"}</button>
    </form>
  );
}
