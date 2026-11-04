import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { LoginForm } from "@/components/account-forms";
import { getCurrentParticipant } from "@/lib/auth";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const participant = await getCurrentParticipant();
  if (participant) redirect(participant.profile_confirmed_at ? "/" : "/bienvenida");
  const configured = isSupabaseConfigured() && Boolean(process.env.SESSION_SECRET);
  const { error: reason } = await searchParams;
  const { data: participants, error } = configured
    ? await createAdminClient().from("participants").select("id, nickname").eq("is_active", true).order("nickname")
    : { data: [], error: null };
  return (
    <section className="card my-8 p-6">
      <KeyRound className="text-[var(--gold)]" size={28} />
      <p className="eyebrow mt-6">Tu cuenta</p>
      <h1 className="mt-2 text-3xl font-black">Volvé a Tartópolis</h1>
      {reason && <p role="status" className="mt-4 rounded-xl border border-amber-800 p-3 text-sm text-amber-200">Los enlaces anteriores ya no permiten ingresar. Si todavía no tenés contraseña, pedile tu invitación nueva a Pino.</p>}
      {configured && !error ? <LoginForm participants={participants ?? []} /> : <p className="mt-6 text-sm text-amber-200">El acceso no está disponible en este momento. Intentá nuevamente más tarde.</p>}
      <Link href="/registro" className="secondary-button mt-4 w-full">Crear cuenta</Link>
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Si no recordás tu contraseña, contactá a Pino para que te restablezca el acceso.</p>
      <Link href="/" className="secondary-button mt-3 w-full">Volver al inicio</Link>
    </section>
  );
}
