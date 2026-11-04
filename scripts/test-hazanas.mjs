import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { canDeleteClaim, CLAIM_MODERATOR_ID } from "../src/lib/claim-permissions.ts";

const db = new PGlite();
const owner = "10000000-0000-0000-0000-000000000002";
const other = "10000000-0000-0000-0000-000000000003";
const scalar = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const remove = (claimId, actorId) => db.query("select delete_achievement_claim($1, $2)", [claimId, actorId]);

try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec((await readFile(new URL("../supabase/migrations/001_initial_schema.sql", import.meta.url), "utf8")).replace("create extension if not exists pgcrypto;", ""));
  await db.exec(await readFile(new URL("../supabase/migrations/007_delete_achievement_claim.sql", import.meta.url), "utf8"));
  for (const [id, name] of [[CLAIM_MODERATOR_ID, "Pino"], [owner, "Creador"], [other, "Otro"]]) {
    await db.query("insert into participants(id, full_name, nickname, slug) values ($1,$2,$2,$2)", [id, name]);
  }
  const achievement = await scalar("insert into achievements(slug,title,description,kind,polarity,score_mode,minimum_points,maximum_points) values ('test','Test','Test','subjective','negative','range',-5,-2) returning id");
  const create = async () => (await scalar("insert into achievement_claims(achievement_id,created_by,target_participant_id,details) values ($1,$2,$3,'Prueba') returning id", [achievement.id, owner, other])).id;
  const vote = (id, voter, approve, points = null) => db.query("select * from cast_achievement_vote($1,$2,$3,$4)", [id, voter, approve, points]);
  let claimId = await create();
  assert.equal(canDeleteClaim(owner, owner), true);
  assert.equal(canDeleteClaim(CLAIM_MODERATOR_ID, owner), true);
  assert.equal(canDeleteClaim(other, owner), false);
  await assert.rejects(vote(claimId, owner, true), /fuera del rango/);
  await assert.rejects(vote(claimId, owner, true, -6), /fuera del rango/);
  await vote(claimId, owner, true, -5);
  await assert.rejects(remove(claimId, other), /No podés/);
  assert.equal((await scalar("select count(*)::int as n from achievement_votes")).n, 1);
  await remove(claimId, owner);
  assert.equal((await scalar("select count(*)::int as n from achievement_votes")).n, 0);

  claimId = await create();
  await vote(claimId, owner, true, -5);
  await vote(claimId, other, true, -3);
  assert.equal((await scalar("select resolved_points from achievement_claims where id=$1", [claimId])).resolved_points, -4);
  assert.equal((await scalar("select ovr from participant_ranking where id=$1", [other])).ovr, -4);
  // Deleting an approved claim also reverses its score event.
  await remove(claimId, CLAIM_MODERATOR_ID);
  assert.equal((await scalar("select ovr from participant_ranking where id=$1", [other])).ovr, 0);
  assert.equal((await scalar("select count(*)::int as n from score_events")).n, 0);

  claimId = await create();
  await db.query("update participants set is_active=false where id=$1", [owner]);
  await assert.rejects(remove(claimId, owner), /no está habilitado/);
  await db.exec("set role anon");
  await assert.rejects(remove(claimId, CLAIM_MODERATOR_ID), /permission denied/);
  await db.exec("reset role; set role authenticated");
  await assert.rejects(remove(claimId, CLAIM_MODERATOR_ID), /permission denied/);
  await db.exec("reset role");
  await db.exec(await readFile(new URL("../supabase/migrations/008_subjective_one_point.sql", import.meta.url), "utf8"));
  // La votación abierta antes de la migración ya admite -1.
  await vote(claimId, other, true, -1);
  assert.equal((await scalar("select proposed_points from achievement_votes where claim_id=$1", [claimId])).proposed_points, -1);
  const positive = await scalar("insert into achievements(slug,title,description,kind,polarity,score_mode,minimum_points,maximum_points) values ('positive','Test','Test','subjective','positive','range',2,5) returning id");
  await db.exec(await readFile(new URL("../supabase/migrations/008_subjective_one_point.sql", import.meta.url), "utf8"));
  const positiveClaim = await scalar("insert into achievement_claims(achievement_id,created_by,target_participant_id,details) values ($1,$2,$3,'Prueba positiva') returning id", [positive.id, CLAIM_MODERATOR_ID, other]);
  await vote(positiveClaim.id, other, true, 1);
  assert.equal((await scalar("select proposed_points from achievement_votes where claim_id=$1", [positiveClaim.id])).proposed_points, 1);
  await assert.rejects(vote(positiveClaim.id, CLAIM_MODERATOR_ID, true, -1), /fuera del rango/);
  await assert.rejects(vote(claimId, CLAIM_MODERATOR_ID, true, 1), /fuera del rango/);
  console.log("Hazañas: permisos, eliminación, reversión de OVR, promedio y opciones +1/-1 verificados.");
} finally {
  await db.close();
}
