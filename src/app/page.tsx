import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin, Sparkles, Trophy } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { OvrBadge } from "@/components/ovr-badge";
import { getCurrentParticipant } from "@/lib/auth";
import { getClaims, getRanking } from "@/lib/data";

export default async function HomePage() {
  const participant = await getCurrentParticipant();
  if (participant && !participant.profile_confirmed_at) redirect("/bienvenida");
  const [rankingResult, claims] = await Promise.all([getRanking().catch(() => null), participant ? getClaims(participant.id) : Promise.resolve([])]);
  const ranking = rankingResult ?? [];
  const pending = claims.filter((claim) => claim.status === "pending");
  const myPosition = ranking.findIndex((item) => item.id === participant?.id) + 1;
  const me = ranking.find((item) => item.id === participant?.id);

  return (
    <div className="space-y-5 pb-2">
      <section className="overflow-hidden rounded-[1.6rem] border border-[#3d3448] bg-gradient-to-br from-[#332443] via-[#1b1724] to-[#111319] p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-[#cabde0]"><MapPin size={15} className="text-[var(--gold)]" /> Florianópolis, Brasil</div>
        <h1 className="display mt-5">Tartópolis<br /><span className="text-[var(--gold)]">2027</span></h1>
        <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#c1b9ca]"><CalendarDays size={15} /> 22 de enero · 16:00</div>
        <div className="mt-5"><Countdown /></div>
      </section>

      {participant ? <section className="grid grid-cols-2 gap-3">
        <Link href={`/ranking/${participant.slug}`} className="card p-4">
          <div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Tu puesto</p><p className="mt-2 text-3xl font-black">#{myPosition}</p></div>{me && <OvrBadge value={me.ovr} compact />}</div>
          <p className="mt-4 flex items-center gap-1 text-xs font-bold text-[var(--gold)]">Ver historial <ArrowRight size={14} /></p>
        </Link>
        <Link href="/hazanas" className="card p-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#282032] text-[var(--violet)]"><Sparkles /></div>
          <p className="mt-3 text-3xl font-black">{pending.length}</p>
          <p className="text-xs font-bold text-[var(--muted)]">votaciones abiertas</p>
        </Link>
      </section> : <section className="card p-5">
        <p className="eyebrow">El viaje ya se juega</p>
        <h2 className="mt-2 text-xl font-black">Entrá para ser parte</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Seguí el ranking y la cuenta regresiva. Iniciá sesión para votar, cargar Hazañas y acceder a tu perfil.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/acceso" className="primary-button">Iniciar sesión</Link>
          <Link href="/registro" className="secondary-button">Crear cuenta</Link>
        </div>
      </section>}

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div><p className="eyebrow">{participant ? "Podio actual" : "Leaderboard"}</p><h2 className="mt-1 text-xl font-black uppercase tracking-tight">{participant ? "Los que mandan" : "Ranking OVR"}</h2></div>
          <Trophy className="text-[var(--gold)]" />
        </div>
        <div className="mt-5 space-y-2">
          {!rankingResult && <p role="status" className="rounded-xl bg-black/20 p-3 text-sm text-[var(--muted)]">El ranking no está disponible en este momento. Volvé a intentar en unos minutos.</p>}
          {(participant ? ranking.slice(0, 3) : ranking).map((item, index) => (
            <Link key={item.id} href={participant ? `/ranking/${item.slug}` : "/acceso"} className="flex items-center gap-3 rounded-xl bg-black/20 p-3">
              <span className="w-5 text-center text-sm font-black text-[#777d8b]">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-black uppercase">{item.nickname}</p><p className="truncate text-xs text-[var(--muted)]">{item.full_name}</p></div>
              <span className="text-lg font-black text-[var(--gold)]">{item.ovr}</span>
            </Link>
          ))}
        </div>
        {participant ? <Link href="/ranking" className="secondary-button mt-4 w-full">Ver ranking completo <ArrowRight size={17} /></Link> : <p className="mt-4 text-center text-xs text-[var(--muted)]">Iniciá sesión para ver el historial de cada participante.</p>}
      </section>
    </div>
  );
}
