"use client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabaseClient";
import { insertWithUser } from "@/lib/withUserInsert";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  const signOut = async () => { await supabase.auth.signOut(); location.href = "/"; };
  return (
    <RequireAuth>
      <div className="flex justify-end">
        <button className="btn p-2" title="Sign out" onClick={signOut}>
          <LogOut size={18} />
        </button>
      </div>
    </RequireAuth>
  );
}
