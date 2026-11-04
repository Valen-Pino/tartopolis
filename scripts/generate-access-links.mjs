import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const resetting = args[0] === "--reset";
const slug = resetting ? args[1] : args[0];
if ((resetting && !slug) || args.length > (resetting ? 2 : 1) || (slug && slug.startsWith("--"))) {
  console.error("Uso: pnpm access-links [slug] | pnpm access-links --reset <slug>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!url || !key || !appUrl) throw new Error("Faltan las variables de Supabase o NEXT_PUBLIC_APP_URL en .env.local");
const baseUrl = new URL(appUrl);
if (!["https:", "http:"].includes(baseUrl.protocol)) throw new Error("NEXT_PUBLIC_APP_URL inválida");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let query = supabase.from("participants").select("id, full_name, nickname, slug").eq("is_active", true).order("full_name");
if (slug) query = query.eq("slug", slug);
const { data: participants, error } = await query;
if (error) throw error;
if (!participants?.length) throw new Error("No se encontró ningún participante activo con ese slug");
const { data: credentials, error: credentialsError } = await supabase.from("participant_credentials").select("participant_id");
if (credentialsError) throw new Error("Primero aplicá supabase/migrations/002_password_accounts.sql", { cause: credentialsError });
const registered = new Set(credentials.map((item) => item.participant_id));
const selected = participants.filter((participant) => resetting ? registered.has(participant.id) : !registered.has(participant.id));
if (!selected.length) throw new Error(resetting ? "Todavía no tiene cuenta; generá una invitación de registro" : "Ya tienen cuenta. Para restablecer una contraseña usá --reset <slug>");
const filename = `invitation-links-${Date.now()}.txt`;
let output = "Invitaciones personales de Tartópolis. No compartir públicamente. Vencen en 7 días.\n\n";
// El archivo privado permite recuperar lo emitido incluso si falla una operación posterior.
await writeFile(filename, output, { flag: "wx", mode: 0o600 });
for (const participant of selected) {
  const token = randomBytes(32).toString("base64url");
  const { error: issueError } = await supabase.rpc("issue_account_invitation", {
    p_participant_id: participant.id,
    p_token_hash: createHash("sha256").update(token).digest("hex"),
    p_purpose: resetting ? "reset" : "register",
  });
  if (issueError) throw issueError;
  output += `${participant.full_name} / ${participant.nickname} (${participant.slug})\n${new URL(`/invitacion/${token}`, baseUrl).href}\n\n`;
  await writeFile(filename, output, { mode: 0o600 });
}
console.log(`Se guardaron ${selected.length} enlaces en ${filename}. Enviá cada enlace en privado por WhatsApp.`);
console.log("Los enlaces anteriores de esas personas quedaron revocados. Los enlaces se consumen al guardar la contraseña.");
if (resetting) console.log("Las sesiones anteriores quedaron invalidadas. La contraseña anterior también quedó deshabilitada.");
