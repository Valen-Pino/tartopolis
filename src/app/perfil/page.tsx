import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/profile";
import { ProfileForm } from "@/components/profile-form";
import { requireParticipant } from "@/lib/auth";

export default async function ProfilePage() {
  const participant = await requireParticipant();
  return (
    <section className="space-y-4 py-4">
      <ProfileForm participant={participant} />
      <form action={logout}>
        <button className="secondary-button w-full text-[var(--red)]" type="submit"><LogOut size={18} />Salir de este dispositivo</button>
      </form>
    </section>
  );
}
