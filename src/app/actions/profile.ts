"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentParticipant } from "@/lib/auth";
import { clearSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const nicknameSchema = z.string().trim().min(2, "El apodo es demasiado corto").max(24, "El apodo es demasiado largo");

export async function updateNickname(formData: FormData) {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/acceso");

  const result = nicknameSchema.safeParse(formData.get("nickname"));
  if (!result.success) redirect("/perfil?error=nickname");

  const { error } = await createAdminClient()
    .from("participants")
    .update({
      nickname: result.data,
      profile_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", participant.id);
  if (error) throw error;

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}
