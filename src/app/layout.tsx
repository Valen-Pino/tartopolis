import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentParticipant } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tartópolis 2027",
  description: "El viaje se juega antes de llegar.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const participant = await getCurrentParticipant();

  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <header className="flex h-20 items-center justify-between">
            <Link href="/" className="text-lg font-black tracking-[-0.05em] text-white">
              TARTÓPOLIS<span className="text-[var(--gold)]">27</span>
            </Link>
            {participant ? (
              <Link
                href="/perfil"
                className="rounded-full border border-[var(--line)] bg-[#151820] px-3 py-2 text-xs font-black uppercase tracking-wide"
              >
                {participant.nickname}
              </Link>
            ) : <Link href="/acceso" className="rounded-full border border-[var(--line)] bg-[#151820] px-3 py-2 text-xs font-black">Iniciar sesión</Link>}
          </header>
          <main>{children}</main>
          {participant?.profile_confirmed_at && <BottomNav />}
        </div>
      </body>
    </html>
  );
}
