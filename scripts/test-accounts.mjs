import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

const db = new PGlite();
const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const issue = (hash, purpose = "register", participantId = id) => db.query("select issue_account_invitation($1, $2, $3)", [participantId, hash, purpose]);
const redeem = (hash, passwordHash) => db.query("select * from redeem_account_invitation($1, $2)", [hash, passwordHash]);

try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  // PGlite ya incluye gen_random_uuid; no necesita cargar pgcrypto.
  const initial = (await readFile(new URL("../supabase/migrations/001_initial_schema.sql", import.meta.url), "utf8"))
    .replace("create extension if not exists pgcrypto;", "");
  await db.exec(initial);
  await db.query("insert into participants(id,full_name,nickname,slug) values ($1,'Prueba Uno','Uno','uno'),($2,'Prueba Dos','Dos','dos')", [id, otherId]);
  await db.query("insert into access_links(participant_id,token_hash) values ($1,'legacy')", [id]);
  await db.exec(await readFile(new URL("../supabase/migrations/002_password_accounts.sql", import.meta.url), "utf8"));
  assert.ok((await scalar("select revoked_at from access_links where token_hash='legacy'")).revoked_at);

  const passwordHash = await hashPassword("contraseña de prueba 🔑");
  assert.equal(await verifyPassword("contraseña de prueba 🔑", passwordHash), true);
  assert.equal(await verifyPassword("otra contraseña", passwordHash), false);
  assert.equal(await verifyPassword("contraseña de prueba 🔑", "broken"), false);
  assert.notEqual(await hashPassword("contraseña de prueba 🔑"), passwordHash);

  await issue("first");
  await issue("second");
  assert.equal((await redeem("first", passwordHash)).rows.length, 0, "la emisión revoca la invitación anterior");
  assert.equal((await redeem("legacy", passwordHash)).rows.length, 0);
  assert.equal((await redeem("unknown", passwordHash)).rows.length, 0);
  const results = await Promise.all([redeem("second", passwordHash), redeem("second", passwordHash)]);
  assert.equal(results.reduce((sum, result) => sum + result.rows.length, 0), 1, "un solo consumo exitoso");
  const original = await scalar("select * from participant_credentials where participant_id=$1", [id]);
  await assert.rejects(issue("duplicate"), /ya tiene cuenta/);
  await assert.rejects(issue("invalid-purpose", "legacy"), /Propósito/);

  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await scalar("select allow_login_attempt($1) as allowed", [id])).allowed, true);
  }
  assert.equal((await scalar("select allow_login_attempt($1) as allowed", [id])).allowed, false);
  await db.query("update login_attempts set window_started_at=now()-interval '16 minutes' where participant_id=$1", [id]);
  assert.equal((await scalar("select allow_login_attempt($1) as allowed", [id])).allowed, true);

  await issue("reset", "reset");
  const resetPending = await scalar("select * from participant_credentials where participant_id=$1", [id]);
  assert.notEqual(resetPending.session_version, original.session_version, "invalida las sesiones al emitir reset");
  assert.equal(await verifyPassword("contraseña de prueba 🔑", resetPending.password_hash), false);
  const newHash = await hashPassword("mi contraseña nueva");
  assert.equal((await redeem("reset", newHash)).rows.length, 1);
  const reset = await scalar("select * from participant_credentials where participant_id=$1", [id]);
  assert.equal(await verifyPassword("mi contraseña nueva", reset.password_hash), true);
  assert.equal(await verifyPassword("contraseña de prueba 🔑", reset.password_hash), false);
  assert.notEqual(reset.session_version, resetPending.session_version);
  assert.equal((await redeem("reset", passwordHash)).rows.length, 0);

  await issue("expired", "register", otherId);
  await db.exec("update access_links set expires_at=now()-interval '1 second' where token_hash='expired'");
  assert.equal((await redeem("expired", passwordHash)).rows.length, 0);
  await issue("inactive", "register", otherId);
  await db.query("update participants set is_active=false where id=$1", [otherId]);
  assert.equal((await redeem("inactive", passwordHash)).rows.length, 0);
  assert.equal((await scalar("select allow_login_attempt($1) as allowed", [otherId])).allowed, false);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select * from participant_credentials"), /permission denied/);
    await assert.rejects(db.query("select * from login_attempts"), /permission denied/);
    await assert.rejects(issue("forbidden"), /permission denied/);
    await assert.rejects(redeem("reset", passwordHash), /permission denied/);
    await db.exec("reset role");
  }
  console.log("OK: contraseñas, migración, invitaciones, consumo único, vencimiento, reset, sesiones, límites y permisos.");
} finally {
  await db.close();
}
