"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LogOut } from "lucide-react";

export default function HeaderRight() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setEmail(session?.user?.email ?? null); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  const signOut = async () => { await supabase.auth.signOut(); location.href = "/"; };
  return (
    <div className="flex items-center gap-3">
      {email && <span className="px-3 py-1 rounded-full bg-white/10 text-sm">{email}</span>}
      {email && <button className="btn p-2" title="Sign out" onClick={signOut}><LogOut size={18} /></button>}
    </div>
  );
}
