import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { catalogPointsLabel } from "@/lib/achievement-scoring";
import { ClaimForm } from "@/components/claim-form";
import { requireParticipant } from "@/lib/auth";
import { getAchievements, getParticipants } from "@/lib/data";

export default async function NewClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const participant = await requireParticipant();
  const { slug } = await params;
  const [achievements, participants] = await Promise.all([getAchievements(), getParticipants()]);
  const achievement = achievements.find((item) => item.slug === slug);
  if (!achievement) notFound();
  const pointText = catalogPointsLabel(achievement);

  return (
    <section className="pb-3 pt-2">
      <Link href="/hazanas" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]"><ArrowLeft size={17} /> Volver a Hazañas</Link>
      <div className="card p-6">
        <span className={`inline-block rounded-md px-2 py-1 text-xs font-black ${achievement.polarity === "positive" ? "bg-[#173725] text-[var(--green)]" : "bg-[#411f25] text-[var(--red)]"}`}>{pointText}</span>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-[-0.05em]">{achievement.title}</h1>

        <ClaimForm achievement={achievement} participants={participants.filter((item) => item.id !== participant.id)} />
      </div>
    </section>
  );
}
