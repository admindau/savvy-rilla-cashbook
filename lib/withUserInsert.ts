import { supabase } from "@/lib/supabaseClient";

export async function insertWithUser(table: string, values: any) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { error: userErr };
  return supabase.from(table).insert({ ...values, user_id: user?.id });
}
