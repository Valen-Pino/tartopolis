"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getInvitation, invitationHash } from "@/lib/invitations";

export type AccountState = { error: string };
const participantIdSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const passwordSchema = z.string().min(10).max(128);

export async function login(_state: AccountState, formData: FormData): Promise<AccountState> {
  const id = participantIdSchema.safeParse(formData.get("participantId"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!id.success || !password.success) return { error: "Seleccioná tu apodo e ingresá tu contraseña (de 10 a 128 caracteres)." };
  const supabase = createAdminClient();
  const { data: allowed, error: limitError } = await supabase.rpc("allow_login_attempt", { p_participant_id: id.data });
  if (limitError) return { error: "No pudimos iniciar sesión. Intentá nuevamente más tarde." };
  if (!allowed) return { error: "No se pudo ingresar. Si hiciste varios intentos, esperá 15 minutos." };
  const { data: credentials, error } = await supabase.from("participant_credentials")
    .select("password_hash, session_version").eq("participant_id", id.data).single();
  if (error || !credentials || !(await verifyPassword(password.data, credentials.password_hash))) {
    return { error: "El participante o la contraseña no son correctos. Si todavía no tenés cuenta, abrí tu invitación personal." };
  }
  await createSession(id.data, credentials.session_version);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function setAccountPassword(token: string, _state: AccountState, formData: FormData): Promise<AccountState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: "Usá una contraseña de entre 10 y 128 caracteres." };
  if (password.data !== formData.get("confirmation")) return { error: "Las contraseñas no coinciden." };
  const invitation = await getInvitation(token);
  if (!invitation) return { error: "Esta invitación venció o ya fue utilizada. Pedile un enlace nuevo a Pino." };
  const passwordHash = await hashPassword(password.data);
  // La base valida y consume el enlace en una sola transacción, incluso ante envíos simultáneos.
  const { data, error } = await createAdminClient().rpc("redeem_account_invitation", {
    p_token_hash: invitationHash(token), p_password_hash: passwordHash,
  });
  const account = data?.[0];
  if (error || !account) return { error: "No se pudo guardar. La invitación pudo haber vencido o ya fue utilizada." };
  await createSession(account.participant_id, account.session_version);
  revalidatePath("/", "layout");
  redirect(invitation.participant.profile_confirmed_at ? "/" : "/bienvenida");
}
