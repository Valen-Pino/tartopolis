import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentParticipant } from "@/lib/auth";
import { TART_BUCKET } from "@/lib/daily-tart";
import { MAX_TART_BYTES, prepareTartImage, TART_IMAGE_TYPES } from "@/lib/tart-image";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // La app usa cookies propias; las subidas solo se aceptan desde su mismo origen.
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 403 });
  }
  const participant = await getCurrentParticipant();
  if (!participant?.profile_confirmed_at) {
    return NextResponse.json({ error: "Volvé a iniciar sesión." }, { status: 401 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_TART_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "La imagen debe pesar hasta 4 MB." }, { status: 413 });
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "No pudimos leer el archivo." }, { status: 400 }); }
  const file = form.get("image");
  if (!(file instanceof File) || !TART_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Elegí una imagen JPG, PNG, WebP, GIF o AVIF." }, { status: 400 });
  }
  if (!file.size || file.size > MAX_TART_BYTES) {
    return NextResponse.json({ error: "La imagen debe pesar hasta 4 MB." }, { status: 413 });
  }

  let image: Buffer;
  try { image = await prepareTartImage(new Uint8Array(await file.arrayBuffer())); }
  catch { return NextResponse.json({ error: "No pudimos abrir esa imagen. Probá con otra." }, { status: 400 }); }

  const admin = createAdminClient();
  const storagePath = `${randomUUID()}.webp`;
  const { error: uploadError } = await admin.storage.from(TART_BUCKET)
    .upload(storagePath, image, { contentType: "image/webp", upsert: false });
  if (uploadError) {
    console.error("Tart upload failed", uploadError.message);
    return NextResponse.json({ error: "No pudimos subir la tarta. Volvé a intentarlo." }, { status: 500 });
  }
  const { error } = await admin.from("tart_images").insert({ storage_path: storagePath, uploaded_by: participant.id });
  if (error) {
    const { error: cleanupError } = await admin.storage.from(TART_BUCKET).remove([storagePath]);
    console.error("Tart registration failed", error.message, cleanupError?.message);
    return NextResponse.json({ error: "No pudimos guardar la tarta. Volvé a intentarlo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
