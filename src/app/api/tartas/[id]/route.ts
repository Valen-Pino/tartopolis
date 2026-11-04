import { getCurrentParticipant } from "@/lib/auth";
import { TART_BUCKET } from "@/lib/daily-tart";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const participant = await getCurrentParticipant();
  if (!participant?.profile_confirmed_at) return new Response(null, { status: 401, headers });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404, headers });
  const admin = createAdminClient();
  const { data, error } = await admin.from("tart_images").select("storage_path").eq("id", id).single();
  if (error || !data) return new Response(null, { status: 404, headers });
  const { data: image, error: storageError } = await admin.storage.from(TART_BUCKET).download(data.storage_path);
  if (storageError || !image) return new Response(null, { status: 502, headers });
  return new Response(image, { headers: { ...headers, "Content-Type": "image/webp" } });
}
