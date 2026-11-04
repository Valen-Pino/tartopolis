import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { SetPasswordForm } from "@/components/account-forms";
import { getInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu invitación · Tartópolis", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitation(token);
  if (!invitation) return (
    <section className="card my-8 p-6">
      <h1 className="text-2xl font-black">Este enlace ya no está disponible</h1>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Puede haber vencido, haber sido usado o reemplazado. Si ya creaste tu cuenta, iniciá sesión. Si necesitás otro enlace, pedíselo a Pino.</p>
      <Link href="/acceso" className="primary-button mt-6 w-full">Iniciar sesión</Link>
      <Link href="/" className="secondary-button mt-3 w-full">Volver al inicio</Link>
    </section>
  );
  const reset = invitation.purpose === "reset";
  return (
    <section className="card my-8 p-6">
      <KeyRound className="text-[var(--gold)]" size={28} />
      <p className="eyebrow mt-6">{reset ? "Restablecer acceso" : "Tu lugar está reservado"}</p>
      <h1 className="mt-2 text-3xl font-black">{invitation.participant.nickname}</h1>
      <SetPasswordForm token={token} reset={reset} />
      <p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">Esta invitación es personal y se usa una sola vez. No la compartas.</p>
    </section>
  );
}
