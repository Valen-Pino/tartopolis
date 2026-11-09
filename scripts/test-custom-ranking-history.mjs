import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { withRankPositions } from '../src/lib/ranking.ts';
import { catalogPointsLabel } from '../src/lib/achievement-scoring.ts';

assert.deepEqual(withRankPositions([80,75,75,70].map(ovr=>({ovr}))).map(p=>p.position),[1,2,2,4]);
assert.deepEqual(withRankPositions([75,75,70,70,65].map(ovr=>({ovr}))).map(p=>p.position),[1,1,3,3,5]);
assert.deepEqual(withRankPositions([]),[]);
assert.equal(catalogPointsLabel({slug:'custom-positiva',polarity:'positive',fixed_points:null}),'+');
assert.equal(catalogPointsLabel({slug:'custom-negativa',polarity:'negative',fixed_points:null}),'-');
assert.equal(catalogPointsLabel({slug:'atraer-after',polarity:'positive',fixed_points:0}),'+');
const db=new PGlite();
const dir=new URL('../supabase/migrations/',import.meta.url);
const files=await readdir(dir);
const one=async(q,p=[]) => (await db.query(q,p)).rows[0];
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['001_initial_schema.sql','007_delete_achievement_claim.sql','008_fix_limited_achievement_vote.sql',files.find(f=>f.endsWith('_interactive_achievements.sql'))])
   await db.exec((await readFile(new URL(file,dir),'utf8')).replace('create extension if not exists pgcrypto;',''));
 await db.exec(await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
 await db.exec(`insert into participants(full_name,nickname,slug) values('Felipe Rubiales','Negro','negro');
   insert into score_events(participant_id,source_key,description,points,source_kind) select id,'initial-negro','Situación inicial',65,'initial' from participants where slug='negro';
   delete from score_events where source_key like 'late-ticket-%';
   update score_events set points=-3 where source_key='import-01';
   update score_events set points=-2, description='Nombre anterior' where source_key='import-02';
   update score_events set points=2 where source_key in ('import-03','import-11');
   update score_events set points=3 where source_key in ('import-13','import-14');
   insert into score_events(participant_id,source_key,description,points,source_kind)
     select id,'import-05','Nos avivó con Leger',2,'imported' from participants where slug='colorado';
   insert into score_events(participant_id,source_key,description,points,source_kind)
     select id,'import-16','Ayudó con los pasajes',2,'imported' from participants where slug='garza';
   insert into achievements(slug,title,description,kind,polarity,score_mode,minimum_points,maximum_points)
     values('negativo-grave','Accionar negativo grave','','subjective','negative','range',-5,-2);`);
 const people=(await db.query('select id from participants where is_active order by slug')).rows.map(p=>p.id);
 const creator=people[0];
 const target=(await one("select id from participants where slug='tom'")).id;
 const make=async(slug,inputs={})=>one(`insert into achievement_claims(achievement_id,created_by,target_participant_id,details,scoring_inputs)
   select id,$2,$3,'Prueba',$4::jsonb from achievements where slug=$1 returning id,assigned_points`,[slug,creator,target,JSON.stringify(inputs)]);
 const vote=(id,person,approve=true,points=null)=>one('select * from cast_achievement_vote($1,$2,$3,$4)',[id,person,approve,points]);
 const majority=people.slice(0,Math.floor(people.length/2)+1);
 const approve=async(id,points=null)=>{let result;for(const person of majority)result=await vote(id,person,true,points);return result;};
 const legacy=await make('custom-positiva');
 const historical=await make('negativo-grave');
 await approve(historical.id,-3);
 const migration=await readFile(new URL(files.find(f=>f.endsWith('_custom_points_and_history.sql')),dir),'utf8');
 await db.exec(migration);
 assert.equal((await approve(legacy.id,4)).resolved_points,4);
 assert.equal((await one("select title from achievements where slug='negativo-grave'")).title,'Custom Negativa');
 assert.equal((await one('select description from score_events where achievement_claim_id=$1',[historical.id])).description,'Custom Negativa: Prueba');
 for(const [slug,min,max] of [['custom-positiva',1,10],['custom-negativa',-10,-1]]) {
   for(const points of [min,max]) {
     const claim=await make(slug,{points});assert.equal(claim.assigned_points,points);
     assert.equal((await approve(claim.id)).resolved_points,points);
     assert.equal((await one('select points from score_events where achievement_claim_id=$1',[claim.id])).points,points);
   }
   for(const input of [{},{points:0},{points:min-1},{points:max+1},{points:'2'},{points:1.5},{points:null},{points:2,pau:true}])
     await assert.rejects(make(slug,input));
 }
 // New claims must no longer average voters' proposed values.
 const chosen=await make('custom-positiva',{points:7});
 assert.equal((await approve(chosen.id,1)).resolved_points,7);
 // Unrelated dynamic rules remain in force.
 assert.equal((await make('atraer-after',{women:1,men:3})).assigned_points,0);
 assert.equal((await make('detonacion',{pau:true,trio:true})).assigned_points,17);
 for(const [key,points] of [['import-01',-2],['import-02',-1],['import-03',3],['import-11',1],['import-13',2],['import-14',2],['import-15',3],['import-17',2],['import-18',1],['import-19',2],['late-ticket-juani',-2],['late-ticket-negro',-2]])
   assert.equal((await one('select points from score_events where source_key=$1',[key])).points,points);
 assert.equal((await one("select description from score_events where source_key='import-02'")).description,'Fue wachin para sacar casas');
 for(const [slug,ovr] of [['juani',63],['negro',63],['baulo',63],['empanada',64],['nator',68],['colorado',65],['dero',69],['fornari',70],['garza',70]])
   assert.equal((await one('select sum(s.points)::int ovr from score_events s join participants p on p.id=s.participant_id where p.slug=$1',[slug])).ovr,ovr);

 assert.equal((await one("select count(*)::int n from score_events where source_key in ('import-05','import-16')")).n,0);
 // Corrections can be rerun without creating duplicate historical penalties.
 await db.exec(migration);
 assert.equal((await one("select count(*)::int n from score_events where source_key like 'late-ticket-%'")).n,2);
 console.log('Custom al abrir, puntaje fijo al votar, historia corregida y puestos compartidos verificados.');
} finally {await db.close();}
