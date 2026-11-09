import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { calculatePoints, optionsFor } from "../src/lib/achievement-scoring.ts";

const db = new PGlite();
const sql = async (query, params = []) => (await db.query(query, params)).rows;
const one = async (query, params = []) => (await sql(query, params))[0];
const migrationDir = new URL("../supabase/migrations/", import.meta.url);
const migration = (await readdir(migrationDir)).find((name) => name.endsWith("_interactive_achievements.sql"));
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec((await readFile(new URL("001_initial_schema.sql", migrationDir), "utf8")).replace("create extension if not exists pgcrypto;", ""));
  await db.exec(await readFile(new URL("007_delete_achievement_claim.sql", migrationDir), "utf8"));
  await db.exec(await readFile(new URL("008_fix_limited_achievement_vote.sql", migrationDir), "utf8"));
  // Simulate an existing catalog and pending claims from before the rule change.
  await db.exec(`insert into participants(full_name,nickname,slug) values ('A','A','a'),('B','B','b'),('C','C','c');
    insert into achievements(slug,title,description,kind,polarity,score_mode,fixed_points,sort_order) values
    ('tartear','Tartear','Old subtitle','objective','positive','fixed',2,10),
    ('detonacion','Detonación','','objective','positive','fixed',5,20),
    ('felattio','Felattio','','objective','positive','fixed',3,30),
    ('atraer-after','Atraer gente al after','','objective','positive','fixed',1,40),
    ('aporte-casa','Aportar a la casa','','objective','positive','fixed',1,50),
    ('masturbarse-casa','Masturbarse en la casa','','objective','negative','fixed',-10,60),
    ('dormir-after','Dormirse o viciar','','objective','negative','fixed',-2,70),
    ('no-salir','No salir','','objective','negative','fixed',-5,80),
    ('tirar-mala','Tirar la mala','','objective','negative','fixed',-1,90),
    ('gestionar-contratacion','Gestionar una contratación','','objective','positive','fixed',1,100);
    insert into achievements(slug,title,description,kind,polarity,score_mode,minimum_points,maximum_points) values
    ('positivo-leve','Anterior','','subjective','positive','range',0,2),
    ('positivo-remarcable','Anterior','','subjective','positive','range',2,5),
    ('boludez','Anterior','','subjective','negative','range',-2,0),
    ('negativo-grave','Anterior','','subjective','negative','range',-5,-2);`);
  const participants = await sql("select id from participants order by slug");
  const [creator, target, voter] = participants.map((p) => p.id);
  const create = async (slug, inputs = {}, extra = null) => (await one(`insert into achievement_claims(achievement_id,created_by,target_participant_id,details,scoring_inputs,assigned_points)
    select id,$2,$3,'Situación de prueba',$4::jsonb,$5 from achievements where slug=$1 returning id,assigned_points`, [slug, creator, target, JSON.stringify(inputs), extra]));
  const old = await one(`insert into achievement_claims(achievement_id,created_by,target_participant_id,details)
    select id,$1,$2,'Anterior' from achievements where slug='masturbarse-casa' returning id`, [creator, target]);
  const oldCustom = await one(`insert into achievement_claims(achievement_id,created_by,target_participant_id,details)
    select id,$1,$2,'Anterior' from achievements where slug='positivo-leve' returning id`, [creator, target]);
  await db.exec(await readFile(new URL(migration, migrationDir), "utf8"));
  const vote = (id, who, approve = true, points = null) => sql("select * from cast_achievement_vote($1,$2,$3,$4)", [id, who, approve, points]);
  const approve = async (id, points = null) => { await vote(id, creator, true, points); return (await vote(id, voter, true, points))[0]; };
  assert.equal((await approve(old.id)).resolved_points, -10);
  assert.equal((await approve(oldCustom.id, 0)).resolved_points, 0);
  await assert.rejects(create('positivo-leve'), /ya no está disponible/);
  await assert.rejects(create('gestionar-contratacion'), /ya no está disponible/);

  for (const [slug, base] of [['tartear', 2], ['detonacion', 5], ['felattio', 3]]) {
    const options = optionsFor(slug);
    // Exercise every allowed combination, from base only to all extras.
    for (let bits = 0; bits < 2 ** options.length; bits++) {
      const inputs = Object.fromEntries(options.map((option, index) => [option.key, Boolean(bits & (1 << index))]));
      const expected = base + options.reduce((sum, option) => sum + (inputs[option.key] ? option.points : 0), 0);
      const claim = await create(slug, inputs, 9999);
      assert.equal(claim.assigned_points, expected);
      assert.equal(calculatePoints(slug, inputs, base), expected);
      assert.equal((await approve(claim.id)).resolved_points, expected);
      assert.equal((await one('select points from score_events where achievement_claim_id=$1', [claim.id])).points, expected);
    }
  }
  for (const [women, men, expected] of [[0,0,0],[3,1,2],[1,8,0],[5,5,0],[8,0,8]]) {
    const claim = await create('atraer-after', { women, men });
    assert.equal(claim.assigned_points, expected);
    assert.equal(calculatePoints('atraer-after', {women,men}, 0), expected);
    assert.equal((await approve(claim.id)).resolved_points, expected);
  }
  for (const [slug, inputs] of [
    ['tartear',{visiting:true}], ['tartear',{trio:true}], ['felattio',{trio:true}],
    ['detonacion',{pau:'true'}], ['detonacion',{pau:10}], ['detonacion',{unknown:true}],
    ['atraer-after',{}], ['atraer-after',{women:-1,men:0}], ['atraer-after',{women:1.5,men:0}],
    ['atraer-after',{women:'2',men:0}], ['atraer-after',{women:1000001,men:0}],
    ['atraer-after',{women:1,men:0,pau:true}], ['aporte-casa',{pau:true}],
  ]) await assert.rejects(create(slug, inputs));

  for (const [slug, expected] of [['generar-anecdota',2],['estar-careta',-1],['masturbarse-casa',-5]]) {
    const claim = await create(slug);
    assert.equal((await approve(claim.id)).resolved_points, expected);
  }
  for (const [slug, min, max] of [['custom-positiva',1,10],['custom-negativa',-10,-1]]) {
    const claim = await create(slug);
    assert.equal(claim.assigned_points, null);
    for (const invalid of [null,0,min-1,max+1]) await assert.rejects(vote(claim.id, creator, true, invalid), /fuera del rango/);
    await vote(claim.id, creator, true, min);
    const result = (await vote(claim.id, voter, true, max))[0];
    assert.equal(result.resolved_points, min > 0 ? 6 : -6);
  }
  const rejected = await create('detonacion',{pau:true});
  await vote(rejected.id,creator,false);
  assert.equal((await vote(rejected.id,voter,false))[0].status,'rejected');
  assert.equal((await one('select count(*)::int as n from score_events where achievement_claim_id=$1',[rejected.id])).n,0);
  const catalog = await sql('select slug,description from achievements where is_active order by sort_order');
  assert.deepEqual(catalog.map((a) => a.slug), ['detonacion','felattio','tartear','generar-anecdota','aporte-casa','atraer-after','custom-positiva','tirar-mala','estar-careta','dormir-after','no-salir','masturbarse-casa','custom-negativa']);
  assert.ok(catalog.every((a) => a.description === ''));
  await db.exec('set role anon');
  await assert.rejects(db.query('select prepare_achievement_claim()'), /permission denied/);
  await db.exec('reset role');
  console.log('Hazañas interactivas: combinaciones, límites, historial, votos, OVR, Custom y orden verificados.');
} finally { await db.close(); }
