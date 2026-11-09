"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createClaim } from "@/app/actions/hazanas";
import { calculatePoints, formatPoints, isCustom, optionsFor, pointOptions, type ScoringInputs } from "@/lib/achievement-scoring";
import type { Achievement, Participant } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="primary-button w-full" type="submit" disabled={pending}>{pending ? "Abriendo votación…" : "Abrir votación"}</button>;
}

export function ClaimForm({ achievement, participants }: { achievement: Achievement; participants: Participant[] }) {
  const [inputs, setInputs] = useState<ScoringInputs>({ women: 0, men: 0 });
  const options = optionsFor(achievement.slug);
  const custom = isCustom(achievement.slug);
  const after = achievement.slug === "atraer-after";
  const points = calculatePoints(achievement.slug, inputs, achievement.fixed_points ?? 0);
  return <form action={createClaim} className="mt-7 space-y-5">
    <input type="hidden" name="achievementId" value={achievement.id} />
    <div>
      <label htmlFor="targetId" className="text-xs font-black uppercase tracking-wider text-[#b9bdc8]">¿A quién se la asignás?</label>
      <select className="field mt-2" id="targetId" name="targetId" required defaultValue="">
        <option value="" disabled>Elegí un participante</option>
        {participants.map((item) => <option key={item.id} value={item.id}>{item.nickname}</option>)}
      </select>
    </div>
    {custom && <div>
      <label htmlFor="customPoints" className="text-xs font-black uppercase tracking-wider text-[#b9bdc8]">Puntaje</label>
      <select className="field mt-2" id="customPoints" name="customPoints" required defaultValue="">
        <option value="" disabled>Elegí cuántos puntos</option>
        {pointOptions(achievement).map((value) => <option key={value} value={value}>{formatPoints(value)} OVR</option>)}
      </select>
    </div>}
    {after && <div className="grid grid-cols-2 gap-3">
      {([{ key: "women", label: "Minas" }, { key: "men", label: "Pibes" }] as const).map(({ key, label }) => <div key={key}>
        <label htmlFor={key} className="text-sm font-bold">{label}</label>
        <input className="field mt-2" id={key} name={key} type="number" inputMode="numeric" min={0} max={1000000} step={1} required defaultValue={0}
          onChange={(event) => setInputs((previous) => ({ ...previous, [key]: Number(event.target.value) }))} />
      </div>)}
    </div>}
    {options.length > 0 && <fieldset className="space-y-2">
      <legend className="mb-3 text-xs font-black uppercase tracking-wider text-[#b9bdc8]">Puntos adicionales</legend>
      {options.map(({ key, label, points: extra }) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] p-3 text-sm font-bold">
        <input name={key} type="checkbox" className="h-5 w-5 accent-[var(--green)]" onChange={(event) => setInputs((previous) => ({ ...previous, [key]: event.target.checked }))} />
        <span className="flex-1">{label}</span><span className="text-[var(--green)]">+{extra}</span>
      </label>)}
    </fieldset>}
    {(after || options.length > 0) && <div className="flex items-center justify-between rounded-xl bg-[#10261b] p-4 text-[var(--green)]" aria-live="polite" aria-atomic="true">
      <span className="text-sm font-bold">Puntaje</span><output className="text-2xl font-black tabular-nums">{formatPoints(points)} OVR</output>
    </div>}
    <div>
      <label htmlFor="details" className="text-xs font-black uppercase tracking-wider text-[#b9bdc8]">¿Qué pasó?</label>
      <textarea className="field mt-2 min-h-28 resize-y" id="details" name="details" placeholder="Contá brevemente la situación…" required minLength={3} maxLength={240} />
    </div>
    <SubmitButton />
  </form>;
}
