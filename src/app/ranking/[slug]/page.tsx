import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { OvrBadge } from "@/components/ovr-badge";
import { requireParticipant } from "@/lib/auth";
import { getParticipantProfile } from "@/lib/data";

export default async function ParticipantPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireParticipant();
  const { slug } = await params;
  const profile = await getParticipantProfile(slug);
  if (!profile) notFound();
  const { participant, events } = profile;

  return (
    <section className="pb-3 pt-2">
      <Link href="/ranking" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17} /> Volver al ranking</Link>
      <div className="card flex items-center gap-4 p-5">
        <OvrBadge value={participant.ovr} />
        <div className="min-w-0"><h1 className="truncate text-3xl font-black uppercase tracking-[-0.05em]">{participant.nickname}</h1><p className="mt-1 text-sm text-[var(--muted)]">{participant.full_name}</p></div>
      </div>

      <h2 className="mt-7 text-2xl font-black uppercase tracking-tight">Historial de Hazañas</h2>
      <div className="relative mt-5 space-y-3 before:absolute before:bottom-5 before:left-[1.15rem] before:top-5 before:w-px before:bg-[#303440]">
        {events.map((event) => {
          const initial = event.source_kind === "initial";
          const positive = event.points >= 0;
          return (
            <div key={event.id} className="relative flex gap-3 pl-0.5">
              <div className={`z-10 mt-3 grid h-9 w-9 shrink-0 place-items-center rounded-full border-4 border-[var(--background)] ${initial ? "bg-[#343844] text-white" : positive ? "bg-[#163927] text-[var(--green)]" : "bg-[#421e25] text-[var(--red)]"}`}>
                {initial ? <span className="text-[0.6rem] font-black">65</span> : positive ? <Plus size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
              </div>
              <div className="card flex flex-1 items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold leading-5">{event.description}</p><p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wider text-[#6f7481]">{initial ? "Inicio" : event.source_kind === "imported" ? "Registro original" : "Votación aprobada"}</p></div>
                <span className={`text-xl font-black ${initial ? "text-white" : positive ? "score-positive" : "score-negative"}`}>{positive && !initial ? "+" : ""}{event.points}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
