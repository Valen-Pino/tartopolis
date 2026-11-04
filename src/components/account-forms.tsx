"use client";

import { useActionState } from "react";
import { login, setAccountPassword } from "@/app/actions/account";

function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{message}</p> : null;
}

export function LoginForm({ participants }: { participants: { id: string; nickname: string }[] }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="mt-6 text-left">
      <label htmlFor="participantId" className="text-sm font-bold">Nombre</label>
      <select id="participantId" name="participantId" className="field mt-2" defaultValue="" required autoComplete="username">
        <option value="" disabled>Seleccioná tu nombre</option>
        {participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.nickname}</option>)}
      </select>
      <label htmlFor="password" className="mt-4 block text-sm font-bold">Contraseña</label>
      <input id="password" name="password" type="password" autoComplete="current-password" className="field mt-2" required minLength={10} maxLength={128} />
      <FormError message={state.error} />
      <button type="submit" className="primary-button mt-5 w-full disabled:opacity-50" disabled={pending}>{pending ? "Ingresando…" : "Iniciar sesión"}</button>
    </form>
  );
}

export function SetPasswordForm({ token, reset }: { token: string; reset: boolean }) {
  const [state, action, pending] = useActionState(setAccountPassword.bind(null, token), { error: "" });
  return (
    <form action={action} className="mt-6">
      <label htmlFor="password" className="text-sm font-bold">{reset ? "Nueva contraseña" : "Tu contraseña"}</label>
      <input id="password" name="password" type="password" autoComplete="new-password" className="field mt-2" required minLength={10} maxLength={128} />
      <label htmlFor="confirmation" className="mt-4 block text-sm font-bold">Repetí la contraseña</label>
      <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" className="field mt-2" required minLength={10} maxLength={128} />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className="primary-button mt-5 w-full disabled:opacity-50">{pending ? "Guardando…" : reset ? "Guardar contraseña y entrar" : "Crear cuenta y entrar"}</button>
    </form>
  );
}
