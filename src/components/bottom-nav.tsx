"use client";

import Link from "next/link";
import { Home, Medal, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/ranking", label: "Ranking", icon: Medal },
  { href: "/hazanas", label: "Hazañas", icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[32rem] -translate-x-1/2 rounded-2xl border border-[#303440] bg-[#101218]/95 p-1.5 shadow-2xl backdrop-blur-xl">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[0.68rem] font-black uppercase tracking-wide transition ${
              active ? "bg-[#24202e] text-[var(--gold)]" : "text-[#777d8d]"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.8 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
