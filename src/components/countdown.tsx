"use client";

import { useEffect, useState } from "react";

const TARGET_DATE = process.env.NEXT_PUBLIC_TRIP_DATE ?? "2027-01-22T16:00:00-03:00";

function getRemaining() {
  const distance = Math.max(0, new Date(TARGET_DATE).getTime() - Date.now());
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: Math.floor((distance / 1_000) % 60),
  };
}

export function Countdown() {
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        [remaining.days, "días"],
        [remaining.hours, "horas"],
        [remaining.minutes, "min"],
        [remaining.seconds, "seg"],
      ].map(([value, label]) => (
        <div key={label} className="rounded-xl border border-[#35303f] bg-black/25 px-1 py-3 text-center">
          <div className="text-2xl font-black tabular-nums tracking-[-0.06em]">{String(value).padStart(2, "0")}</div>
          <div className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#9691a0]">{label}</div>
        </div>
      ))}
    </div>
  );
}
