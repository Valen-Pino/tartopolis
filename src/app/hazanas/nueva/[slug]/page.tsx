import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClaim } from "@/app/actions/hazanas";
import { requireParticipant } from "@/lib/auth";
import { getAchievements, getParticipants } from "@/lib/data";

export default async function NewClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const participant = await requireParticipant();
  const { slug } = await params;
  const [achievements, participants] = await Promise.all([getAchievements(), getParticipants()]);
  const achievement = achievements.find((item) => item.slug === slug);
  if (!achievement) notFound();
  const pointText = achievement.score_mode === "fixed"
    ? `${(achievement.fixed_points ?? 0) > 0 ? "+" : ""}${achievement.fixed_points} OVR`
    : `${achievement.minimum_points} a ${(achievement.maximum_points ?? 0) > 0 ? "+" : ""}${achievement.maximum_points} OVR`;

  return (
    <section className="pb-3 pt-2">
      <Link href="/hazanas" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17} /> Volver a Hazañas</Link>
      <div className="card p-6">
        <span className={`inline-block rounded-md px-2 py-1 text-xs font-black ${achievement.polarity === "positive" ? "bg-[#173725] text-[var(--green)]" : "bg-[#411f25] text-[var(--red)]"}`}>{pointText}</span>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">{achievement.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{achievement.description}</p>

        <form action={createClaim} className="mt-7 space-y-5">
          <input type="hidden" name="achievementId" value={achievement.id} />
          <div>
            <label htmlFor="targetId" className="text-xs font-black uppercase tracking-wider text-[#b9bdc8]">¿A quién se la asignás?</label>
            <select className="field mt-2" id="targetId" name="targetId" required defaultValue="">
              <option value="" disabled>Elegí un participante</option>
              {participants.filter((item) => item.id !== participant.id).map((item) => <option key={item.id} value={item.id}>{item.nickname}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="details" className="text-xs font-black uppercase tracking-wider text-[#b9bdc8]">¿Qué pasó?</label>
            <textarea className="field mt-2 min-h-28 resize-y" id="details" name="details" placeholder="Contá brevemente la situación…" required minLength={3} maxLength={240} />
            <p className="mt-2 text-xs text-[#707583]">El grupo verá esta explicación antes de votar.</p>
          </div>
          <button className="primary-button w-full" type="submit">Abrir votación</button>
        </form>
      </div>
    </section>
  );
}
