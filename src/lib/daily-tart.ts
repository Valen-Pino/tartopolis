import { createAdminClient } from "@/lib/supabase/admin";

export const TART_BUCKET = "daily-tarts";

export async function getDailyTart(): Promise<{ image_id: string; day: string } | null> {
  const { data, error } = await createAdminClient().rpc("get_daily_tart");
  if (error) throw error;
  return data?.[0] ?? null;
}
