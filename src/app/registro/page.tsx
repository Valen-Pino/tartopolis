import Link from "next/link";
import { KeyRound } from "lucide-react";
import { RequestLinkButton } from "@/components/request-link-button";

export default function RegistrationPage() {
  return (
    <section className="card my-8 p-6">
      <KeyRound className="text-[var(--gold)]" size={28} />
      <p className="eyebrow mt-6">Crear cuenta</p>
      <h1 className="mt-2 text-3xl font-black">Abrí tu invitación personal</h1>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Pedile a Pino el enlace asociado a tu cuenta. Abrilo para crear tu contraseña y activar tu cuenta.</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Si todavía no recibiste tu invitación o venció, pedile una nueva.</p>
      <RequestLinkButton />
      <Link href="/" className="secondary-button mt-3 w-full">Volver al inicio</Link>
    </section>
  );
}
