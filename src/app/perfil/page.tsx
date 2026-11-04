import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/profile";
import { ProfileForm } from "@/components/profile-form";
import { requireParticipant } from "@/lib/auth";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const participant = await requireParticipant();
  const { error } = await searchParams;
  return (
    <section className="space-y-4 py-4">
      <ProfileForm participant={participant} error={error} />
      <form action={logout}>
        <button className="secondary-button w-full text-[var(--red)]" type="submit"><LogOut size={18} />Salir de este dispositivo</button>
      </form>
    </section>
  );
}
