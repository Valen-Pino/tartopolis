import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentParticipant } from "@/lib/auth";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/acceso");
  if (participant.profile_confirmed_at) redirect("/");

  const { error } = await searchParams;
  return <section className="grid min-h-[72vh] place-items-center py-8"><ProfileForm participant={participant} firstVisit error={error} /></section>;
}
