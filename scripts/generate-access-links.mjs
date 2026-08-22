import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!url || !key || !appUrl) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_APP_URL en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: participants, error } = await supabase
  .from("participants")
  .select("id, full_name, nickname")
  .eq("is_active", true)
  .order("full_name");

if (error) throw error;

const generated = participants.map((participant) => {
  const token = randomBytes(32).toString("base64url");
  return {
    participant,
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  };
});

for (const item of generated) {
  const { error: revokeError } = await supabase
    .from("access_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("participant_id", item.participant.id)
    .is("revoked_at", null);
  if (revokeError) throw revokeError;

  const { error: insertError } = await supabase.from("access_links").insert({
    participant_id: item.participant.id,
    token_hash: item.tokenHash,
  });
  if (insertError) throw insertError;
}

console.log("\nEnlaces personales de Tartópolis\n");
for (const item of generated) {
  console.log(`${item.participant.full_name} / ${item.participant.nickname}\n${appUrl.replace(/\/$/, "")}/entrar/${item.token}\n`);
}
console.log("Guardalos en un lugar privado: al volver a ejecutar este comando, los enlaces anteriores quedan revocados.");
