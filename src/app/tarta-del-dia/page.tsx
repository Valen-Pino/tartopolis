import { requireParticipant } from "@/lib/auth";
import { getDailyTart } from "@/lib/daily-tart";
import { DailyTartView } from "@/components/daily-tart-view";
import { TartUpload } from "@/components/tart-upload";

export const dynamic = "force-dynamic";

export default async function DailyTartPage() {
  await requireParticipant();
  const tart = await getDailyTart();
  const day = tart?.day ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return (
    <section className="flex min-h-[calc(100svh-12rem)] flex-col pb-3">
      <h1 className="mb-7 pt-3 text-4xl font-black uppercase tracking-[-0.06em]">La Tarta del Día</h1>
      <DailyTartView imageId={tart?.image_id ?? null} day={day} />
      <div className="mt-auto pt-2"><TartUpload /></div>
    </section>
  );
}
