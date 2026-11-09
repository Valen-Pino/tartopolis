import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ClaimCard } from "@/components/claim-card";
import { PageHeading } from "@/components/page-heading";
import { requireParticipant } from "@/lib/auth";
import { catalogPointsLabel } from "@/lib/achievement-scoring";
import { getAchievements, getClaims } from "@/lib/data";

const notices: Record<string, string> = {
  claim: "No pudimos crear la votación. Revisá el participante y la descripción.",
  self: "No podés asignarte una Hazaña a vos mismo.",
  achievement: "La Hazaña seleccionada ya no está disponible.",
  vote: "No pudimos registrar el voto. Volvé a intentarlo.",
};

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const participant = await requireParticipant();
  const query = await searchParams;
  const [achievements, claims] = await Promise.all([getAchievements(), getClaims(participant.id)]);
  const pending = claims.filter((claim) => claim.status === "pending");
  const resolved = claims.filter((claim) => claim.status !== "pending").slice(0, 6);

  return (
    <section className="pb-3">
      <PageHeading title="Hazañas" description="Señalá una acción, elegí a quién corresponde y dejá que el grupo dé su veredicto." />

      {query.error && notices[query.error] && (
        <p className="mb-5 rounded-xl border border-red-900/70 bg-red-950/35 p-4 text-sm font-bold text-red-200">
          {notices[query.error]}
        </p>
      )}
      {query.created === "1" && (
        <p className="mb-5 rounded-xl border border-emerald-900/70 bg-emerald-950/35 p-4 text-sm font-bold text-emerald-200">
          La votación quedó abierta. Ya pueden votar todos los participantes.
        </p>
      )}

      {pending.length > 0 && (
        <div className="mb-9">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black uppercase tracking-tight">En votación</h2><span className="rounded-full bg-[#2b2334] px-2.5 py-1 text-xs font-black text-[var(--gold)]">{pending.length}</span></div>
          <div className="space-y-4">{pending.map((claim) => <ClaimCard key={claim.id} claim={claim} viewerId={participant.id} />)}</div>
        </div>
      )}

      <div>
        <div className="mb-4"><h2 className="mt-1 text-2xl font-black uppercase tracking-tight">Asignar una Hazaña</h2></div>
        <div className="space-y-2">
          {achievements.map((achievement) => (
            <Link key={achievement.id} href={`/hazanas/nueva/${achievement.slug}`} className="card flex items-center gap-3 p-4">
              <div className={`grid h-11 w-14 shrink-0 place-items-center rounded-lg text-sm font-black ${achievement.polarity === "positive" ? "bg-[#173725] text-[var(--green)]" : "bg-[#411f25] text-[var(--red)]"}`}>{catalogPointsLabel(achievement)}</div>
              <div className="min-w-0 flex-1"><p className="font-black uppercase tracking-tight">{achievement.title}</p></div>
              <ArrowRight size={17} className="shrink-0 text-[#626876]" />
            </Link>
          ))}
        </div>
      </div>

      {resolved.length > 0 && (
        <div className="mt-9">
          <div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-[var(--violet)]" /><h2 className="text-xl font-black uppercase tracking-tight">Últimos veredictos</h2></div>
          <div className="space-y-4">{resolved.map((claim) => <ClaimCard key={claim.id} claim={claim} viewerId={participant.id} />)}</div>
        </div>
      )}
    </section>
  );
}
