import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import { OvrBadge } from "@/components/ovr-badge";
import { PageHeading } from "@/components/page-heading";
import { requireParticipant } from "@/lib/auth";
import { getRanking } from "@/lib/data";

export default async function RankingPage() {
  const viewer = await requireParticipant();
  const ranking = await getRanking();

  return (
    <section className="pb-3">
      <PageHeading title="RANKING" description="Cada punto tiene una historia. Tocá un participante para ver todas sus Hazañas." />
      <div className="space-y-2">
        {ranking.map((participant) => (
          <Link
            href={`/ranking/${participant.slug}`}
            key={participant.id}
            className={`card flex items-center gap-3 p-3 ${participant.id === viewer.id ? "border-[#655574] bg-[#1d1824]" : ""}`}
          >
            <div className="grid w-8 shrink-0 place-items-center">
              {participant.position === 1 ? <Crown size={21} className="text-[var(--gold)]" fill="currentColor" /> : <span className="font-black text-[#6f7481]">{participant.position}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="truncate text-lg font-black uppercase tracking-tight">{participant.nickname}</p>{participant.id === viewer.id && <span className="rounded bg-[#332840] px-1.5 py-0.5 text-[0.55rem] font-black uppercase text-[#cbb8e4]">Vos</span>}</div>
              <p className="truncate text-xs text-[var(--muted)]">{participant.full_name} · {Math.max(0, participant.event_count - 1)} {Math.max(0, participant.event_count - 1) === 1 ? "Hazaña" : "Hazañas"}</p>
            </div>
            <OvrBadge value={participant.ovr} compact />
            <ChevronRight size={17} className="text-[#555b69]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
