"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Actualiza también una página que quedó abierta al cambiar el día en Argentina.
export function DailyTartView({ imageId, day }: { imageId: string | null; day: string }) {
  const router = useRouter();
  useEffect(() => {
    const currentDay = () => new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    function checkDay() { if (currentDay() !== day) router.refresh(); }
    const timer = setInterval(checkDay, 15_000);
    window.addEventListener("focus", checkDay);
    return () => { clearInterval(timer); window.removeEventListener("focus", checkDay); };
  }, [day, router]);

  return imageId ? (
    <div className="card overflow-hidden">
      {/* La ruta verifica la sesión en cada pedido; se evita el caché público del optimizador. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={imageId} src={`/api/tartas/${imageId}`} alt="La Tarta del Día" className="mx-auto max-h-[65svh] w-full object-contain" />
    </div>
  ) : (
    <div className="card grid min-h-64 place-items-center p-6">
      <p className="text-lg font-black uppercase tracking-tight">Todavía no hay tartas.</p>
    </div>
  );
}
