"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) router.replace("/auth"); else setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (!session) router.replace("/auth"); else setReady(true); });
    return () => { sub.subscription.unsubscribe(); };
  }, [router]);
  if (!ready) return <div className="min-h-[40vh] grid place-items-center"><Loader /></div>;
  return <>{children}</>;
}
