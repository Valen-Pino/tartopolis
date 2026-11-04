import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { MAX_TART_BYTES, prepareTartImage } from "../src/lib/tart-image.ts";

const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0];
const pick = async (day) => scalar("select * from get_daily_tart($1)", [day]);
const add = async (path) => (await scalar("insert into tart_images(storage_path,uploaded_by) values ($1,$2) returning id", [path, owner])).id;

try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table participants (id uuid primary key);`);
  await db.query("insert into participants values ($1)", [owner]);
  await db.exec(await readFile(new URL("../supabase/migrations/003_daily_tart.sql", import.meta.url), "utf8"));
  assert.equal((await scalar("select public from storage.buckets")).public, false);
  assert.equal(await pick("2026-11-01"), undefined, "un día vacío no queda fijado");
  const first = await add("one.webp");
  assert.equal((await pick("2026-11-01")).image_id, first);
  await Promise.all(Array.from({ length: 8 }, () => pick("2026-11-01")));
  assert.equal((await scalar("select times_selected::integer as n from tart_images where id=$1", [first])).n, 1);
  const second = await add("two.webp");
  const third = await add("three.webp");
  assert.equal((await pick("2026-11-01")).image_id, first, "una subida no cambia la elección guardada");
  const day2 = (await pick("2026-11-02")).image_id;
  const day3 = (await pick("2026-11-03")).image_id;
  assert.deepEqual(new Set([day2, day3]), new Set([second, third]), "todos salen antes de repetir");
  const day4 = (await pick("2026-11-04")).image_id;
  assert.notEqual(day4, day3, "no repite la de ayer al empezar otra ronda");
  const newcomer = await add("new.webp");
  assert.equal((await pick("2026-11-05")).image_id, newcomer, "la nueva tiene prioridad con contador cero");
  assert.notEqual((await pick("2026-11-06")).image_id, newcomer, "evita ayer incluso con contadores desparejos");
  const automatic = await scalar("select day = (now() at time zone 'America/Argentina/Buenos_Aires')::date as correct from get_daily_tart()");
  assert.equal(automatic.correct, true);

  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(pick("2026-11-07"), /permission denied/);
    await assert.rejects(db.query("select * from tart_images"), /permission denied/);
    await assert.rejects(db.query("select * from daily_tarts"), /permission denied/);
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  assert.ok((await pick("2026-11-07")).image_id);
  await db.exec("reset role");
  await db.exec("truncate daily_tarts, tart_images");
  const only = await add("only.webp");
  assert.equal((await pick("2026-12-01")).image_id, only);
  assert.equal((await pick("2026-12-02")).image_id, only, "una sola imagen sigue disponible al día siguiente");

  const png = await sharp({ create: { width: 20, height: 30, channels: 3, background: "red" } }).png().toBuffer();
  const normalized = await prepareTartImage(png);
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 20);
  await assert.rejects(prepareTartImage(Buffer.from("esto no es una imagen")));
  await assert.rejects(prepareTartImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
  await assert.rejects(prepareTartImage(Buffer.alloc(MAX_TART_BYTES + 1)));
  await assert.rejects(prepareTartImage(png.subarray(0, 30)));
  console.log("OK: rotación diaria, elección única, prioridad de nuevas, no repetir ayer, fecha argentina, permisos e imágenes reales.");
} finally {
  await db.close();
}
