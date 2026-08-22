import { KeyRound, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export default function AccessPage() {
  const configured = isSupabaseConfigured() && Boolean(process.env.SESSION_SECRET);

  return (
    <section className="grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#282032] text-[var(--gold)]">
          <KeyRound size={26} />
        </div>
        <p className="eyebrow mt-6">Acceso privado</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">Tu lugar ya está reservado</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Abrí el enlace personal que recibiste. No hace falta usuario ni contraseña y este dispositivo quedará conectado con tu participante.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#2c303a] bg-black/20 p-4 text-left text-xs leading-5 text-[#b5b9c4]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--green)]" size={18} />
          No compartas ese enlace: funciona como tu llave de acceso y permite votar en tu nombre.
        </div>
        {!configured && (
          <p className="mt-5 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200">
            El proyecto todavía necesita las variables de Supabase y sesión para habilitar los accesos.
          </p>
        )}
      </div>
    </section>
  );
}
